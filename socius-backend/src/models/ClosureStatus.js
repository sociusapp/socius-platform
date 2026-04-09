const mongoose = require('mongoose')

const closureStatusSchema = new mongoose.Schema(
  {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'HelpRequest', required: true, index: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    helperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Workflow status
    status: {
      type: String,
      enum: [
        'initiated',
        'awaiting_other_party',
        'evidence_required',
        'auto_closed_penalty',
        'closed',
        'disputed',
      ],
      default: 'initiated',
      index: true,
    },

    // Ratings (1-5)
    ratingByRequester: { type: Number, min: 1, max: 5, default: null },
    ratingByHelper: { type: Number, min: 1, max: 5, default: null },

    // Feedback answers
    requesterFeedback: {
      providedHelp: { type: Boolean, default: null },
      cancelledAfterAccept: { type: Boolean, default: null },
      noReplyAfterAccept: { type: Boolean, default: null },
      itemIssue: { type: Boolean, default: null },
      itemIssueDescription: { type: String, default: null, maxlength: 500 },
      notes: { type: String, default: null, maxlength: 500 },
      evidencePhotos: [{ type: String }],
    },
    helperFeedback: {
      providedHelp: { type: Boolean, default: null },
      requesterUnavailable: { type: Boolean, default: null },
      safetyConcerns: { type: Boolean, default: null },
      notes: { type: String, default: null, maxlength: 500 },
    },

    // System flags
    flags: {
      helperNoShow: { type: Boolean, default: false },
      helperGhosted: { type: Boolean, default: false },
      itemIssue: { type: Boolean, default: false },
      penaltyApplied: { type: Boolean, default: false },
    },

    // Deadlines and auditing
    ghostingDeadlineAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

closureStatusSchema.index({ requestId: 1, helperId: 1 }, { unique: true })

module.exports = mongoose.model('ClosureStatus', closureStatusSchema)
