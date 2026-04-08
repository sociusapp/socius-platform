const mongoose = require('mongoose')

const helpMatchSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HelpRequest',
      required: true,
    },
    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Match Status
    status: {
      type: String,
      enum: [
        'pending',    // notification bheja gaya
        'notified',   // notification gaya helper ko
        'accepted',   // helper ne accept kiya
        'declined',   // helper ne decline kiya
        'cancelled',  // request cancel ho gayi
        'completed',  // successfully done
        'not_available', // helper ne "not available" choose kiya
      ],
      default: 'pending',
    },

    // Distance at time of match (meters)
    distanceMeters: {
      type: Number,
      default: null,
    },

    // Timing
    notifiedAt: { type: Date, default: Date.now },
    viewedAt: { type: Date, default: null },
    respondedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    markedDeliveredAt: { type: Date, default: null },

    // Helper felt unsafe?
    helperFeltUnsafe: {
      type: Boolean,
      default: false,
    },

    // Closure from helper side
    helperClosure: {
      wasResolved: { type: Boolean, default: null },
      accountability: {
        type: String,
        default: null,
      },
      rating: {
        type: String,
        default: null,
      },
      closedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
)

helpMatchSchema.index({ requestId: 1 })
helpMatchSchema.index({ helperId: 1 })
helpMatchSchema.index({ status: 1 })
// At most one accepted match per help request (prevents double-accept races)
helpMatchSchema.index(
  { requestId: 1 },
  { unique: true, partialFilterExpression: { status: 'accepted' } }
)

module.exports = mongoose.model('HelpMatch', helpMatchSchema)
