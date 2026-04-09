const mongoose = require('mongoose')

/**
 * Pill chips under "Learn more" on mobile Prepare screen.
 * icon: MaterialCommunityIcons name (e.g. brain, earth, handshake)
 * navigateTo: React Navigation screen when content is empty (e.g. SafetyTips)
 * content: full article body shown on mobile when the chip is opened
 */
const prepareLearnChipSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true, default: 'help-circle-outline' },
    position: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true },
    navigateTo: { type: String, default: 'SafetyTips', trim: true },
    content: { type: String, default: '' },
  },
  { timestamps: true }
)

prepareLearnChipSchema.index({ position: 1 })

module.exports = mongoose.model('PrepareLearnChip', prepareLearnChipSchema)
