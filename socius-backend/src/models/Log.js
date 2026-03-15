const mongoose = require('mongoose')

const logSchema = new mongoose.Schema(
  {
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug'],
      default: 'info',
    },
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String, // Full error stack trace
      default: null,
    },
    method: {
      type: String, // GET, POST, etc.
      default: null,
    },
    url: {
      type: String, // API endpoint
      default: null,
    },
    body: {
      type: mongoose.Schema.Types.Mixed, // Request body (for debugging)
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    }
  },
  {
    timestamps: true,
  }
)

// Index for TTL (automatically delete logs after 7 days to save space)
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 })

module.exports = mongoose.model('Log', logSchema)
