const mongoose = require('mongoose')

const helpCategorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: null, trim: true, maxlength: 140 },
    iconPath: { type: String, default: null },
    color: { type: String, default: null, trim: true, maxlength: 16 },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

helpCategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 })

module.exports = mongoose.model('HelpCategory', helpCategorySchema)
