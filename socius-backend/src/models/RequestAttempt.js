const mongoose = require('mongoose')

const requestAttemptSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    requestKind: {
      type: String,
      enum: ['help_request', 'presence_request'],
      required: true,
      index: true,
    },
    outcome: {
      type: String,
      required: true,
      index: true,
    },
    reason: { type: String, default: null },

    category: { type: String, default: null },
    situationType: { type: String, default: null },
    description: { type: String, default: null },
    itemReturnRequired: { type: Boolean, default: null },

    location: {
      lng: { type: Number, default: null },
      lat: { type: Number, default: null },
      address: { type: String, default: null },
      whereToFindText: { type: String, default: null },
    },
    radiusMeters: { type: Number, default: null },
    helpersFound: { type: Number, default: null },

    meta: {
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
      platform: { type: String, default: null },
      deviceId: { type: String, default: null },
      appVersion: { type: String, default: null },
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('RequestAttempt', requestAttemptSchema)

