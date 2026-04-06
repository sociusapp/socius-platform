const mongoose = require('mongoose')

const verificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Government ID
    governmentId: {
      fileUrl: { type: String, default: null },       // local path
      fileName: { type: String, default: null },
      fileType: { type: String, default: null },      // jpg/png/pdf
      documentType: {
        type: String,
        enum: ['aadhaar', 'driving_license', 'voter_id', 'other', null],
        default: null,
      },
      uploadedAt: { type: Date, default: null },
    },

    // Selfie
    selfie: {
      fileUrl: { type: String, default: null },
      fileName: { type: String, default: null },
      uploadedAt: { type: Date, default: null },
    },

    // Status
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'failed', 'review_requested'],
      default: 'not_submitted',
    },

    // Failure details
    failureReasons: {
      type: [String],
      default: [],
    },

    // Admin Review
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminNote: {
      type: String,
      default: null,
    },

    reviewHistory: [
      {
        status: {
          type: String,
          enum: ['approved', 'failed', 'pending'],
          required: true,
        },
        action: {
          type: String,
          enum: ['approved', 'rejected', 'submitted', 'resubmitted'],
          required: true,
        },
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        reviewedAt: {
          type: Date,
          default: Date.now,
        },
        failureReasons: {
          type: [String],
          default: [],
        },
        adminNote: {
          type: String,
          default: null,
        },
      },
    ],

    // Retry tracking
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
      default: null,
    },

    // Review Request (user requests manual review)
    reviewRequest: {
      isRequested: { type: Boolean, default: false },
      requestedAt: { type: Date, default: null },
      userExplanation: { type: String, default: null },
      updatedDocUrl: { type: String, default: null },
      updatedSelfieUrl: { type: String, default: null },
      status: {
        type: String,
        enum: ['pending', 'resolved', null],
        default: null,
      },
    },

    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

verificationSchema.index({ userId: 1 })
verificationSchema.index({ status: 1 })

module.exports = mongoose.model('Verification', verificationSchema)
