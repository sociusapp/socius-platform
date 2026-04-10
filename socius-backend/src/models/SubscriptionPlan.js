const mongoose = require('mongoose')

const featureSchema = new mongoose.Schema(
  {
    key: { type: String, default: '' },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    limit: { type: String, default: null },
  },
  { _id: false }
)

const subscriptionPlanSchema = new mongoose.Schema(
  {
    planKey: {
      type: String,
      required: true,
      unique: true,
      enum: ['free', 'premium', 'family'],
    },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    priceAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    billingPeriod: {
      type: String,
      enum: ['forever', 'month', 'year'],
      default: 'month',
    },
    sortOrder: { type: Number, default: 0 },
    features: { type: [featureSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

subscriptionPlanSchema.index({ sortOrder: 1 })

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema)
