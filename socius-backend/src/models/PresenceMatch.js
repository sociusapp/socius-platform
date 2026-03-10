const mongoose = require('mongoose')

const presenceMatchSchema = new mongoose.Schema(
  {
    presenceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PresenceRequest',
      required: true,
    },
    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: [
        'alerted',       // alarm notification gaya
        'accepted',      // helper ne accept kiya
        'en_route',      // helper ja raha hai
        'arrived',       // helper pohunch gaya
        'closed',        // done
        'declined',      // helper ne decline kiya
        'not_responded', // helper ne respond nahi kiya
      ],
      default: 'alerted',
    },

    // Distance at time of alert (meters)
    distanceMeters: {
      type: Number,
      default: null,
    },

    // Timing
    alertedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },

    // Helper closure feedback
    helperFeedback: {
      closureReason: {
        type: String,
        enum: [
          'calm_mediation',
          'no_longer_needed',
          'situation_changed',
          'chose_to_step_away',
          null,
        ],
        default: null,
      },
      helpfulNotes: { type: String, default: null },
      closedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
)

presenceMatchSchema.index({ presenceRequestId: 1 })
presenceMatchSchema.index({ helperId: 1 })
presenceMatchSchema.index({ status: 1 })

module.exports = mongoose.model('PresenceMatch', presenceMatchSchema)
