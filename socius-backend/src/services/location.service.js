const { findNearbyAvailableUsers, calculateDistance } = require('../utils/geoQuery')
const { GEO, HELP_REQUEST_STATUS, PRESENCE_STATUS } = require('../utils/constants')
const logger = require('../utils/logger')
const HelpRequest = require('../models/HelpRequest')
const PresenceRequest = require('../models/PresenceRequest')

const getBusyRequesterIdSet = async (candidateIds) => {
  const ids = (candidateIds || []).map((id) => String(id))
  if (ids.length === 0) return new Set()

  const [busyHelp, busyPresence] = await Promise.all([
    HelpRequest.distinct('requesterId', {
      requesterId: { $in: ids },
      status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING, HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE, HELP_REQUEST_STATUS.CLOSING] },
    }),
    PresenceRequest.distinct('requesterId', {
      requesterId: { $in: ids },
      status: { $in: [PRESENCE_STATUS.ACTIVE, PRESENCE_STATUS.HELPERS_NOTIFIED, PRESENCE_STATUS.HELPERS_ACCEPTED] },
    }),
  ])

  return new Set([...busyHelp.map(String), ...busyPresence.map(String)])
}

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

  try {
    const busySet = await getBusyRequesterIdSet(helpers.map((h) => h._id))
    if (busySet.size > 0) {
      helpers = helpers.filter((h) => !busySet.has(String(h._id)))
    }
  } catch (e) {
    logger.error('Failed to filter busy helpers', e)
  }

  return helpers
}

/**
 * Presence request ke liye nearby users dhundho (smaller radius, urgent)
 */
const findHelpersForPresence = async ({ lng, lat, maxHelpers = 3, excludeIds = [] }) => {
  let helpers = await findNearbyAvailableUsers({
    lng, lat,
    radiusMeters: GEO.PRESENCE_RADIUS_METERS,
    excludeIds,
    limit: maxHelpers,
  })

  try {
    const busySet = await getBusyRequesterIdSet(helpers.map((h) => h._id))
    if (busySet.size > 0) {
      helpers = helpers.filter((h) => !busySet.has(String(h._id)))
    }
  } catch (e) {
    logger.error('Failed to filter busy helpers', e)
  }

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
