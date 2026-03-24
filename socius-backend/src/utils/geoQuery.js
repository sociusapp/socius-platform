const User = require('../models/User')
const { GEO, ACCOUNT_STATUS } = require('./constants')
const logger = require('./logger')
const { getNearbyUserIds } = require('../config/redis')

/**
 * Nearby available users dhundho
 * @param {number} lng - longitude
 * @param {number} lat - latitude
 * @param {number} radiusMeters - search radius
 * @param {string[]} notificationPrefs - filter by preferences (optional)
 * @param {string[]} excludeIds - user IDs to exclude
 * @returns User[]
 */
const findNearbyAvailableUsers = async ({
  lng,
  lat,
  radiusMeters = GEO.DEFAULT_RADIUS_METERS,
  notificationPrefs = [],
  excludeIds = [],
  limit = 20,
  requireAvailability = true, // Default to requiring available status
}) => {
  try {
    // 1. Try REDIS first (Fastest)
    let redisUserIds = await getNearbyUserIds(lng, lat, radiusMeters);

    if (redisUserIds && redisUserIds.length > 0) {
      logger.info(`Redis found ${redisUserIds.length} potential users nearby.`)

      const query = {
        _id: { $in: redisUserIds, $nin: excludeIds || [] },
        accountStatus: ACCOUNT_STATUS.ACTIVE,
        isDeleted: false,
      }

      if (requireAvailability) {
        query.isAvailable = true
      }

      if (notificationPrefs && notificationPrefs.length > 0) {
        query.notificationPreferences = { $in: notificationPrefs }
      }

      const users = await User.find(query).limit(limit)
      if (users.length > 0) {
        return users
      }
    }

    // 2. Fallback to MongoDB (Reliable)
    const query = {
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      isDeleted: false,
      _id: { $nin: excludeIds || [] },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radiusMeters,
        },
      },
    }

    // Only filter by availability if required
    if (requireAvailability) {
      query.isAvailable = true
    }

    // Notification preference filter (optional)
    if (notificationPrefs && notificationPrefs.length > 0) {
      query.notificationPreferences = { $in: notificationPrefs }
    }

    logger.info(`findNearbyAvailableUsers (MongoDB fallback) query: ${JSON.stringify(query)}`)

    const users = await User.find(query)
      .select('fullName profileImage location notificationPreferences isAvailable accountStatus role')
      .limit(limit)

    logger.info(`findNearbyAvailableUsers: Found ${users.length} users within ${radiusMeters}m of [${lat}, ${lng}]`)
    return users
  } catch (err) {
    logger.error('findNearbyAvailableUsers error:', err)
    throw err
  }
}

/**
 * Do points ke beech distance calculate karo (meters me)
 * Haversine formula
 */
const calculateDistance = (lng1, lat1, lng2, lat2) => {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c) // meters
}

/**
 * Coordinates validate karo
 */
const isValidCoordinates = (lng, lat) => {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  )
}

/**
 * Meters ko readable format me convert karo
 */
const formatDistance = (meters) => {
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

module.exports = {
  findNearbyAvailableUsers,
  calculateDistance,
  isValidCoordinates,
  formatDistance,
}
