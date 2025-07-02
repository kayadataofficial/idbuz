// pages/order.js
import React, { useState, useEffect } from 'react'

export default function OrderPage() {
  const [services, setServices] = useState([])
  const [form, setForm] = useState({
    service: '',
    link: '',
    quantity: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await fetch('/api/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })

    const data = await res.json()
    if (data.checkout_url) {
      window.location.href = data.checkout_url
    } else {
      alert('Gagal membuat invoice')
    }
  }

  useEffect(() => {
    fetch('/api/indosmm-services')
      .then((res) => res.json())
      .then((data) => setServices(data))
  }, [])

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Buat Pesanan</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block">Pilih Layanan</label>
          <select
            name="service"
            value={form.service}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">-- Pilih --</option>
            {services.map((s) => (
              <option key={s.service} value={s.service}>
                {s.name} (Rp {s.rate})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block">Link Akun/Page</label>
          <input
            type="text"
            name="link"
            value={form.link}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block">Jumlah</label>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Buat Invoice & Bayar
        </button>
      </form>
    </div>
  )
}
