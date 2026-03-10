const mongoose = require('mongoose')

const otpLogSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['login', 'verify'],
      default: 'login',
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0, // wrong attempts count
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

otpLogSchema.index({ phone: 1 })
otpLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // auto delete after expiry

module.exports = mongoose.model('OtpLog', otpLogSchema)
