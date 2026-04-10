const mongoose = require('mongoose')

const notificationCampaignAssetSchema = new mongoose.Schema(
  {
    relativePath: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
)

module.exports = mongoose.model('NotificationCampaignAsset', notificationCampaignAssetSchema)
