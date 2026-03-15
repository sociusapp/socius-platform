const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    countryCode: {
      type: String,
      default: '+91',
    },
    fullName: {
      type: String,
      trim: true,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
    },
    age: {
      type: Number,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'prefer_not_to_say', null],
      default: null,
    },
    cityArea: {
      type: String,
      trim: true,
      default: null,
    },

    // Role & Participation
    role: {
      type: String,
      enum: ['community_member', 'available_to_help', 'both'],
      default: 'community_member',
    },
    notificationPreferences: {
      type: [String],
      enum: [
        'calm_presence',
        'community_safety',
        'elder_support',
        'womens_safety',
        'medical_assistance',
        'language_help',
        'blood_donation',
        'general_support',
      ],
      default: [],
    },

    // Availability
    isAvailable: {
      type: Boolean,
      default: false,
    },
    availabilityPausedUntil: {
      type: Date,
      default: null,
    },

    // Location (GeoJSON - 2dsphere index)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },

    // Account Status
    accountStatus: {
      type: String,
      enum: ['pending_review', 'active', 'limited', 'suspended'],
      default: 'pending_review',
    },
    accountLimitedReason: {
      type: String,
      default: null,
    },
    accountLimitedAt: {
      type: Date,
      default: null,
    },

    // Verification
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isIdentityVerified: {
      type: Boolean,
      default: false,
    },

    // Subscription
    subscriptionStatus: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'none'],
      default: 'none',
    },

    // Profile — What I'm open to
    openTo: {
      type: [String],
      enum: [
        'calm_presence',
        'care_support',
        'medical_awareness',
        'language_support',
        'elder_assistance',
        'community_upkeep',
      ],
      default: [],
    },

    // Associations (optional, not shown publicly)
    associations: {
      college: { type: String, default: null },
      religiousPlace: { type: String, default: null },
      workplace: { type: String, default: null },
      localGroup: { type: String, default: null },
    },

    // First Time Flags
    hasSeenAvailabilityGuide: {
      type: Boolean,
      default: false,
    },
    hasSeenUserGuide: {
      type: Boolean,
      default: false,
    },
    hasGivenLocationPermission: {
      type: Boolean,
      default: false,
    },

    // Profile visibility
    isProfileVisible: {
      type: Boolean,
      default: true,
    },

    // Admin notes (internal)
    adminNotes: {
      type: String,
      default: null,
    },

    // Admin flag (internal only — never expose in API response)
    isAdmin: {
      type: Boolean,
      default: false,
    },

    // Developer flag (internal)
    isDeveloper: {
      type: Boolean,
      default: false,
    },

    // Soft delete
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

// 2dsphere index for geo queries
userSchema.index({ location: '2dsphere' })
userSchema.index({ phone: 1 })
userSchema.index({ accountStatus: 1, isAvailable: 1 })

module.exports = mongoose.model('User', userSchema)
