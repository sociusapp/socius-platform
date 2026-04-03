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
    visitorId: {
      type: String,
      default: null,
    },
    screenResolution: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      default: null,
    },
    timezone: {
      type: String,
      default: null,
    },
    batteryLevel: {
      type: Number,
      default: null,
    },
    networkType: {
      type: String,
      default: null,
    },
    // Advanced Device Fingerprinting Fields
    deviceInfo: {
      platform: String,
      vendor: String,
      cpuCores: Number,
      memory: Number, // GB
      gpu: String,
      colorDepth: Number,
      pixelRatio: Number,
      fonts: [String],
      plugins: [String],
      isTouchDevice: Boolean,
      doNotTrack: String,
    },
    networkInfo: {
      downlink: Number, // Mbps
      effectiveType: String,
      rtt: Number, // ms
      saveData: Boolean,
    },
    behavioralData: {
      clickPatterns: [{
        x: Number,
        y: Number,
        timestamp: Number,
        pressure: Number,
      }],
      totalClicks: Number,
      timeOnPage: Number, // ms
    },
    fingerprintHash: {
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
    method: {
      type: String,
      enum: ['geolocation', 'ip-api'],
      default: 'geolocation',
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON Index
publicLocationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('PublicLocation', publicLocationSchema);
