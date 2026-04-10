const mongoose = require('mongoose')

const presenceRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Situation
    situationType: {
      type: String,
      enum: [
        'need_calm_presence',
        'being_followed',
        'feeling_unsafe',
        'other',
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },

    // Location shared at time of request
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: { type: String, default: null, maxlength: 500 },
    },

    // Status
    status: {
      type: String,
      enum: [
        'active',            // request live hai
        'helpers_notified',  // helpers ko alarm gaya
        'helpers_accepted',  // kuch helpers ne accept kiya
        'closed',            // band ho gayi
        'cancelled',         // user ne cancel kiya
        'auto_closed',       // system ne close kiya
      ],
      default: 'active',
    },

    // How many helpers to notify (2-5)
    maxHelpers: {
      type: Number,
      default: 3,
      min: 2,
      max: 5,
    },
    totalNotified: {
      type: Number,
      default: 0,
    },
    totalAccepted: {
      type: Number,
      default: 0,
    },

    // Timing
    helpersNotifiedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    autoClosedAt: { type: Date, default: null },
    autoCloseScheduledAt: { type: Date, default: null },

    // Closure details
    closureReason: {
      type: String,
      enum: [
        'calm_mediation',
        'no_longer_needed',
        'situation_changed',
        'chose_to_step_away',
        'emergency_services_called',
        null,
      ],
      default: null,
    },

    // Emergency services contacted?
    emergencyServicesCalled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

presenceRequestSchema.index({ location: '2dsphere' })
presenceRequestSchema.index({ requesterId: 1 })
presenceRequestSchema.index({ status: 1 })
presenceRequestSchema.index({ createdAt: -1 })

module.exports = mongoose.model('PresenceRequest', presenceRequestSchema)
