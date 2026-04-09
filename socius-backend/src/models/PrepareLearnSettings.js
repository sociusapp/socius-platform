const mongoose = require('mongoose')

/**
 * Singleton-style settings for Prepare tab "Learn more" block (mobile footer).
 */
const prepareLearnSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true, index: true },
    sectionTitle: { type: String, default: 'Learn more', trim: true },
    footerText: {
      type: String,
      default: 'Preparation reduces harm and misunderstanding.',
      trim: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('PrepareLearnSettings', prepareLearnSettingsSchema)
