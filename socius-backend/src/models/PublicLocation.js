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
    address: {
      displayAddress: {
        type: String,
        default: null,
      },
      city: {
        type: String,
        default: null,
      },
      state: {
        type: String,
        default: null,
      },
      country: {
        type: String,
        default: null,
      },
      zipCode: {
        type: String,
        default: null,
      },
    },
    // Which custom tracking link was used
    trackingLinkSlug: {
      type: String,
      default: null,
    },
    // Tracking journey - each step with timestamp
    trackingJourney: {
      pageLoadedAt: { type: Date, default: null },
      spinButtonClickedAt: { type: Date, default: null },
      permissionRequestedAt: { type: Date, default: null },
      permissionStatus: { 
        type: String, 
        enum: ['pending', 'granted', 'denied', 'timeout', 'not_supported'],
        default: 'pending'
      },
      permissionErrorCode: { type: Number, default: null },
      permissionErrorMessage: { type: String, default: null },
      locationCapturedAt: { type: Date, default: null },
      locationAttempts: { type: Number, default: 0 },
      spinCompletedAt: { type: Date, default: null },
      journeyStatus: {
        type: String,
        enum: ['page_loaded', 'clicked', 'permission_requested', 'permission_denied', 'location_captured', 'completed', 'failed'],
        default: 'page_loaded'
      }
    },
  },
  {
    timestamps: true,
  }
);

// GeoJSON Index
publicLocationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('PublicLocation', publicLocationSchema);
