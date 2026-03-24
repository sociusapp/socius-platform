const PresenceRequest = require('../models/PresenceRequest')
const PresenceMatch = require('../models/PresenceMatch')
const HelpRequest = require('../models/HelpRequest')
const Verification = require('../models/Verification')
const { emitToUser } = require('../config/socket')
const { findHelpersForPresence } = require('./location.service')
const { sendPresenceAlarm } = require('./notification.service')
const { PRESENCE_STATUS, PRESENCE_MATCH_STATUS, HELP_REQUEST_STATUS, GEO, AUTO_CLOSE } = require('../utils/constants')
const logger = require('../utils/logger')
const { logRequestAttempt } = require('./requestAttempt.service')

/**
 * Presence request create karo + alarm bhejo
 */
const createPresenceRequest = async (requesterId, { situationType, description, location, maxHelpers }, meta = null) => {
  logger.info(`--- NEW CODE RUNNING --- createPresenceRequest for ${requesterId}`)
  
  const activeHelp = await HelpRequest.findOne({
    requesterId,
    status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING, HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE] },
  }).select('_id status')

  if (activeHelp) {
    logRequestAttempt({
      requesterId,
      requestKind: 'presence_request',
      outcome: 'blocked_active_request',
      reason: 'active_help_request',
      situationType,
      description,
      location,
      radiusMeters: GEO.PRESENCE_RADIUS_METERS,
      meta,
    }).catch(() => {})
    const err = new Error('You already have an active request')
    err.statusCode = 409
    err.code = 'ACTIVE_REQUEST_EXISTS'
    throw err
  }

  // Active presence request check
  const existing = await PresenceRequest.findOne({
    requesterId,
    status: { $in: ['active', 'helpers_notified', 'helpers_accepted'] },
  })

  if (existing) {
    logRequestAttempt({
      requesterId,
      requestKind: 'presence_request',
      outcome: 'blocked_active_request',
      reason: 'active_presence_request',
      situationType,
      description,
      location,
      radiusMeters: GEO.PRESENCE_RADIUS_METERS,
      meta,
    }).catch(() => {})
    const err = new Error('You already have an active presence request')
    err.statusCode = 409
    err.code = 'ACTIVE_REQUEST_EXISTS'
    throw err
  }

  const autoCloseAt = new Date(Date.now() + AUTO_CLOSE.PRESENCE_REQUEST_MINUTES * 60 * 1000)

  // Nearby helpers dhundho
  const helpers = await findHelpersForPresence({
    lng: location.lng,
    lat: location.lat,
    maxHelpers: maxHelpers || 3,
    excludeIds: [requesterId],
  })

  logger.info(`Helpers found: ${helpers.length}`)

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

  const request = await PresenceRequest.create({
    requesterId,
    situationType,
    description: description || null,
    location: {
      type: 'Point',
      coordinates: [location.lng, location.lat],
      address: location.address || null,
    },
    maxHelpers: maxHelpers || 3,
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
}

/**
 * Helper ne presence accept kiya
 */
const acceptPresence = async (helperId, presenceRequestId) => {
  const busyHelpRequester = await HelpRequest.findOne({
    requesterId: helperId,
    status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING, HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE] },
  }).select('_id status')

  if (busyHelpRequester) {
    const err = new Error('You have an active request. Please close it first.')
    err.statusCode = 409
    throw err
  }

  const busyPresenceRequester = await PresenceRequest.findOne({
    requesterId: helperId,
    status: { $in: [PRESENCE_STATUS.ACTIVE, PRESENCE_STATUS.HELPERS_NOTIFIED, PRESENCE_STATUS.HELPERS_ACCEPTED] },
  }).select('_id status')

  if (busyPresenceRequester) {
    const err = new Error('You have an active request. Please close it first.')
    err.statusCode = 409
    throw err
  }

  const match = await PresenceMatch.findOne({
    presenceRequestId,
    helperId,
    status: PRESENCE_MATCH_STATUS.ALERTED,
  })

  if (!match) {
    const err = new Error('Presence request not found or already responded')
    err.statusCode = 404
    throw err
  }

  const request = await PresenceRequest.findById(presenceRequestId)
  if (!request || request.status === PRESENCE_STATUS.CLOSED) {
    const err = new Error('Presence request is no longer active')
    err.statusCode = 409
    throw err
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
  if (!['en_route', 'arrived'].includes(status)) {
    const err = new Error('Invalid status')
    err.statusCode = 400
    throw err
  }

  const match = await PresenceMatch.findOne({
    presenceRequestId,
    helperId,
    status: { $in: [PRESENCE_MATCH_STATUS.ACCEPTED, PRESENCE_MATCH_STATUS.EN_ROUTE] },
  })

  if (!match) {
    const err = new Error('No active presence match found')
    err.statusCode = 404
    throw err
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
}

/**
 * Cancel presence request (requester)
 */
const cancelPresenceRequest = async (requesterId, presenceRequestId) => {
  const request = await PresenceRequest.findOne({ _id: presenceRequestId, requesterId })

  if (!request) {
    const err = new Error('Request not found')
    err.statusCode = 404
    throw err
  }

  if (request.status === PRESENCE_STATUS.CLOSED) {
    const err = new Error('Request already closed')
    err.statusCode = 409
    throw err
  }

  request.status = PRESENCE_STATUS.CANCELLED
  request.cancelledAt = new Date()
  await request.save()

  await PresenceMatch.updateMany(
    { presenceRequestId, status: { $in: [PRESENCE_MATCH_STATUS.ALERTED, PRESENCE_MATCH_STATUS.ACCEPTED] } },
    { status: PRESENCE_MATCH_STATUS.DECLINED }
  )

  return request
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
  const request = await PresenceRequest.findById(presenceRequestId)
  if (!request) return null

  const isRequester = String(request.requesterId) === String(userId)
  const isHelper = await PresenceMatch.exists({ presenceRequestId, helperId: userId })
  if (!isRequester && !isHelper) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
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
  const request = await PresenceRequest.findById(presenceRequestId)

  if (!request) {
    const err = new Error('Presence request not found')
    err.statusCode = 404
    throw err
  }

  if (String(request.requesterId) !== String(userId)) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
  }

  if (request.status === 'closed' || request.status === 'cancelled') {
    const err = new Error('Cannot update a closed or cancelled request')
    err.statusCode = 400
    throw err
  }

  if (updates.description) {
    request.description = updates.description
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
}
