const mongoose = require('mongoose')

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxLength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxLength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: ['Bug', 'UI/UX', 'Feature', 'Backend', 'Security', 'Other'],
      default: 'Bug',
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Closed'],
      default: 'Pending',
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional if we want to allow anonymous reporting in dev
    },
    reportedByName: {
      type: String,
      default: 'Admin',
    },
    screenshot: {
      type: String,
      default: null,
    },
    voiceNote: {
      type: String,
      default: null,
    },
    transcript: {
      type: String,
      default: null,
    },
    platform: {
      type: String,
      enum: ['Mobile App', 'Admin Panel', 'Other'],
      default: 'Mobile App',
    },
    flow: {
      type: String,
      default: 'General', // e.g., Login, Chat, Onboarding
    },
    aiEnabled: {
      type: Boolean,
      default: false,
    },
    aiAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    aiAssignedAt: {
      type: Date,
      default: null,
    },
    aiLastCompletedAt: {
      type: Date,
      default: null,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
    deviceInfo: {
      model: { type: String, default: null },
      os: { type: String, default: null },
      appVersion: { type: String, default: null },
      browser: { type: String, default: null }, // for web reports
    },
    activity: [
      {
        type: {
          type: String,
          enum: ['status', 'comment', 'system'],
          default: 'comment',
        },
        text: String,
        user: String,
        visibility: {
          type: String,
          enum: ['both', 'developer'],
          default: 'both',
        },
        time: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

module.exports = mongoose.model('Issue', issueSchema)
