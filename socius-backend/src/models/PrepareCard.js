const mongoose = require('mongoose')

/**
 * Prepare & Stay Ready cards (mobile Prepare tab + admin).
 * - prepareId: public numeric id (auto-increment style)
 * - position: 0-based order for drag-and-drop
 */
const prepareCardSchema = new mongoose.Schema(
  {
    prepareId: { type: Number, unique: true, sparse: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, default: '' },
    image: { type: String, default: '' },
    position: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true },
    /** Optional long body for mobile detail screen */
    content: { type: String, default: '' },
  },
  { timestamps: true }
)

prepareCardSchema.index({ position: 1, prepareId: 1 })

module.exports = mongoose.model('PrepareCard', prepareCardSchema)
