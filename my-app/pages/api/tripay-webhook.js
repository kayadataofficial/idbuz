// pages/api/create-invoice.js
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    const { service, quantity, link } = req.body

    const pricePerUnit = 72000
    const amount = quantity * pricePerUnit
    const merchant_ref = `INV-${Date.now()}`
    const tripayApiKey = process.env.TRIPAY_API_KEY
    const privateKey = process.env.TRIPAY_PRIVATE_KEY
    const merchantCode = process.env.TRIPAY_MERCHANT_CODE

    const payload = {
      method: 'QRIS',
      merchant_ref,
      amount,
      customer_name: 'SMM Customer',
      customer_email: 'user@example.com',
      order_items: [
        {
          sku: service.toString(),
          name: 'SMM Service',
          price: pricePerUnit,
          quantity,
        },
      ],
      return_url: 'https://idbuz-kayadatas-projects.vercel.app/success',
      callback_url: 'https://idbuz-kayadatas-projects.vercel.app/api/tripay-webhook',
    }

    const stringToSign = merchantCode + merchant_ref + amount + privateKey
    payload.signature = crypto.createHash('sha256').update(stringToSign).digest('hex')

    console.log('[INVOICE PAYLOAD]', payload)

    const tripayRes = await fetch('https://tripay.co.id/api-sandbox/transaction/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tripayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const tripayData = await tripayRes.json()
    console.log('[TRIPAY RESPONSE]', tripayData)

    if (!tripayData.success) {
      return res.status(500).json({ error: 'Gagal membuat invoice', tripayData })
    }

    // Simpan ke Supabase
    const { error: insertError } = await supabase
      .from('order')
      .insert({
        merchant_ref,
        service,
        link,
        quantity,
        status: 'pending',
      })

    if (insertError) {
      console.error('[SUPABASE ERROR]', insertError)
      return res.status(500).json({ error: 'Gagal menyimpan ke Supabase' })
    }

    return res.status(200).json({
      checkout_url: tripayData.data.checkout_url,
      merchant_ref,
    })
  } catch (err) {
    console.error('[SERVER ERROR]', err)
    return res.status(500).json({ error: 'Terjadi kesalahan server' })
  }
}
