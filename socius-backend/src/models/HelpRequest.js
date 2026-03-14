const mongoose = require('mongoose')

const helpRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Request Details
    category: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    categoryName: { type: String, default: null, trim: true, maxlength: 80 },
    categoryIcon: { type: String, default: null },

    // Requested duration (as selected in app UI, e.g. "10–15 minutes", "About 1 hour")
    requestedDurationLabel: {
      type: String,
      trim: true,
      maxlength: 60,
      default: null,
    },

    // Location at time of request
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
      address: { type: String, default: null },
      whereToFindText: { type: String, default: null }, // "Standing near main entrance, beside security desk"
    },

    // Status
    status: {
      type: String,
      enum: [
        'open',        // request bheja, koi match nahi hua abhi
        'matching',    // system match dhundh raha hai
        'matched',     // helper mila
        'active',      // helper on the way / in progress
        'closing',     // close ho raha hai
        'closed',      // successfully closed
        'cancelled',   // user ne cancel kiya
        'auto_closed', // system ne auto close kiya
      ],
      default: 'open',
    },

    // Item return required?
    itemReturnRequired: {
      type: Boolean,
      default: false,
    },

    // Timing
    matchedAt: { type: Date, default: null },
    activeAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    autoClosedAt: { type: Date, default: null },
    autoCloseScheduledAt: { type: Date, default: null },

    // Community balance nudge shown?
    nudgeShown: {
      type: Boolean,
      default: false,
    },
    nudgeShownAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

helpRequestSchema.index({ location: '2dsphere' })
helpRequestSchema.index({ requesterId: 1 })
helpRequestSchema.index({ status: 1 })
helpRequestSchema.index({ createdAt: -1 })

module.exports = mongoose.model('HelpRequest', helpRequestSchema)
