const mongoose = require('mongoose')

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // FCM token
    token: {
      type: String,
      required: true,
      unique: true,
    },

    // Device info
    platform: {
      type: String,
      enum: ['android', 'ios'],
      required: true,
    },
    deviceId: {
      type: String,
      default: null,
    },
    deviceModel: {
      type: String,
      default: null,
    },
    appVersion: {
      type: String,
      default: null,
    },

    // Token status
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    invalidatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

deviceTokenSchema.index({ userId: 1 })
deviceTokenSchema.index({ token: 1 })
deviceTokenSchema.index({ isActive: 1 })

module.exports = mongoose.model('DeviceToken', deviceTokenSchema)
