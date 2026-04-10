const User = require('../models/User')
const PresenceRequest = require('../models/PresenceRequest')
const PresenceMatch = require('../models/PresenceMatch')
const { isValidCoordinates } = require('../utils/geoQuery')
const logger = require('../utils/logger')
const { updateUserLocation, removeUserLocation, del } = require('../config/redis')
const { emitToUser } = require('../config/socket')
const { notifyMatchingHelpRequestsForHelper } = require('./helpRequest.service')

/**
 * Availability toggle karo
 */
const toggleAvailability = async (userId, { isAvailable, location }) => {
  const user = await User.findById(userId)

  if (!user || user.isDeleted) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  const status = user.accountStatus || 'active'
  const isAllowedStatus = ['active', 'pending_review', 'limited'].includes(status)

  const isActive = isAllowedStatus || user.isAdmin
  
  if (!isActive) {
    const err = new Error('Your account is not active. Please contact support.')
    err.statusCode = 403
    throw err
  }

  const updates = { isAvailable }

  // Available on karne pe location zaroori hai
  if (isAvailable) {
    let lng = location?.lng
    let lat = location?.lat

    if (!isValidCoordinates(lng, lat)) {
      const coords = user?.location?.coordinates
      const hasStored =
        !!user?.location?.updatedAt &&
        Array.isArray(coords) &&
        coords.length === 2 &&
        typeof coords[0] === 'number' &&
        typeof coords[1] === 'number'
      if (hasStored) {
        lng = coords[0]
        lat = coords[1]
      }
    }

    if (!isValidCoordinates(lng, lat)) {
      const err = new Error('Location required when turning availability on')
      err.statusCode = 400
      err.code = 'LOCATION_REQUIRED'
      throw err
    }

    updates.location = {
      type: 'Point',
      coordinates: [lng, lat],
      updatedAt: new Date(),
    }

    // REDIS UPDATE
    updateUserLocation(userId, lng, lat).catch(e => logger.error('Redis update failed', e))
  } else {
    // REDIS REMOVE
    removeUserLocation(userId).catch(e => logger.error('Redis remove failed', e))
  }

  await User.findByIdAndUpdate(userId, { $set: updates })
  del(`user:profile:${userId}`).catch(() => {})

  logger.info(`Availability toggled: ${userId} → ${isAvailable}`)

  if (isAvailable) {
    notifyMatchingHelpRequestsForHelper(userId).catch((e) =>
      logger.error('[availability] notifyMatchingHelpRequestsForHelper failed', e)
    )
  }

  try {
    const matches = await PresenceMatch.find({
      helperId: userId,
      status: { $in: ['alerted', 'accepted', 'en_route', 'arrived'] },
    })
      .select('presenceRequestId')
      .lean()

    const presenceIds = matches.map((m) => m?.presenceRequestId).filter(Boolean)
    if (presenceIds.length > 0) {
      const requests = await PresenceRequest.find({
        _id: { $in: presenceIds },
        status: { $in: ['active', 'helpers_notified', 'helpers_accepted'] },
      })
        .select('_id requesterId')
        .lean()

      requests.forEach((r) => {
        if (!r?.requesterId) return
        emitToUser(String(r.requesterId), 'presence:notified_availability_changed', {
          presenceRequestId: String(r._id),
          helperId: String(userId),
          isAvailable: !!isAvailable,
        })
      })
    }
  } catch (e) {
    logger.error('Failed to emit availability updates', e)
  }

  return { isAvailable, location: isAvailable ? location : null }
}

/**
 * Live location update karo (jab request active ho)
 * Sirf available users ke liye
 */
const updateLocation = async (userId, { lng, lat }) => {
  if (!isValidCoordinates(lng, lat)) {
    const err = new Error('Invalid coordinates')
    err.statusCode = 400
    throw err
  }

  await User.findByIdAndUpdate(userId, {
    $set: {
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        updatedAt: new Date(),
      },
    },
  })
  del(`user:profile:${userId}`).catch(() => {})

  // REDIS UPDATE
  updateUserLocation(userId, lng, lat).catch(e => logger.error('Redis location update failed', e))

  const u = await User.findById(userId).select('isAvailable').lean()
  if (u?.isAvailable) {
    notifyMatchingHelpRequestsForHelper(userId).catch((e) =>
      logger.error('[availability] notifyMatchingHelpRequestsForHelper (location) failed', e)
    )
  }

  return { updated: true }
}

/**
 * Availability status get karo
 */
const getAvailabilityStatus = async (userId) => {
  const user = await User.findById(userId).select('isAvailable location accountStatus')
  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  const hasValidLocation =
    user.location &&
    user.location.updatedAt &&
    Array.isArray(user.location.coordinates) &&
    user.location.coordinates.length === 2 &&
    typeof user.location.coordinates[0] === 'number' &&
    typeof user.location.coordinates[1] === 'number'

  return {
    isAvailable: user.isAvailable,
    accountStatus: user.accountStatus,
    locationUpdatedAt: user.location?.updatedAt || null,
    location: hasValidLocation
      ? {
        lng: user.location.coordinates[0],
        lat: user.location.coordinates[1],
      }
      : null,
  }
}

module.exports = {
  toggleAvailability,
  updateLocation,
  getAvailabilityStatus,
}
