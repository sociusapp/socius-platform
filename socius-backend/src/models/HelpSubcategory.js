const mongoose = require('mongoose')

const helpSubcategorySchema = new mongoose.Schema(
  {
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HelpCategory',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 160 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

helpSubcategorySchema.index({ parentCategoryId: 1, isActive: 1, createdAt: 1 })

module.exports = mongoose.model('HelpSubcategory', helpSubcategorySchema)
