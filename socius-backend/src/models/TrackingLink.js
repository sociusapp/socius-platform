const mongoose = require('mongoose');

const trackingLinkSchema = new mongoose.Schema({
  // The custom path like 'momtaj', 'rehan', 'special-offer'
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  
  // Human readable name for admin panel
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Description/notes for admin
  description: {
    type: String,
    default: ''
  },
  
  // Who created this link
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Is this link active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Campaign/tag for grouping
  campaign: {
    type: String,
    default: 'default'
  },
  
  // Total visits captured
  totalVisits: {
    type: Number,
    default: 0
  },
  
  // Unique visitors count
  uniqueVisitors: {
    type: Number,
    default: 0
  },
  
  // Successful location captures
  successfulCaptures: {
    type: Number,
    default: 0
  },
  
  // Expiry date (optional)
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for quick lookup
trackingLinkSchema.index({ slug: 1 });
trackingLinkSchema.index({ isActive: 1 });
trackingLinkSchema.index({ campaign: 1 });

module.exports = mongoose.model('TrackingLink', trackingLinkSchema);
