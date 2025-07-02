import { supabase } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    const { status, merchant_ref } = req.body
    console.log('[WEBHOOK TRIPAY]', { status, merchant_ref })

    if (status !== 'PAID') {
      return res.status(200).json({ message: 'Status bukan PAID, dilewati' })
    }

    // Ambil order dari Supabase
    const { data: orderData, error: fetchError } = await supabase
      .from('order')
      .select('*')
      .eq('merchant_ref', merchant_ref)
      .single()

    if (fetchError || !orderData) {
      console.error('[SUPABASE ERROR] Gagal ambil order:', fetchError)
      return res.status(500).json({ error: 'Gagal ambil data order' })
    }

    // Submit ke IndoSMM
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

    if (!indoResult.order) {
      console.error('[INDOSMM ERROR]', indoResult)
      return res.status(500).json({ error: 'Gagal order ke IndoSMM' })
    }

    // Update Supabase
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

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[FATAL ERROR]', error)
    return res.status(500).json({ error: 'Server Error' })
  }
}
