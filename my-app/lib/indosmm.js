const axios = require('axios')

const INDOSMM_API_KEY = process.env.INDOSMM_API_KEY

const indosmm = axios.create({
  baseURL: 'https://indosmm.id/api/v2',
  headers: {
    'Content-Type': 'application/json'
  }
})

async function fetchServices() {
  try {
    const res = await indosmm.post('/', {
      key: INDOSMM_API_KEY,
      action: 'services'
    })

    if (Array.isArray(res.data)) {
      return res.data
    } else {
      console.error('Format tidak sesuai:', res.data)
      return []
    }
  } catch (error) {
    console.error('Gagal ambil layanan IndoSMM:', error.response?.data || error.message)
    return []
  }
}

module.exports = { fetchServices }
