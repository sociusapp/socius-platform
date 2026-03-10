const mongoose = require('mongoose')

const emergencyContactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Contact details
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      trim: true,
      default: null, // optional (e.g. "Mother", "Friend")
    },

    // Contacts are notified ONLY when user chooses escalation
    // Socius does NOT notify them automatically
    notifyOnEscalation: {
      type: Boolean,
      default: true,
    },

    // Order for display
    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

emergencyContactSchema.index({ userId: 1 })

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema)
