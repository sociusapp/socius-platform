const mongoose = require('mongoose')

const badgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Badge type
    type: {
      type: String,
      enum: [
        'closes_properly',     // 🟢 Handshake - closes requests properly
        'returns_on_time',     // 🟢 Clock - returns items on time
        'also_helps_others',   // 🔵 People - also helps others
        'occasional_requester', // 🟡 Calendar - occasional requester
      ],
      required: true,
    },

    // Badge source
    awardedBy: {
      type: String,
      enum: ['system', 'admin'],
      default: 'system',
    },
    awardedByAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Is badge still active
    isActive: {
      type: Boolean,
      default: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      default: null,
    },

    earnedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

badgeSchema.index({ userId: 1 })
badgeSchema.index({ type: 1 })

module.exports = mongoose.model('Badge', badgeSchema)
