const User = require('../models/User')
const { isValidCoordinates } = require('../utils/geoQuery')
const logger = require('../utils/logger')
const { updateUserLocation, removeUserLocation } = require('../config/redis')

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

  if (user.accountStatus !== 'active') {
    const err = new Error('Account must be active to toggle availability')
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

  logger.info(`Availability toggled: ${userId} → ${isAvailable}`)
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

  // REDIS UPDATE
  updateUserLocation(userId, lng, lat).catch(e => logger.error('Redis location update failed', e))

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
