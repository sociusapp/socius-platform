const mongoose = require('mongoose')

const chatSessionSchema = new mongoose.Schema(
  {
    // Linked request
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'requestType',
    },
    requestType: {
      type: String,
      enum: ['HelpRequest', 'PresenceRequest'],
      required: true,
    },

    // Participants
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },

    // Message count (quick reference)
    messageCount: {
      type: Number,
      default: 0,
    },

    // Last message preview
    lastMessage: {
      text: { type: String, default: null },
      senderId: { type: mongoose.Schema.Types.ObjectId, default: null },
      sentAt: { type: Date, default: null },
    },

    // Timing
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },

    // Messages deleted after close (privacy)
    messagesDeletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

chatSessionSchema.index({ requestId: 1, helperId: 1 })
chatSessionSchema.index({ requesterId: 1 })
chatSessionSchema.index({ helperId: 1 })
chatSessionSchema.index({ status: 1 })

module.exports = mongoose.model('ChatSession', chatSessionSchema)
