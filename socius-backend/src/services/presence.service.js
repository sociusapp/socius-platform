const PresenceRequest = require('../models/PresenceRequest')
const PresenceMatch = require('../models/PresenceMatch')
const HelpRequest = require('../models/HelpRequest')
const Verification = require('../models/Verification')
const { emitToUser } = require('../config/socket')
const { findHelpersForPresence } = require('./location.service')
const { sendPresenceAlarm } = require('./notification.service')
const { PRESENCE_STATUS, PRESENCE_MATCH_STATUS, HELP_REQUEST_STATUS, GEO, AUTO_CLOSE } = require('../utils/constants')
const { findNearbyAvailableUsers } = require('../utils/geoQuery')
const logger = require('../utils/logger')
const { logRequestAttempt } = require('./requestAttempt.service')

// Enhanced error codes for better client handling
const PRESENCE_ERROR_CODES = {
  ACTIVE_REQUEST_EXISTS: 'ACTIVE_REQUEST_EXISTS',
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  INVALID_SITUATION_TYPE: 'INVALID_SITUATION_TYPE',
  REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
  REQUEST_CLOSED: 'REQUEST_CLOSED',
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  HELPER_BUSY: 'HELPER_BUSY',
  INVALID_STATUS: 'INVALID_STATUS',
  FORBIDDEN: 'FORBIDDEN',
  NO_HELPERS_FOUND: 'NO_HELPERS_FOUND',
  LOCATION_REQUIRED: 'LOCATION_REQUIRED',
  MAX_HELPERS_EXCEEDED: 'MAX_HELPERS_EXCEEDED',
  DESCRIPTION_TOO_LONG: 'DESCRIPTION_TOO_LONG'
}

// Custom error creator for presence flow
const createPresenceError = (message, code, statusCode = 400, data = null) => {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  err.data = data
  return err
}

// Validation helpers
const validateCoordinates = (location) => {
  if (!location || typeof location !== 'object') {
    throw createPresenceError(
      'Location is required and must be an object',
      PRESENCE_ERROR_CODES.LOCATION_REQUIRED,
      400
    )
  }
  
  const lat = location.lat || location.latitude
  const lng = location.lng || location.longitude
  
  if (lat === undefined || lng === undefined) {
    throw createPresenceError(
      'Both latitude and longitude are required',
      PRESENCE_ERROR_CODES.INVALID_COORDINATES,
      400
    )
  }
  
  if (typeof lat !== 'number' || typeof lng !== 'number' || 
      isNaN(lat) || isNaN(lng) || 
      lat < -90 || lat > 90 || 
      lng < -180 || lng > 180) {
    throw createPresenceError(
      'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180',
      PRESENCE_ERROR_CODES.INVALID_COORDINATES,
      400
    )
  }
  
  return { lat, lng }
}

const validateSituationType = (situationType) => {
  const validTypes = ['need_calm_presence', 'being_followed', 'feeling_unsafe', 'other']
  if (!situationType || !validTypes.includes(situationType)) {
    throw createPresenceError(
      `Invalid situation type. Must be one of: ${validTypes.join(', ')}`,
      PRESENCE_ERROR_CODES.INVALID_SITUATION_TYPE,
      400
    )
  }
  return situationType
}

const validateDescription = (description) => {
  if (description && typeof description !== 'string') {
    throw createPresenceError(
      'Description must be a string',
      PRESENCE_ERROR_CODES.DESCRIPTION_TOO_LONG,
      400
    )
  }
  
  if (description && description.length > 300) {
    throw createPresenceError(
      'Description must be less than 300 characters',
      PRESENCE_ERROR_CODES.DESCRIPTION_TOO_LONG,
      400
    )
  }
  
  return description || null
}

const validateMaxHelpers = (maxHelpers) => {
  if (maxHelpers !== undefined) {
    if (typeof maxHelpers !== 'number' || maxHelpers < 2 || maxHelpers > 5) {
      throw createPresenceError(
        'Max helpers must be between 2 and 5',
        PRESENCE_ERROR_CODES.MAX_HELPERS_EXCEEDED,
        400
      )
    }
  }
  return maxHelpers || 3
}

/**
 * Presence request create karo + alarm bhejo
 */
const createPresenceRequest = async (requesterId, { situationType, description, location, maxHelpers }, meta = null) => {
  try {
    logger.info(`--- NEW CODE RUNNING --- createPresenceRequest for ${requesterId}`)
    
    // Enhanced validation
    const validatedSituationType = validateSituationType(situationType)
    const validatedDescription = validateDescription(description)
    const validatedLocation = validateCoordinates(location)
    const validatedMaxHelpers = validateMaxHelpers(maxHelpers)
    
    // Check for active help request
    const activeHelp = await HelpRequest.findOne({
      requesterId,
      status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING, HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE] },
    }).select('_id status')

    if (activeHelp) {
      await logRequestAttempt({
        requesterId,
        requestKind: 'presence_request',
        outcome: 'blocked_active_request',
        reason: 'active_help_request',
        situationType: validatedSituationType,
        description: validatedDescription,
        location: validatedLocation,
        radiusMeters: GEO.PRESENCE_RADIUS_METERS,
        meta,
      }).catch(() => {})
      throw createPresenceError(
        'You already have an active help request. Please close it first.',
        PRESENCE_ERROR_CODES.ACTIVE_REQUEST_EXISTS,
        409
      )
    }

    // Check for active presence request
    const existing = await PresenceRequest.findOne({
      requesterId,
      status: { $in: ['active', 'helpers_notified', 'helpers_accepted'] },
    })

    if (existing) {
      await logRequestAttempt({
        requesterId,
        requestKind: 'presence_request',
        outcome: 'blocked_active_request',
        reason: 'active_presence_request',
        situationType: validatedSituationType,
        description: validatedDescription,
        location: validatedLocation,
        radiusMeters: GEO.PRESENCE_RADIUS_METERS,
        meta,
      }).catch(() => {})
      throw createPresenceError(
        'You already have an active presence request. Please close it first.',
        PRESENCE_ERROR_CODES.ACTIVE_REQUEST_EXISTS,
        409
      )
    }

    const autoCloseAt = new Date(Date.now() + AUTO_CLOSE.PRESENCE_REQUEST_MINUTES * 60 * 1000)

    // Find nearby helpers with better error handling
    let helpers = []
    try {
      helpers = await findHelpersForPresence({
        lng: validatedLocation.lng,
        lat: validatedLocation.lat,
        maxHelpers: validatedMaxHelpers,
        excludeIds: [requesterId],
      })
      logger.info(`Helpers found: ${helpers.length}`)
    } catch (error) {
      logger.error('Error finding helpers for presence:', error)
      // Continue with empty helpers array - don't fail the request
    }

  let helperAvailabilityHint = null
  let attemptId = null
  if (helpers.length === 0) {
    try {
      const candidatesExcludingSelf = await findNearbyAvailableUsers({
        lng: location.lng,
        lat: location.lat,
        radiusMeters: GEO.PRESENCE_RADIUS_METERS,
        excludeIds: [requesterId],
        limit: 20,
        requireAvailability: true,
      })
      const candidatesIncludingSelf = await findNearbyAvailableUsers({
        lng: location.lng,
        lat: location.lat,
        radiusMeters: GEO.PRESENCE_RADIUS_METERS,
        excludeIds: [],
        limit: 5,
        requireAvailability: true,
      })

      if (candidatesIncludingSelf.length > 0 && candidatesExcludingSelf.length === 0) {
        helperAvailabilityHint = 'only_self_available'
      } else if (candidatesExcludingSelf.length > 0) {
        helperAvailabilityHint = 'helpers_busy_or_ineligible'
      } else {
        helperAvailabilityHint = 'no_helpers_in_radius'
      }
    } catch (e) {
      helperAvailabilityHint = 'unknown'
    }

    try {
      const attempt = await logRequestAttempt({
        requesterId,
        requestKind: 'presence_request',
        outcome: 'no_helpers_found',
        reason: 'no_helpers_in_radius',
        situationType,
        description,
        location,
        radiusMeters: GEO.PRESENCE_RADIUS_METERS,
        helpersFound: 0,
        meta,
      })
      attemptId = attempt?._id ? String(attempt._id) : null
    } catch (e) { }
  }

    // Create presence request with validated data
    const request = await PresenceRequest.create({
      requesterId,
      situationType: validatedSituationType,
      description: validatedDescription,
      location: {
        type: 'Point',
        coordinates: [validatedLocation.lng, validatedLocation.lat],
        address: location.address || null,
      },
      maxHelpers: validatedMaxHelpers,
      status: PRESENCE_STATUS.ACTIVE,
      autoCloseScheduledAt: autoCloseAt,
    })

  // Populate requester info for notification
  await request.populate('requesterId', 'fullName firstName lastName')

  let deliveredNotifiedCount = 0
  if (helpers.length > 0) {
    const helperIds = helpers.map((h) => String(h._id))

    // Pass distance info if available
    const alarmResult = await sendPresenceAlarm(helperIds, request, helpers)
    const deliveredIds = Array.isArray(alarmResult?.deliveredHelperIds) ? alarmResult.deliveredHelperIds : []
    const deliveredSet = new Set(deliveredIds.map((id) => String(id)))

    const deliveredHelpers = helpers.filter((h) => deliveredSet.has(String(h._id)))
    deliveredNotifiedCount = deliveredHelpers.length

    if (deliveredHelpers.length > 0) {
      const matchDocs = deliveredHelpers.map((h) => ({
        presenceRequestId: request._id,
        helperId: h._id,
        status: PRESENCE_MATCH_STATUS.ALERTED,
        distanceMeters: h.distanceMeters,
        alertedAt: new Date(),
      }))
      await PresenceMatch.insertMany(matchDocs)

      await PresenceRequest.findByIdAndUpdate(request._id, {
        status: PRESENCE_STATUS.HELPERS_NOTIFIED,
        helpersNotifiedAt: new Date(),
        totalNotified: deliveredHelpers.length,
      })

      try {
        emitToUser(String(requesterId), 'presence:notified', {
          presenceRequestId: String(request._id),
          totalNotified: deliveredHelpers.length,
        })
      } catch (e) {
        logger.error('presence:notified emit failed', e)
      }
    } else {
      await PresenceRequest.findByIdAndUpdate(request._id, {
        totalNotified: 0,
      })
      helperAvailabilityHint = helperAvailabilityHint || 'no_active_devices'
    }
  }

  logger.info(`Presence request created: ${request._id} by ${requesterId}`)
  return {
    request,
    noHelpersFound: deliveredNotifiedCount === 0,
    helperAvailabilityHint,
    attemptId,
  }
  } catch (error) {
    logger.error('Error in createPresenceRequest:', error)
    throw error
  }
}

/**
 * Helper ne presence accept kiya
 */
const acceptPresence = async (helperId, presenceRequestId) => {
  try {
    // Validate presence request ID
    if (!presenceRequestId || presenceRequestId.length !== 24) {
      throw createPresenceError(
        'Invalid presence request ID',
        PRESENCE_ERROR_CODES.REQUEST_NOT_FOUND,
        404
      )
    }
    
    // Check if helper has active help request
    const busyHelpRequester = await HelpRequest.findOne({
      requesterId: helperId,
      status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING, HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE] },
    }).select('_id status')

    if (busyHelpRequester) {
      throw createPresenceError(
        'You have an active help request. Please close it first.',
        PRESENCE_ERROR_CODES.HELPER_BUSY,
        409
      )
    }

    // Check if helper has active presence request
    const busyPresenceRequester = await PresenceRequest.findOne({
      requesterId: helperId,
      status: { $in: [PRESENCE_STATUS.ACTIVE, PRESENCE_STATUS.HELPERS_NOTIFIED, PRESENCE_STATUS.HELPERS_ACCEPTED] },
    }).select('_id status')

    if (busyPresenceRequester) {
      throw createPresenceError(
        'You have an active presence request. Please close it first.',
        PRESENCE_ERROR_CODES.HELPER_BUSY,
        409
      )
    }

    // Find the match
    const match = await PresenceMatch.findOne({
      presenceRequestId,
      helperId,
      status: PRESENCE_MATCH_STATUS.ALERTED,
    })

    if (!match) {
      throw createPresenceError(
        'Presence request not found or already responded',
        PRESENCE_ERROR_CODES.MATCH_NOT_FOUND,
        404
      )
    }

    // Check if request is still active
    const request = await PresenceRequest.findById(presenceRequestId)
    if (!request) {
      throw createPresenceError(
        'Presence request not found',
        PRESENCE_ERROR_CODES.REQUEST_NOT_FOUND,
        404
      )
    }
    
    if (request.status === PRESENCE_STATUS.CLOSED || request.status === PRESENCE_STATUS.CANCELLED) {
      throw createPresenceError(
        'Presence request is no longer active',
        PRESENCE_ERROR_CODES.REQUEST_CLOSED,
        409
      )
    }

  // Accept karo
  match.status = PRESENCE_MATCH_STATUS.ACCEPTED
  match.acceptedAt = new Date()
  match.respondedAt = new Date()
  await match.save()

  // Total accepted count update karo
  const acceptedCount = await PresenceMatch.countDocuments({
    presenceRequestId,
    status: { $in: [PRESENCE_MATCH_STATUS.ACCEPTED, PRESENCE_MATCH_STATUS.EN_ROUTE, PRESENCE_MATCH_STATUS.ARRIVED] },
  })

  await PresenceRequest.findByIdAndUpdate(presenceRequestId, {
    status: PRESENCE_STATUS.HELPERS_ACCEPTED,
    totalAccepted: acceptedCount,
  })

  try {
    emitToUser(String(request.requesterId), 'presence:accepted', {
      presenceRequestId: String(request._id),
      helperId: String(helperId),
      status: 'accepted',
    })

    // Push notification for background/lockscreen
    const helper = await require('../models/User').findById(helperId).select('fullName')
    const { sendMatchedNotification } = require('./notification.service')
    await sendMatchedNotification(String(request.requesterId), helper?.fullName || 'Someone', String(request._id))
  } catch (e) {
    logger.error('presence:accepted notifications failed', e)
  }

  return { request, match }
  } catch (error) {
    logger.error('Error in acceptPresence:', error)
    throw error
  }
}

/**
 * Helper ne decline kiya
 */
const declinePresence = async (helperId, presenceRequestId) => {
  await PresenceMatch.findOneAndUpdate(
    { presenceRequestId, helperId, status: PRESENCE_MATCH_STATUS.ALERTED },
    { status: PRESENCE_MATCH_STATUS.DECLINED, respondedAt: new Date() }
  )
  try {
    const req = await PresenceRequest.findById(presenceRequestId).select('requesterId').lean()
    if (req?.requesterId) {
      emitToUser(String(req.requesterId), 'presence:declined', {
        presenceRequestId: String(presenceRequestId),
        helperId: String(helperId),
        status: 'declined',
      })
    }
  } catch (e) {
    logger.error('presence:declined notifications failed', e)
  }
  return { message: 'Declined' }
}

/**
 * Helper status update (en_route, arrived)
 */
const updatePresenceMatchStatus = async (helperId, presenceRequestId, status) => {
  try {
    // Validate status
    const validStatuses = ['en_route', 'arrived']
    if (!validStatuses.includes(status)) {
      throw createPresenceError(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        PRESENCE_ERROR_CODES.INVALID_STATUS,
        400
      )
    }

    // Validate presence request ID
    if (!presenceRequestId || presenceRequestId.length !== 24) {
      throw createPresenceError(
        'Invalid presence request ID',
        PRESENCE_ERROR_CODES.REQUEST_NOT_FOUND,
        404
      )
    }

    // Find the match
    const match = await PresenceMatch.findOne({
      presenceRequestId,
      helperId,
      status: { $in: [PRESENCE_MATCH_STATUS.ACCEPTED, PRESENCE_MATCH_STATUS.EN_ROUTE] },
    })

    if (!match) {
      throw createPresenceError(
        'No active presence match found',
        PRESENCE_ERROR_CODES.MATCH_NOT_FOUND,
        404
      )
    }

  match.status = status
  if (status === 'arrived') {
    match.arrivedAt = new Date()
  }
  await match.save()

  try {
    const request = await PresenceRequest.findById(presenceRequestId).select('requesterId').lean()
    if (request?.requesterId) {
      // Emit to requester
      emitToUser(String(request.requesterId), 'presence:status_updated', {
        presenceRequestId: String(presenceRequestId),
        helperId: String(helperId),
        status,
      })
      
      // Emit to room
      const { emitToRoom } = require('../config/socket')
      emitToRoom(`presence:${presenceRequestId}`, 'presence:status_updated', {
        presenceRequestId: String(presenceRequestId),
        helperId: String(helperId),
        status,
      })
    }
  } catch (e) {
    logger.error('presence:status_updated notifications failed', e)
  }

  return match
  } catch (error) {
    logger.error('Error in updatePresenceMatchStatus:', error)
    throw error
  }
}

/**
 * Cancel presence request (requester)
 */
const cancelPresenceRequest = async (requesterId, presenceRequestId) => {
  try {
    // Validate presence request ID
    if (!presenceRequestId || presenceRequestId.length !== 24) {
      throw createPresenceError(
        'Invalid presence request ID',
        PRESENCE_ERROR_CODES.REQUEST_NOT_FOUND,
        404
      )
    }
    
    const request = await PresenceRequest.findOne({ _id: presenceRequestId, requesterId })

    if (!request) {
      throw createPresenceError(
        'Request not found or you do not have permission to cancel it',
        PRESENCE_ERROR_CODES.REQUEST_NOT_FOUND,
        404
      )
    }

    if (request.status === PRESENCE_STATUS.CLOSED) {
      throw createPresenceError(
        'Request already closed',
        PRESENCE_ERROR_CODES.REQUEST_CLOSED,
        409
      )
    }
    
    if (request.status === PRESENCE_STATUS.CANCELLED) {
      throw createPresenceError(
        'Request already cancelled',
        PRESENCE_ERROR_CODES.REQUEST_CLOSED,
        409
      )
    }

  request.status = PRESENCE_STATUS.CANCELLED
  request.cancelledAt = new Date()
  await request.save()

  await PresenceMatch.updateMany(
    { presenceRequestId, status: { $in: [PRESENCE_MATCH_STATUS.ALERTED, PRESENCE_MATCH_STATUS.ACCEPTED] } },
    { status: PRESENCE_MATCH_STATUS.DECLINED }
  )

  return request
  } catch (error) {
    logger.error('Error in cancelPresenceRequest:', error)
    throw error
  }
}

/**
 * Active presence request get karo
 */
const getActivePresenceRequest = async (userId) => {
  const request = await PresenceRequest.findOne({
    requesterId: userId,
    status: { $in: ['active', 'helpers_notified', 'helpers_accepted'] },
  })

  if (!request) return null

  const [acceptedMatches, notifiedMatches] = await Promise.all([
    PresenceMatch.find({
      presenceRequestId: request._id,
      status: { $in: [PRESENCE_MATCH_STATUS.ACCEPTED, PRESENCE_MATCH_STATUS.EN_ROUTE, PRESENCE_MATCH_STATUS.ARRIVED] },
    })
      .populate('helperId', 'fullName profileImage location isAvailable role')
      .lean(),
    PresenceMatch.find({ presenceRequestId: request._id })
      .populate('helperId', 'fullName profileImage location isAvailable role')
      .sort({ alertedAt: -1 })
      .lean(),
  ])

  const helperIds = notifiedMatches
    .map((m) => m?.helperId?._id)
    .filter(Boolean)
    .map((id) => String(id))

  const verifications = await Verification.find({
    userId: { $in: helperIds },
    status: 'approved',
  })
    .select('userId status selfie')
    .lean()

  const verificationMap = new Map()
  verifications.forEach((v) => {
    verificationMap.set(String(v.userId), { status: v.status, selfie: v.selfie })
  })

  const withVerification = (match) => {
    const helper = match?.helperId
    if (!helper) return match
    const v = verificationMap.get(String(helper._id))
    if (!v) return match
    return { ...match, helperId: { ...helper, verification: v } }
  }

  const acceptedAvailable = acceptedMatches.filter((m) => m?.helperId && m.helperId.isAvailable === true)
  const notifiedAvailable = notifiedMatches.filter((m) => m?.helperId && m.helperId.isAvailable === true)

  return {
    request,
    helpers: acceptedAvailable.map(withVerification),
    notifiedHelpers: notifiedAvailable.map(withVerification),
    stats: {
      deliveredNotifiedCount: request?.totalNotified || notifiedMatches.length,
      availableNotifiedCount: notifiedAvailable.length,
      acceptedCount: request?.totalAccepted || acceptedMatches.length,
    },
  }
}

const getPresenceById = async (userId, presenceRequestId) => {
  try {
    // Validate presence request ID
    if (!presenceRequestId || presenceRequestId.length !== 24) {
      throw createPresenceError(
        'Invalid presence request ID',
        PRESENCE_ERROR_CODES.REQUEST_NOT_FOUND,
        404
      )
    }
    
    const request = await PresenceRequest.findById(presenceRequestId)
    if (!request) {
      throw createPresenceError(
        'Presence request not found',
        PRESENCE_ERROR_CODES.REQUEST_NOT_FOUND,
        404
      )
    }

    const isRequester = String(request.requesterId) === String(userId)
    const isHelper = await PresenceMatch.exists({ presenceRequestId, helperId: userId })
    
    if (!isRequester && !isHelper) {
      throw createPresenceError(
        'You do not have permission to view this request',
        PRESENCE_ERROR_CODES.FORBIDDEN,
        403
      )
    }

  const [acceptedMatches, notifiedMatches] = await Promise.all([
    PresenceMatch.find({
      presenceRequestId,
      status: { $in: [PRESENCE_MATCH_STATUS.ACCEPTED, PRESENCE_MATCH_STATUS.EN_ROUTE, PRESENCE_MATCH_STATUS.ARRIVED] },
    })
      .populate('helperId', 'fullName profileImage location isAvailable role')
      .lean(),
    PresenceMatch.find({ presenceRequestId })
      .populate('helperId', 'fullName profileImage location isAvailable role')
      .lean(),
  ])

  const helperIds = [
    ...acceptedMatches.map((m) => m?.helperId?._id),
    ...notifiedMatches.map((m) => m?.helperId?._id),
  ]
    .filter(Boolean)
    .map((id) => String(id))

  const verifications = await Verification.find({
    userId: { $in: helperIds },
    status: 'approved',
  })
    .select('userId status selfie')
    .lean()

  const verificationMap = new Map()
  verifications.forEach((v) => {
    verificationMap.set(String(v.userId), { status: v.status, selfie: v.selfie })
  })

  const withVerification = (match) => {
    const helper = match?.helperId
    if (!helper) return match
    const v = verificationMap.get(String(helper._id))
    if (!v) return match
    return { ...match, helperId: { ...helper, verification: v } }
  }

  const acceptedAvailable = acceptedMatches.filter((m) => m?.helperId && m.helperId.isAvailable === true)
  const notifiedAvailable = notifiedMatches.filter((m) => m?.helperId && m.helperId.isAvailable === true)

  return {
    request,
    helpers: acceptedAvailable.map(withVerification),
    notifiedHelpers: notifiedAvailable.map(withVerification),
    stats: {
      deliveredNotifiedCount: request?.totalNotified || notifiedMatches.length,
      availableNotifiedCount: notifiedAvailable.length,
      acceptedCount: request?.totalAccepted || acceptedMatches.length,
    },
  }
  } catch (error) {
    logger.error('Error in getPresenceById:', error)
    throw error
  }
}

/**
 * Nearby presence requests dhundho jo active/notified hain
 */
const getNearbyPresenceRequests = async (userId, coords = null) => {
  let lng, lat;

  if (coords && (coords.lat !== undefined || coords.latitude !== undefined) && (coords.lng !== undefined || coords.longitude !== undefined)) {
    lng = coords.lng !== undefined ? coords.lng : coords.longitude;
    lat = coords.lat !== undefined ? coords.lat : coords.latitude;
  } else {
    const User = require('../models/User')
    const user = await User.findById(userId).select('location')
    if (!user || !user.location || !user.location.coordinates) {
      return []
    }
    lng = user.location.coordinates[0];
    lat = user.location.coordinates[1];
  }

  if (lng === undefined || lat === undefined || isNaN(parseFloat(lng)) || isNaN(parseFloat(lat))) {
    return []
  }

  lng = parseFloat(lng);
  lat = parseFloat(lat);

  const { calculateDistance } = require('../utils/geoQuery')

  const query = {
    requesterId: { $ne: userId },
    status: { $in: [PRESENCE_STATUS.ACTIVE, PRESENCE_STATUS.HELPERS_NOTIFIED, PRESENCE_STATUS.HELPERS_ACCEPTED] },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: GEO.PRESENCE_RADIUS_METERS,
      },
    },
  }

  try {
    const requests = await PresenceRequest.find(query)
      .populate('requesterId', 'fullName profileImage')
      .limit(20)

    const filtered = []
    for (const req of requests) {
      const match = await PresenceMatch.findOne({ presenceRequestId: req._id, helperId: userId })
      if (match && ['accepted', 'completed', 'cancelled', 'declined'].includes(match.status)) continue

      const reqObj = req.toObject()
      reqObj.distanceMeters = calculateDistance(lng, lat, req.location.coordinates[0], req.location.coordinates[1])
      filtered.push(reqObj)
    }

    return filtered
  } catch (err) {
    logger.error('Error in getNearbyPresenceRequests:', err)
    return []
  }
}

/**
 * Presence request update karo (sirf description/situation ke liye)
 */
const updatePresenceRequest = async (userId, presenceRequestId, updates) => {
  try {
    // Validate presence request ID
    if (!presenceRequestId || presenceRequestId.length !== 24) {
      throw createPresenceError(
        'Invalid presence request ID',
        PRESENCE_ERROR_CODES.REQUEST_NOT_FOUND,
        404
      )
    }
    
    const request = await PresenceRequest.findById(presenceRequestId)

    if (!request) {
      throw createPresenceError(
        'Presence request not found',
        PRESENCE_ERROR_CODES.REQUEST_NOT_FOUND,
        404
      )
    }

    if (String(request.requesterId) !== String(userId)) {
      throw createPresenceError(
        'You do not have permission to update this request',
        PRESENCE_ERROR_CODES.FORBIDDEN,
        403
      )
    }

    if (request.status === 'closed' || request.status === 'cancelled') {
      throw createPresenceError(
        'Cannot update a closed or cancelled request',
        PRESENCE_ERROR_CODES.REQUEST_CLOSED,
        400
      )
    }

    // Validate and update description
    if (updates.description !== undefined) {
      const validatedDescription = validateDescription(updates.description)
      request.description = validatedDescription
    }
    
    // Validate and update situation type if provided
    if (updates.situationType !== undefined) {
      const validatedSituationType = validateSituationType(updates.situationType)
      request.situationType = validatedSituationType
    }

  await request.save()

  try {
    // Emit to room
    const { emitToRoom } = require('../config/socket')
    emitToRoom(`presence:${presenceRequestId}`, 'presence:status_updated', {
      presenceRequestId: String(presenceRequestId),
      description: request.description,
      type: 'description_updated'
    })
  } catch (e) {
    logger.error('presence:description_updated emit failed', e)
  }

  return request
  } catch (error) {
    logger.error('Error in updatePresenceRequest:', error)
    throw error
  }
}

module.exports = {
  createPresenceRequest,
  acceptPresence,
  declinePresence,
  updatePresenceMatchStatus,
  cancelPresenceRequest,
  getActivePresenceRequest,
  getPresenceById,
  getNearbyPresenceRequests,
  updatePresenceRequest,
  PRESENCE_ERROR_CODES,
  createPresenceError
}
