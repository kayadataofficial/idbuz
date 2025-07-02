import React from 'react'
import { fetchServices } from '../lib/indosmm'

export async function getServerSideProps() {
  const services = await fetchServices()
  return { props: { services: services || [] } }
}

export default function Home({ services }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Layanan IndoSMM</h1>
      {services.length === 0 ? (
        <p className="text-red-500">Tidak ada layanan ditemukan.</p>
      ) : (
        <div className="grid gap-4">
          {services.map((s) => (
            <div key={s.service} className="p-4 border rounded shadow">
              <h2 className="font-semibold">{s.name}</h2>
              <p>Kategori: {s.category}</p>
              <p>Harga: Rp {s.rate}</p>
              <p>Min: {s.min} | Max: {s.max}</p>
              <p>Refill: {s.refill ? '✅' : '❌'}, Cancel: {s.cancel ? '✅' : '❌'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
