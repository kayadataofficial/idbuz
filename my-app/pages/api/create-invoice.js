import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  const { service, link, quantity } = req.body

  if (!service || !link || !quantity) {
    return res.status(400).json({ error: 'Semua field wajib diisi.' })
  }

  const merchant_ref = 'INV-' + Date.now()
  const price = await getServicePrice(service)

  if (!price || isNaN(price)) {
    console.error('[ERROR] Gagal mengambil harga layanan:', service)
    return res.status(400).json({ error: 'Layanan tidak ditemukan atau harga invalid.' })
  }

  const qty = parseInt(quantity)
  const amount = Math.ceil(price * qty)

  if (amount <= 0) {
    return res.status(400).json({ error: 'Jumlah total tidak valid.' })
  }

  const signature = crypto
    .createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY)
    .update(process.env.TRIPAY_MERCHANT_CODE + merchant_ref + amount)
    .digest('hex')

  const invoicePayload = {
    method: 'QRIS', // Bisa diganti ke OVO, BCA, BNI, DLL
    merchant_ref,
    amount,
    customer_name: 'SMM Customer',
    customer_email: 'user@example.com',
    order_items: [
      {
        sku: service,
        name: 'SMM Service',
        price,
        quantity: qty
      }
    ],
    return_url: 'http://localhost:3000/success',
    signature
  }

  console.log('[INVOICE PAYLOAD]', invoicePayload)

  try {
    const tripayRes = await fetch('https://tripay.co.id/api-sandbox/transaction/create'
, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TRIPAY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoicePayload)
    })

    const tripayData = await tripayRes.json()
    console.log('[TRIPAY RESPONSE]', tripayData)

    if (!tripayData.success) {
      return res.status(500).json({ error: 'Gagal membuat invoice Tripay', detail: tripayData })
    }

    const { reference, checkout_url } = tripayData.data

    const { error } = await supabase.from('order').insert({
      service,
      link,
      quantity: qty,
      status: 'pending',
      merchant_ref,
      tripay_ref: reference
    })

    if (error) {
      console.error('[SUPABASE ERROR]', error)
      return res.status(500).json({ error: 'Gagal menyimpan order ke Supabase', detail: error })
    }

    res.status(200).json({ checkout_url })
  } catch (err) {
    console.error('[SERVER ERROR]', err)
    res.status(500).json({ error: 'Server error', detail: err.message })
  }
}

async function getServicePrice(serviceId) {
  try {
    const res = await fetch('https://indosmm.id/api/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: process.env.INDOSMM_API_KEY,
        action: 'services'
      })
    })

    const data = await res.json()
    const selected = data.find(
      (s) => s.service.toString() === serviceId.toString()
    )

    if (!selected) {
      console.error('[ERROR] Layanan tidak ditemukan:', serviceId)
      return 0
    }

    return parseFloat(selected.rate)
  } catch (err) {
    console.error('[FETCH ERROR]', err)
    return 0
  }
}
