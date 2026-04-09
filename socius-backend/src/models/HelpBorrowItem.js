const mongoose = require('mongoose')

const helpBorrowItemSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HelpRequest',
      required: true,
      index: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    helperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    note: {
      type: String,
      default: '',
      trim: true,
      maxlength: 400,
    },
    requestedMinutes: {
      type: Number,
      required: true,
      min: 5,
      max: 1440,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
      index: true,
    },
    /** requester = I need this item from helper; helper = I'm offering this item to requester */
    initiatedBy: {
      type: String,
      enum: ['requester', 'helper'],
      default: 'requester',
      index: true,
    },
    actedAt: {
      type: Date,
      default: null,
    },
    actedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
)

helpBorrowItemSchema.index({ requestId: 1, createdAt: -1 })

module.exports = mongoose.model('HelpBorrowItem', helpBorrowItemSchema)

