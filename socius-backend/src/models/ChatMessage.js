const mongoose = require('mongoose')

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /** Primary label shown in the list (caption, or auto summary for media) */
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
      default: '',
    },

    messageType: {
      type: String,
      enum: ['text', 'image', 'location', 'audio', 'file'],
      default: 'text',
    },

    /** Server paths under /uploads/chat-media or lat/lng for location */
    attachment: {
      url: { type: String, default: null },
      mimeType: { type: String, default: null },
      fileName: { type: String, default: null },
      size: { type: Number, default: null },
      durationSec: { type: Number, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      address: { type: String, default: null },
    },

    // Delivered status
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },

    reactions: {
      type: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          emoji: { type: String, required: true, trim: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // Deleted after session close (privacy)
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

chatMessageSchema.index({ sessionId: 1, createdAt: 1 })
chatMessageSchema.index({ senderId: 1 })
chatMessageSchema.index({ isDeleted: 1 })

module.exports = mongoose.model('ChatMessage', chatMessageSchema)
