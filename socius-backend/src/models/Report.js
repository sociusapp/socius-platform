const mongoose = require('mongoose')

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // What is being reported
    reportedRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      refPath: 'reportedRequestType',
    },
    reportedRequestType: {
      type: String,
      enum: ['HelpRequest', 'PresenceRequest', null],
      default: null,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Reporter role in that interaction
    reporterRole: {
      type: String,
      enum: ['requester', 'helper'],
      default: null,
    },

    // Category
    category: {
      type: String,
      enum: [
        'felt_uncomfortable',
        'personal_boundaries_crossed',
        'misuse_of_platform',
        'false_unnecessary_request',
        'something_else',
      ],
      required: true,
    },
    details: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'dismissed'],
      default: 'pending',
    },

    // Admin review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    adminNote: { type: String, default: null },
    actionTaken: {
      type: String,
      enum: [
        'no_action',
        'user_warned',
        'account_limited',
        'account_suspended',
        'dismissed',
        null,
      ],
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

reportSchema.index({ reporterId: 1 })
reportSchema.index({ reportedUserId: 1 })
reportSchema.index({ status: 1 })

module.exports = mongoose.model('Report', reportSchema)
