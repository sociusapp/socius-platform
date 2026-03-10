const mongoose = require('mongoose')

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['community_supporter'],
      default: 'community_supporter',
    },
    amount: {
      type: Number,
      default: 15, // INR per month
    },
    currency: {
      type: String,
      default: 'INR',
    },
    billingCycle: {
      type: String,
      enum: ['monthly'],
      default: 'monthly',
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'expired', 'pending'],
      default: 'pending',
    },

    // Payment method
    paymentMethod: {
      type: {
        type: String,
        enum: ['upi', 'card', null],
        default: null,
      },
      upiId: { type: String, default: null },
      cardLast4: { type: String, default: null },
      cardBrand: { type: String, default: null },
    },

    // Billing dates
    startDate: {
      type: Date,
      default: null,
    },
    nextBillingDate: {
      type: Date,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },

    // Payment history (embedded)
    paymentHistory: [
      {
        amount: Number,
        paidAt: Date,
        status: {
          type: String,
          enum: ['success', 'failed', 'refunded'],
        },
        transactionId: String,
      },
    ],

    // Skipped subscription
    isSkipped: {
      type: Boolean,
      default: false,
    },
    skippedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

subscriptionSchema.index({ userId: 1 })
subscriptionSchema.index({ status: 1, nextBillingDate: 1 })

module.exports = mongoose.model('Subscription', subscriptionSchema)
