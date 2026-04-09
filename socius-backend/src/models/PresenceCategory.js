const mongoose = require('mongoose')

const presenceCategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    iconName: { type: String, default: null, trim: true, maxlength: 80 },
    iconPath: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
)

presenceCategorySchema.index({ isActive: 1, sortOrder: 1, title: 1 })

module.exports = mongoose.model('PresenceCategory', presenceCategorySchema)

