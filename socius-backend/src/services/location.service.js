const { findNearbyAvailableUsers, calculateDistance } = require('../utils/geoQuery')
const { GEO } = require('../utils/constants')
const logger = require('../utils/logger')

/**
 * Help request ke liye nearby available users dhundho
 */
const findHelpersForRequest = async ({
  lng,
  lat,
  category,
  excludeIds = [],
}) => {
  // Logic: 
  // 1. Find nearby users (MUST BE AVAILABLE) - As per user request "ab jo isAvailable ho tabhi us ko HELP_REQUEST jaye"
  // 2. Filter by category if needed (but currently we want all nearby)
  
  // TODO: Add category-based filtering later if needed
  
  let helpers = await findNearbyAvailableUsers({
    lng,
    lat,
    radiusMeters: GEO.DEFAULT_RADIUS_METERS,
    excludeIds,
    limit: 50,
    requireAvailability: true, // Only available users should receive the request
  })

  // Add distance to each helper
  helpers = helpers.map((h) => {
    const dist = calculateDistance(
      lng,
      lat,
      h.location.coordinates[0],
      h.location.coordinates[1]
    )
    return { ...h.toObject(), distanceMeters: dist }
  })

  return helpers
}

/**
 * Presence request ke liye nearby users dhundho (smaller radius, urgent)
 */
const findHelpersForPresence = async ({ lng, lat, maxHelpers = 3, excludeIds = [] }) => {
  const helpers = await findNearbyAvailableUsers({
    lng, lat,
    radiusMeters: GEO.PRESENCE_RADIUS_METERS,
    excludeIds,
    limit: maxHelpers,
  })

  return helpers.map((h) => ({
    ...h.toObject(),
    distanceMeters: calculateDistance(
      lng, lat,
      h.location.coordinates[0],
      h.location.coordinates[1]
    ),
  }))
}

module.exports = {
  findHelpersForRequest,
  findHelpersForPresence,
}
