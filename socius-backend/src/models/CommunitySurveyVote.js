const mongoose = require('mongoose')

const communitySurveyVoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommunitySurveyQuestion',
      required: true,
      index: true,
    },
    value: { type: String, required: true, enum: ['like', 'dislike'] },
    /** Snapshot when the vote was submitted (from client; optional) */
    locationLabel: { type: String, default: null, trim: true, maxlength: 280 },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { timestamps: true }
)

communitySurveyVoteSchema.index({ userId: 1, questionId: 1 }, { unique: true })
communitySurveyVoteSchema.index({ questionId: 1, value: 1, updatedAt: -1 })
communitySurveyVoteSchema.index({ locationLabel: 1 })

module.exports = mongoose.model('CommunitySurveyVote', communitySurveyVoteSchema)
