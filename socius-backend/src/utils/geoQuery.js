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
    logger.info(`[findNearbyAvailableUsers] START: lng=${lng}, lat=${lat}, radius=${radiusMeters}m, requireAvailability=${requireAvailability}`)
    
    // 1. Try REDIS first (Fastest)
    let redisUserIds = await getNearbyUserIds(lng, lat, radiusMeters);
    logger.info(`[findNearbyAvailableUsers] Redis returned ${redisUserIds?.length || 0} user IDs: ${JSON.stringify(redisUserIds)}`)

    if (redisUserIds && redisUserIds.length > 0) {
      logger.info(`Redis found ${redisUserIds.length} potential users nearby.`)

      // MongoDB does not reliably combine $in + $nin on _id in one object — filter excluded ids in JS.
      const excludeSet = new Set((excludeIds || []).map((id) => String(id)))
      const filteredRedisIds = redisUserIds.map((id) => String(id)).filter((id) => id && !excludeSet.has(id))

      if (filteredRedisIds.length === 0) {
        logger.info('[findNearbyAvailableUsers] Redis: all nearby ids were excluded; using MongoDB fallback')
      } else {
      const query = {
        _id: { $in: filteredRedisIds },
        accountStatus: { $in: ['active', 'pending_review', 'limited'] },
        isDeleted: false,
      }

      if (requireAvailability) {
        query.isAvailable = true
      }

      if (notificationPrefs && notificationPrefs.length > 0) {
        query.notificationPreferences = { $in: notificationPrefs }
      }

      logger.info(`[findNearbyAvailableUsers] Redis query: ${JSON.stringify(query)}`)
      
      const users = await User.find(query).limit(limit)
      logger.info(`[findNearbyAvailableUsers] Redis query returned ${users.length} users`)
      
      if (users.length > 0) {
        return users
      }
      }
    }

    // 2. Fallback to MongoDB (Reliable)
    logger.info(`[findNearbyAvailableUsers] Falling back to MongoDB...`)
    
    const query = {
      accountStatus: { $in: ['active', 'pending_review', 'limited'] },
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
    
    // Debug: Show all users' locations to verify distance
    if (users.length === 0) {
      logger.info(`[findNearbyAvailableUsers] DEBUG: No users found with $near query. Checking all users with locations...`)
      
      const allNearbyUsers = await User.find({
        accountStatus: { $in: ['active', 'pending_review', 'limited'] },
        isDeleted: false,
        location: { $exists: true, $ne: null }
      }).select('_id location fullName isAvailable accountStatus').limit(20)
      
      logger.info(`[findNearbyAvailableUsers] DEBUG: Found ${allNearbyUsers.length} total users with locations`)
      
      if (allNearbyUsers.length > 0) {
        logger.info(`[findNearbyAvailableUsers] DEBUG: All users with locations:`, 
          allNearbyUsers.map(u => ({
            id: u._id,
            name: u.fullName,
            loc: u.location?.coordinates,
            available: u.isAvailable,
            status: u.accountStatus
          }))
        )
        
        // Calculate actual distance for each user
        logger.info(`[findNearbyAvailableUsers] DEBUG: Distance calculation from [${lat}, ${lng}]:`)
        allNearbyUsers.forEach(u => {
          if (u.location?.coordinates) {
            const [userLng, userLat] = u.location.coordinates
            const dist = calculateDistance(lng, lat, userLng, userLat)
            const withinRadius = dist <= radiusMeters
            logger.info(`  - ${u.fullName} (${u._id}): ${dist}m ${withinRadius ? '✓' : '✗'} | available: ${u.isAvailable} | status: ${u.accountStatus}`)
          }
        })
        
        // Check without isAvailable filter
        if (requireAvailability) {
          const queryWithoutAvailability = {
            accountStatus: { $in: ['active', 'pending_review', 'limited'] },
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
          const usersWithoutAvailabilityCheck = await User.find(queryWithoutAvailability)
            .select('fullName profileImage location notificationPreferences isAvailable accountStatus role')
            .limit(limit)
          
          logger.info(`[findNearbyAvailableUsers] DEBUG: Users found WITHOUT isAvailable filter: ${usersWithoutAvailabilityCheck.length}`)
          if (usersWithoutAvailabilityCheck.length > 0) {
            logger.info(`[findNearbyAvailableUsers] DEBUG: Users without availability filter:`,
              usersWithoutAvailabilityCheck.map(u => ({
                id: u._id,
                name: u.fullName,
                available: u.isAvailable
              }))
            )
          }
        }
      } else {
        logger.info(`[findNearbyAvailableUsers] DEBUG: No users have location data at all!`)
      }
    }
    
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
