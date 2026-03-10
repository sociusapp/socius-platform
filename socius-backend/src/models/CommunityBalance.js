const mongoose = require('mongoose')

const communityBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // Help requests sent by user
    helpRequestsSent: {
      type: Number,
      default: 0,
    },
    helpRequestsClosed: {
      type: Number,
      default: 0,
    },

    // Help given by user (as volunteer)
    helpGiven: {
      type: Number,
      default: 0,
    },
    presenceGiven: {
      type: Number,
      default: 0,
    },

    // Nudge tracking
    nudgeShownCount: {
      type: Number,
      default: 0,
    },
    lastNudgeShownAt: {
      type: Date,
      default: null,
    },
    nudgeAcknowledgedAt: {
      type: Date,
      default: null,
    },

    // Last activity
    lastRequestAt: { type: Date, default: null },
    lastHelpGivenAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
)

communityBalanceSchema.index({ userId: 1 })

module.exports = mongoose.model('CommunityBalance', communityBalanceSchema)
