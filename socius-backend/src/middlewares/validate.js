const Joi = require('joi')
const { badRequest } = require('../utils/response')

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema
 * @param {'body'|'query'|'params'} source
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,    // sab errors ek saath dikhao
      stripUnknown: true,   // extra fields remove karo
    })

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }))
      console.error('Validation failed for', req.originalUrl, ':', errors);
      return badRequest(res, 'Validation failed', errors)
    }

    req[source] = value // cleaned/validated value replace karo
    next()
  }
}

// ─── Common reusable schemas ──────────────────────────────

const schemas = {
  // Auth
  sendOtp: Joi.object({
    phone: Joi.string()
      .pattern(/^\d{7,11}$/)
      .required()
      .messages({
        'string.pattern.base': 'Enter a valid mobile number (7-11 digits)',
      }),
    countryCode: Joi.string().default('+91'),
  }),

  verifyOtp: Joi.object({
    phone: Joi.string().pattern(/^\d{7,11}$/).required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must be numeric',
    }),
    deviceToken: Joi.string().optional(),
    platform: Joi.string().valid('android', 'ios').optional(),
    deviceId: Joi.string().optional().allow(null, ''),
    deviceModel: Joi.string().optional().allow(null, ''),
    appVersion: Joi.string().optional().allow(null, ''),
  }),

  updateDeviceToken: Joi.object({
    deviceToken: Joi.string().required(),
    platform: Joi.string().valid('android', 'ios').required(),
    deviceId: Joi.string().optional().allow(null, ''),
    deviceModel: Joi.string().optional().allow(null, ''),
    appVersion: Joi.string().optional().allow(null, ''),
  }),

  adminLogin: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(6).max(128).required(),
  }),

  // User profile
  updateProfile: Joi.object({
    fullName: Joi.string().trim().min(2).max(100).optional(),
    age: Joi.number().integer().min(13).max(120).optional(),
    gender: Joi.string().valid('male', 'female', 'prefer_not_to_say').optional(),
    cityArea: Joi.string().trim().max(200).optional(),
    role: Joi.string().valid('community_member', 'available_to_help', 'both').optional(),
    notificationPreferences: Joi.array()
      .items(
        Joi.string().valid(
          'calm_presence', 'community_safety', 'elder_support',
          'womens_safety', 'medical_assistance', 'language_help',
          'blood_donation', 'general_support'
        )
      )
      .optional(),
    openTo: Joi.array()
      .items(
        Joi.string().valid(
          'calm_presence', 'care_support', 'medical_awareness',
          'language_support', 'elder_assistance', 'community_upkeep',
          'print_document', 'tool_repair', 'carry_lift', 'transport_help',
          'household_help', 'study_office_help', 'tech_help', 'general_help'
        )
      )
      .optional(),
    associations: Joi.object({
      college: Joi.string().allow('', null).optional(),
      religiousPlace: Joi.string().allow('', null).optional(),
      workplace: Joi.string().allow('', null).optional(),
      localGroup: Joi.string().allow('', null).optional(),
    }).optional(),
  }),

  // Availability
  updateAvailability: Joi.object({
    isAvailable: Joi.boolean().required(),
    location: Joi.object({
      lng: Joi.number().min(-180).max(180).required(),
      lat: Joi.number().min(-90).max(90).required(),
    }).optional(),
  }),

  // Help request
  createHelpRequest: Joi.object({
    category: Joi.string().trim().max(60).required(),
    categoryId: Joi.string().trim().length(24).optional(),
    subcategoryId: Joi.string().trim().length(24).optional().allow('', null),
    description: Joi.string().trim().max(500).optional().allow(''),
    time: Joi.string().trim().max(60).optional().allow(''),
    location: Joi.object({
      lng: Joi.number().min(-180).max(180).required(),
      lat: Joi.number().min(-90).max(90).required(),
      address: Joi.string().optional().allow(''),
      whereToFindText: Joi.string().max(300).optional().allow(''),
    }).required(),
    itemReturnRequired: Joi.boolean().default(false),
  }),

  updateHelpRequest: Joi.object({
    category: Joi.string().trim().max(60).optional(),
    categoryId: Joi.string().trim().length(24).optional(),
    subcategoryId: Joi.string().trim().length(24).optional().allow('', null),
    description: Joi.string().trim().max(500).optional().allow(''),
    time: Joi.string().trim().max(60).optional().allow(''),
    location: Joi.object({
      lng: Joi.number().min(-180).max(180).required(),
      lat: Joi.number().min(-90).max(90).required(),
      address: Joi.string().optional().allow(''),
      whereToFindText: Joi.string().max(300).optional().allow(''),
    }).optional(),
    itemReturnRequired: Joi.boolean().optional(),
  }).min(1),

  // Admin: Help categories
  adminCreateHelpCategory: Joi.object({
    name: Joi.string().trim().min(2).max(60).required(),
    slug: Joi.string().trim().max(60).optional().allow(''),
    description: Joi.string().trim().max(140).optional().allow(''),
    color: Joi.string().trim().max(16).optional().allow(''),
    sortOrder: Joi.number().integer().min(0).max(10000).optional(),
    isActive: Joi.boolean().truthy('true').falsy('false').optional(),
  }),

  adminUpdateHelpCategory: Joi.object({
    name: Joi.string().trim().min(2).max(60).optional(),
    slug: Joi.string().trim().max(60).optional().allow(''),
    description: Joi.string().trim().max(140).optional().allow(''),
    color: Joi.string().trim().max(16).optional().allow(''),
    sortOrder: Joi.number().integer().min(0).max(10000).optional(),
    isActive: Joi.boolean().truthy('true').falsy('false').optional(),
  }).min(1),

  // Admin: Help sub-categories
  adminCreateHelpSubcategory: Joi.object({
    parentCategoryId: Joi.string().trim().length(24).required(),
    title: Joi.string().trim().min(2).max(80).required(),
    description: Joi.string().trim().min(2).max(160).required(),
    isActive: Joi.boolean().truthy('true').falsy('false').optional(),
  }),

  adminUpdateHelpSubcategory: Joi.object({
    parentCategoryId: Joi.string().trim().length(24).optional(),
    title: Joi.string().trim().min(2).max(80).optional(),
    description: Joi.string().trim().min(2).max(160).optional(),
    isActive: Joi.boolean().truthy('true').falsy('false').optional(),
  }).min(1),

  // Presence request
  createPresenceRequest: Joi.object({
    situationType: Joi.string()
      .valid('need_calm_presence', 'being_followed', 'feeling_unsafe', 'other')
      .required()
      .messages({
        'any.only': 'Situation type must be one of: need_calm_presence, being_followed, feeling_unsafe, other',
        'any.required': 'Situation type is required'
      }),
    description: Joi.string()
      .trim()
      .max(300)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must be less than 300 characters'
      }),
    location: Joi.object({
      lng: Joi.number()
        .min(-180)
        .max(180)
        .required()
        .messages({
          'number.min': 'Longitude must be between -180 and 180',
          'number.max': 'Longitude must be between -180 and 180',
          'any.required': 'Longitude is required'
        }),
      lat: Joi.number()
        .min(-90)
        .max(90)
        .required()
        .messages({
          'number.min': 'Latitude must be between -90 and 90',
          'number.max': 'Latitude must be between -90 and 90',
          'any.required': 'Latitude is required'
        }),
      address: Joi.string()
        .optional()
        .allow('')
        .max(200)
        .messages({
          'string.max': 'Address must be less than 200 characters'
        }),
    })
      .required()
      .messages({
        'any.required': 'Location is required'
      }),
    maxHelpers: Joi.number()
      .integer()
      .min(2)
      .max(5)
      .default(3)
      .messages({
        'number.min': 'Maximum helpers must be at least 2',
        'number.max': 'Maximum helpers cannot exceed 5',
        'number.integer': 'Maximum helpers must be a whole number'
      }),
  }),
  
  // Update presence request
  updatePresenceRequest: Joi.object({
    situationType: Joi.string()
      .valid('need_calm_presence', 'being_followed', 'feeling_unsafe', 'other')
      .optional()
      .messages({
        'any.only': 'Situation type must be one of: need_calm_presence, being_followed, feeling_unsafe, other'
      }),
    description: Joi.string()
      .trim()
      .max(300)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must be less than 300 characters'
      }),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),
  
  // Presence status update
  updatePresenceStatus: Joi.object({
    status: Joi.string()
      .valid('en_route', 'arrived')
      .required()
      .messages({
        'any.only': 'Status must be either en_route or arrived',
        'any.required': 'Status is required'
      }),
  }),
  
  // Close presence request
  closePresenceRequest: Joi.object({
    closureReason: Joi.string()
      .valid(
        'calm_mediation',
        'no_longer_needed',
        'situation_changed',
        'chose_to_step_away',
        'emergency_services_called'
      )
      .required()
      .messages({
        'any.only': 'Closure reason must be one of: calm_mediation, no_longer_needed, situation_changed, chose_to_step_away, emergency_services_called',
        'any.required': 'Closure reason is required'
      }),
  }),
  
  // Nearby presence requests query
  nearbyPresenceQuery: Joi.object({
    lat: Joi.number()
      .min(-90)
      .max(90)
      .optional()
      .messages({
        'number.min': 'Latitude must be between -90 and 90',
        'number.max': 'Latitude must be between -90 and 90'
      }),
    lng: Joi.number()
      .min(-180)
      .max(180)
      .optional()
      .messages({
        'number.min': 'Longitude must be between -180 and 180',
        'number.max': 'Longitude must be between -180 and 180'
      }),
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .optional()
      .messages({
        'number.min': 'Latitude must be between -90 and 90',
        'number.max': 'Latitude must be between -90 and 90'
      }),
    longitude: Joi.number()
      .min(-180)
      .max(180)
      .optional()
      .messages({
        'number.min': 'Longitude must be between -180 and 180',
        'number.max': 'Longitude must be between -180 and 180'
      }),
  }).xor('lat', 'latitude').messages({
    'object.xor': 'Provide either lat/lng or latitude/longitude, not both'
  }),

  helpSessionAction: Joi.object({
    action: Joi.string().valid('extend', 'complete').required(),
    additionalMinutes: Joi.number().integer().min(5).max(120).when('action', {
      is: 'extend',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
  }),

  borrowItemCreate: Joi.object({
    itemName: Joi.string().trim().min(2).max(120).required(),
    note: Joi.string().trim().max(400).optional().allow(''),
    requestedMinutes: Joi.number().integer().min(5).max(1440).required(),
    imageUrl: Joi.string().trim().max(400).optional().allow(''),
  }),

  borrowItemRespond: Joi.object({
    action: Joi.string().valid('accept', 'decline').required(),
  }),

  // Close request
  closeRequest: Joi.object({
    wasResolved: Joi.boolean().required(),
    accountability: Joi.string()
      .valid(
        'arrived_completed', 'needed_more_time', 'stepped_away',
        'not_needed', 'other_option', 'concerned', 'completed_as_agreed'
      )
      .optional(),
    rating: Joi.alternatives().try(
      Joi.string().valid('good', 'okay', 'concern'),
      Joi.number().min(1).max(5)
    ).optional(),
    feedback: Joi.string().optional().allow(''),
  }),

  // Chat message (service validates text vs attachment)
  sendMessage: Joi.object({
    text: Joi.string().trim().max(4000).allow('').optional(),
    replyToId: Joi.string().optional().allow(null, ''),
    messageType: Joi.string().valid('text', 'image', 'location', 'audio', 'file').optional(),
    attachment: Joi.object({
      url: Joi.string().optional().allow(null, ''),
      mimeType: Joi.string().optional().allow(null, ''),
      fileName: Joi.string().optional().allow(null, ''),
      size: Joi.number().optional(),
      durationSec: Joi.number().optional(),
      lat: Joi.number().optional(),
      lng: Joi.number().optional(),
      address: Joi.string().optional().allow(null, ''),
    }).optional(),
  }),

  reactToMessage: Joi.object({
    emoji: Joi.string()
      .valid('❤️', '👍', '😂', '😮', '😢', '🙏')
      .required(),
  }),

  // Report
  createReport: Joi.object({
    reportedRequestId: Joi.string().optional(),
    reportedRequestType: Joi.string().valid('HelpRequest', 'PresenceRequest').optional(),
    reportedUserId: Joi.string().optional(),
    reporterRole: Joi.string().valid('requester', 'helper').optional(),
    category: Joi.string()
      .valid(
        'felt_uncomfortable', 'personal_boundaries_crossed',
        'misuse_of_platform', 'false_unnecessary_request', 'something_else'
      )
      .required(),
    details: Joi.string().trim().max(1000).optional().allow(''),
  }),
  updateReport: Joi.object({
    category: Joi.string()
      .valid(
        'felt_uncomfortable', 'personal_boundaries_crossed',
        'misuse_of_platform', 'false_unnecessary_request', 'something_else'
      )
      .optional(),
    details: Joi.string().trim().max(1000).optional().allow(''),
  }).or('category', 'details'),

  // Emergency contacts
  addEmergencyContact: Joi.object({
    contactName: Joi.string().trim().min(2).max(100).required(),
    phoneNumber: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({ 'string.pattern.base': 'Enter a valid 10-digit mobile number' }),
    relationship: Joi.string().trim().max(50).optional().allow(''),
    notifyOnEscalation: Joi.boolean().default(true),
  }),

  // Subscription
  updatePayment: Joi.object({
    paymentMethod: Joi.object({
      type: Joi.string().valid('upi', 'card').required(),
      upiId: Joi.string().when('type', {
        is: 'upi',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      cardLast4: Joi.string().length(4).when('type', {
        is: 'card',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }).required(),
  }),

  // Pagination query
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
}

module.exports = { validate, schemas }
