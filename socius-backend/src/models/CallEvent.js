const mongoose = require('mongoose')

const callEventSchema = new mongoose.Schema(
  {
    callKey: { type: String, required: true, index: true },
    callId: { type: mongoose.Schema.Types.ObjectId, ref: 'Call', default: null, index: true },

    eventType: {
      type: String,
      enum: [
        'attempt',
        'offer_sent',
        'offer_received',
        'answer_sent',
        'answer_received',
        'ice_sent',
        'ice_received',
        'connected',
        'ended',
        'missed',
        'rejected',
        'failed',
        'quality',
        'info',
      ],
      required: true,
      index: true,
    },

    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    occurredAt: { type: Date, required: true, index: true },

    device: {
      platform: { type: String, default: null },
      osVersion: { type: String, default: null },
      appVersion: { type: String, default: null },
      deviceModel: { type: String, default: null },
    },
    network: {
      type: { type: String, default: null },
      isMetered: { type: Boolean, default: null },
      signalStrength: { type: Number, default: null },
    },
    location: {
      lng: { type: Number, default: null },
      lat: { type: Number, default: null },
      accuracyM: { type: Number, default: null },
    },

    metrics: {
      rttMs: { type: Number, default: null },
      jitterMs: { type: Number, default: null },
      packetsLost: { type: Number, default: null },
      bitrateKbps: { type: Number, default: null },
    },

    payload: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

callEventSchema.index({ callKey: 1, occurredAt: 1 })
callEventSchema.index({ callId: 1, occurredAt: 1 })

module.exports = mongoose.model('CallEvent', callEventSchema)

