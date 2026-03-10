const PresenceRequest = require('../models/PresenceRequest')
const PresenceMatch = require('../models/PresenceMatch')
const { findHelpersForPresence } = require('./location.service')
const { sendPresenceAlarm } = require('./notification.service')
const { PRESENCE_STATUS, PRESENCE_MATCH_STATUS, AUTO_CLOSE } = require('../utils/constants')
const logger = require('../utils/logger')

/**
 * Presence request create karo + alarm bhejo
 */
const createPresenceRequest = async (requesterId, { situationType, description, location, maxHelpers }) => {
  logger.info(`--- NEW CODE RUNNING --- createPresenceRequest for ${requesterId}`)
  
  // Active presence request check
  const existing = await PresenceRequest.findOne({
    requesterId,
    status: { $in: ['active', 'helpers_notified', 'helpers_accepted'] },
  })

  if (existing) {
    const err = new Error('You already have an active presence request')
    err.statusCode = 409
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

  if (helpers.length === 0) {
    // Logic moved after creation
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

  if (helpers.length === 0) {
     const err = new Error('No helpers found within 500m')
     err.statusCode = 404
     err.code = 'NO_HELPERS_FOUND'
     err.data = { request }
     throw err
  }

  if (helpers.length > 0) {
    const helperIds = helpers.map((h) => h._id)

    // PresenceMatch entries banao
    const matchDocs = helpers.map((h) => ({
      presenceRequestId: request._id,
      helperId: h._id,
      status: PRESENCE_MATCH_STATUS.ALERTED,
      distanceMeters: h.distanceMeters,
      alertedAt: new Date(),
    }))
    await PresenceMatch.insertMany(matchDocs)

    // HIGH ALARM bhejo
    await sendPresenceAlarm(helperIds, request)

    await PresenceRequest.findByIdAndUpdate(request._id, {
      status: PRESENCE_STATUS.HELPERS_NOTIFIED,
      helpersNotifiedAt: new Date(),
      totalNotified: helpers.length,
    })
  }

  logger.info(`Presence request created: ${request._id} by ${requesterId}`)
  return request
}

/**
 * Helper ne presence accept kiya
 */
const acceptPresence = async (helperId, presenceRequestId) => {
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
  return { message: 'Declined' }
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

  const matches = await PresenceMatch.find({
    presenceRequestId: request._id,
    status: { $in: [PRESENCE_MATCH_STATUS.ACCEPTED, PRESENCE_MATCH_STATUS.EN_ROUTE, PRESENCE_MATCH_STATUS.ARRIVED] },
  }).populate('helperId', 'fullName location')

  return { request, helpers: matches }
}

module.exports = {
  createPresenceRequest,
  acceptPresence,
  declinePresence,
  cancelPresenceRequest,
  getActivePresenceRequest,
}
