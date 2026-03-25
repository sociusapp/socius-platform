const mongoose = require('mongoose');

const publicLocationSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    accuracy: {
      type: Number, // in meters
      default: null,
    },
    altitude: {
      type: Number,
      default: null,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON Index
publicLocationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('PublicLocation', publicLocationSchema);
