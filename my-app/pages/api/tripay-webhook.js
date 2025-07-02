import { supabase } from '@/lib/supabase'

export const config = {
  api: {
    bodyParser: true
  }
}

export default async function handler(req, res) {
  console.log('[TRIPAY WEBHOOK] Webhook diterima:', req.method)
  console.log('[BODY]', req.body)

  if (req.method !== 'POST') {
    console.warn('[METHOD NOT ALLOWED]', req.method)
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const { status, merchant_ref } = req.body || {}
  console.log('[WEBHOOK PAYLOAD]', { status, merchant_ref })

  if (!status || !merchant_ref) {
    console.error('[ERROR] Payload tidak lengkap')
    return res.status(400).json({ error: 'Payload tidak lengkap' })
  }

  if (status !== 'PAID') {
    console.log('[INFO] Status bukan PAID, webhook dilewati')
    return res.status(200).json({ message: 'Status bukan PAID, dilewati' })
  }

  try {
    const { data: orderData, error: fetchError } = await supabase
      .from('order')
      .select('*')
      .eq('merchant_ref', merchant_ref)
      .single()

    console.log('[SUPABASE SELECT RESULT]', { orderData, fetchError })

    if (fetchError || !orderData || Object.keys(orderData).length === 0) {
      console.error('[SUPABASE ERROR] Gagal ambil order:', fetchError)
      return res.status(500).json({ error: 'Gagal ambil data order' })
    }

    const indoPayload = {
      key: process.env.INDOSMM_API_KEY,
      action: 'add',
      service: orderData.service,
      link: orderData.link,
      quantity: orderData.quantity
    }

    console.log('[INDOSMM PAYLOAD]', indoPayload)

    const indoRes = await fetch('https://indosmm.id/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(indoPayload)
    })

    const indoResult = await indoRes.json()
    console.log('[INDOSMM ORDER RESULT]', indoResult)

    if (!indoResult || !indoResult.order) {
      console.error('[INDOSMM ERROR] Order gagal:', indoResult)
      return res.status(500).json({ error: 'Gagal order ke IndoSMM' })
    }

    const { error: updateError } = await supabase
      .from('order')
      .update({
        status: 'paid',
        indo_order_id: indoResult.order.toString()
      })
      .eq('merchant_ref', merchant_ref)

    if (updateError) {
      console.error('[SUPABASE UPDATE ERROR]', updateError)
      return res.status(500).json({ error: 'Gagal update status order' })
    }

    console.log('[SUCCESS] Status updated & order ke IndoSMM berhasil')
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[FATAL ERROR]', error)
    return res.status(500).json({ error: 'Server Error', detail: error.message })
  }
}
