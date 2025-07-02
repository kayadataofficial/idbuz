const axios = require('axios')

const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY

const tripay = axios.create({
  baseURL: 'https://tripay.co.id/api-sandbox/',
  headers: {
    Authorization: `Bearer ${TRIPAY_API_KEY}`
  }
})

module.exports = { tripay }
