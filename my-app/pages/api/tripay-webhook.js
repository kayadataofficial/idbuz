import { supabase } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  const secret = req.headers['x-callback-signature']
  const body = JSON.stringify(req.body)
  const calculatedSignature = require('crypto')
    .createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY)
    .update(body)
    .digest('hex')

  if (secret !== calculatedSignature) {
    console.error('[WEBHOOK] Invalid signature')
    return res.status(403).json({ error: 'Invalid signature' })
  }

  const { status, reference, merchant_ref } = req.body

  console.log('[WEBHOOK RECEIVED]', req.body)

  if (status !== 'PAID') {
    return res.status(200).json({ message: 'Not paid yet. Skipped.' })
  }

  // Update status di Supabase
  const { error } = await supabase
    .from('order')
    .update({ status: 'paid' })
    .eq('merchant_ref', merchant_ref)

  if (error) {
    console.error('[SUPABASE ERROR]', error)
    return res.status(500).json({ error: 'Failed to update order status' })
  }

  // Ambil detail order untuk kirim ke IndoSMM
  const { data: orderData } = await supabase
    .from('order')
    .select('*')
    .eq('merchant_ref', merchant_ref)
    .single()

  const indoPayload = {
    key: process.env.INDOSMM_API_KEY,
    action: 'add',
    service: orderData.service,
    link: orderData.link,
    quantity: orderData.quantity
  }

  try {
    const response = await fetch('https://indosmm.id/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(indoPayload)
    })

    const result = await response.json()
    console.log('[INDOSMM ORDER RESULT]', result)

    // Tambahkan result.id ke kolom order jika diperlukan
    if (result.order) {
      await supabase
        .from('order')
        .update({ indosmm_order_id: result.order })
        .eq('merchant_ref', merchant_ref)
    }

    return res.status(200).json({ message: 'Success' })
  } catch (err) {
    console.error('[INDOSMM ERROR]', err)
    return res.status(500).json({ error: 'Failed to send to IndoSMM' })
  }
}
