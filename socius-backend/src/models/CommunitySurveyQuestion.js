const mongoose = require('mongoose')

const communitySurveyQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

communitySurveyQuestionSchema.index({ isActive: 1, sortOrder: 1, createdAt: 1 })

module.exports = mongoose.model('CommunitySurveyQuestion', communitySurveyQuestionSchema)
