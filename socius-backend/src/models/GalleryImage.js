const mongoose = require('mongoose');

const GalleryImageSchema = new mongoose.Schema({
  imageUrls: {
    type: [String],
    default: [
      'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1529333241880-0fc7855bb921?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1518568814500-bf0f8d125f46?w=400&h=400&fit=crop'
    ],
    validate: {
      validator: function(urls) {
        return urls.length === 6;
      },
      message: 'Exactly 6 image URLs are required'
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Singleton - only one document
GalleryImageSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('GalleryImage', GalleryImageSchema);
