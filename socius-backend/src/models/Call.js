const mongoose = require('mongoose')

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['caller', 'callee', 'participant'], required: true },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    device: {
      platform: { type: String, default: null },
      osVersion: { type: String, default: null },
      appVersion: { type: String, default: null },
      deviceModel: { type: String, default: null },
      deviceName: { type: String, default: null },
    },
    network: {
      type: { type: String, default: null },
      isMetered: { type: Boolean, default: null },
      signalStrength: { type: Number, default: null },
      carrier: { type: String, default: null },
    },
    location: {
      lng: { type: Number, default: null },
      lat: { type: Number, default: null },
      accuracyM: { type: Number, default: null },
      address: { type: String, default: null },
    },
  },
  { _id: false }
)

const qualitySnapshotSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    rttMs: { type: Number, default: null },
    jitterMs: { type: Number, default: null },
    packetsLost: { type: Number, default: null },
    bitrateKbps: { type: Number, default: null },
    audioLevel: { type: Number, default: null },
  },
  { _id: false }
)

const callSchema = new mongoose.Schema(
  {
    callKey: { type: String, required: true, unique: true, index: true },

    callType: {
      type: String,
      enum: ['p2p_audio', 'p2p_video', 'conference_audio', 'conference_video', 'unknown'],
      default: 'p2p_audio',
      index: true,
    },

    callerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    calleeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: {
      type: String,
      enum: ['initiated', 'ringing', 'answered', 'missed', 'rejected', 'ended', 'failed'],
      default: 'initiated',
      index: true,
    },
    failureReason: { type: String, default: null },

    startedAt: { type: Date, default: null, index: true },
    answeredAt: { type: Date, default: null, index: true },
    endedAt: { type: Date, default: null, index: true },
    durationSec: { type: Number, default: 0 },

    participants: { type: [participantSchema], default: [] },

    forwarding: {
      isForwarded: { type: Boolean, default: false },
      forwardedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      forwardedAt: { type: Date, default: null },
      reason: { type: String, default: null },
    },

    voicemail: {
      exists: { type: Boolean, default: false },
      filePath: { type: String, default: null },
      durationSec: { type: Number, default: null },
      transcript: { type: String, default: null },
      createdAt: { type: Date, default: null },
    },

    recording: {
      exists: { type: Boolean, default: false },
      filePath: { type: String, default: null },
      format: { type: String, default: null },
      startedAt: { type: Date, default: null },
      endedAt: { type: Date, default: null },
    },

    transferHistory: {
      type: [
        {
          fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          at: { type: Date, required: true },
          reason: { type: String, default: null },
        },
      ],
      default: [],
    },

    quality: {
      snapshots: { type: [qualitySnapshotSchema], default: [] },
      summary: {
        avgRttMs: { type: Number, default: null },
        maxRttMs: { type: Number, default: null },
        avgJitterMs: { type: Number, default: null },
        maxJitterMs: { type: Number, default: null },
        totalPacketsLost: { type: Number, default: null },
      },
    },

    meta: {
      requestId: { type: mongoose.Schema.Types.ObjectId, default: null, refPath: 'meta.requestType' },
      requestType: { type: String, enum: ['HelpRequest', 'PresenceRequest', null], default: null },
      chatSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', default: null },
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
    },
  },
  { timestamps: true }
)

callSchema.index({ callerId: 1, startedAt: -1 })
callSchema.index({ calleeId: 1, startedAt: -1 })
callSchema.index({ status: 1, startedAt: -1 })

module.exports = mongoose.model('Call', callSchema)

