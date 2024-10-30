const mongoose = require('mongoose')

const pin = new mongoose.Schema(
  {
    pin: { type: Number, required: true },
    status: { type: String, default:'fresh' },
  }
)
const Pin = mongoose.models.Pin || mongoose.model('Pin', pin)
module.exports = Pin
// module.exports = mongoose.model('AuthCode', authCodeSchema);