export default async function handler(req, res) {
    try {
      const response = await fetch('https://indosmm.id/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: process.env.INDOSMM_API_KEY,
          action: 'services'
        })
      })
  
      const data = await response.json()
      console.log('[IndoSMM Services]', data) // tambahkan ini
  
      res.status(200).json(data)
    } catch (err) {
      console.error('Error mengambil layanan IndoSMM:', err)
      res.status(500).json({ error: 'Gagal ambil layanan IndoSMM' })
    }
  }
  