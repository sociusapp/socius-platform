const mongoose = require('mongoose')

const presenceItemSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PresenceCategory',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    iconName: { type: String, default: null, trim: true, maxlength: 80 },
    iconPath: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
)

presenceItemSchema.index({ categoryId: 1, isActive: 1, sortOrder: 1, createdAt: -1 })

module.exports = mongoose.model('PresenceItem', presenceItemSchema)

