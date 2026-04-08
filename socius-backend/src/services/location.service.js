const { findNearbyAvailableUsers, calculateDistance } = require('../utils/geoQuery')
const { GEO, HELP_REQUEST_STATUS, PRESENCE_STATUS } = require('../utils/constants')
const logger = require('../utils/logger')
const HelpRequest = require('../models/HelpRequest')
const PresenceRequest = require('../models/PresenceRequest')

// Enhanced error codes for location service
const LOCATION_ERROR_CODES = {
  INVALID_COORDINATES: 'INVALID_COORDINATES',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NO_HELPERS_FOUND: 'NO_HELPERS_FOUND',
  INVALID_RADIUS: 'INVALID_RADIUS',
  INVALID_LIMIT: 'INVALID_LIMIT'
}

// Custom error creator for location service
const createLocationError = (message, code, statusCode = 400) => {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  return err
}

// Validation helpers
const validateCoordinates = (lng, lat) => {
  if (typeof lng !== 'number' || typeof lat !== 'number' || 
      isNaN(lng) || isNaN(lat) || 
      lat < -90 || lat > 90 || 
      lng < -180 || lng > 180) {
    throw createLocationError(
      'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180',
      LOCATION_ERROR_CODES.INVALID_COORDINATES,
      400
    )
  }
  return { lng, lat }
}

const validateRadius = (radiusMeters) => {
  if (typeof radiusMeters !== 'number' || radiusMeters <= 0 || radiusMeters > 50000) {
    throw createLocationError(
      'Invalid radius. Must be between 1 and 50000 meters',
      LOCATION_ERROR_CODES.INVALID_RADIUS,
      400
    )
  }
  return radiusMeters
}

const validateLimit = (limit) => {
  if (typeof limit !== 'number' || limit <= 0 || limit > 1000) {
    throw createLocationError(
      'Invalid limit. Must be between 1 and 1000',
      LOCATION_ERROR_CODES.INVALID_LIMIT,
      400
    )
  }
  return limit
}

const getBusyRequesterIdSet = async (candidateIds) => {
  const ids = (candidateIds || []).map((id) => String(id))
  if (ids.length === 0) return new Set()

  logger.info(`[getBusyRequesterIdSet] Checking ${ids.length} candidates: ${ids.join(', ')}`)

  const [busyHelp, busyPresence] = await Promise.all([
    HelpRequest.distinct('requesterId', {
      requesterId: { $in: ids },
      status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING, HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE] },
    }),
    PresenceRequest.distinct('requesterId', {
      requesterId: { $in: ids },
      status: { $in: [PRESENCE_STATUS.ACTIVE, PRESENCE_STATUS.HELPERS_NOTIFIED, PRESENCE_STATUS.HELPERS_ACCEPTED] },
    }),
  ])

  const busySet = new Set([...busyHelp.map(String), ...busyPresence.map(String)])
  
  logger.info(`[getBusyRequesterIdSet] Busy from HelpRequest: ${busyHelp.length} [${busyHelp.join(', ')}]`)
  logger.info(`[getBusyRequesterIdSet] Busy from PresenceRequest: ${busyPresence.length} [${busyPresence.join(', ')}]`)
  logger.info(`[getBusyRequesterIdSet] Total busy users: ${busySet.size} [${[...busySet].join(', ')}]`)

  // Check all requests for each busy user to understand why they're busy
  for (const userId of busySet) {
    const userRequests = await HelpRequest.find({ 
      requesterId: userId,
      status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING, HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE] }
    }).select('_id status category').lean()
    
    logger.info(`[getBusyRequesterIdSet] User ${userId} busy requests:`, userRequests.map(r => ({ id: r._id, status: r.status, category: r.category })))
  }

  return busySet
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
  try {
    logger.info(`[findHelpersForRequest] START: lng=${lng}, lat=${lat}, excludeIds=${excludeIds.join(',')}`)
    
    // Enhanced validation
    const validatedCoords = validateCoordinates(lng, lat)
    const validatedRadius = validateRadius(GEO.DEFAULT_RADIUS_METERS)
    
    logger.info(`[findHelpersForRequest] Using radius: ${validatedRadius}m`)
    
    let helpers = await findNearbyAvailableUsers({
      lng: validatedCoords.lng,
      lat: validatedCoords.lat,
      radiusMeters: validatedRadius,
      excludeIds,
      limit: 50,
      requireAvailability: true,
    })

    logger.info(`[findHelpersForRequest] Found ${helpers.length} nearby users BEFORE busy filter`)
    logger.info(`[findHelpersForRequest] Helper IDs before filter: ${helpers.map(h => String(h._id)).join(', ')}`)

    // Add distance to each helper
    helpers = helpers.map((h) => {
      const dist = calculateDistance(
        validatedCoords.lng,
        validatedCoords.lat,
        h.location.coordinates[0],
        h.location.coordinates[1]
      )
      return { ...h.toObject(), distanceMeters: dist }
    })

    try {
      const busySet = await getBusyRequesterIdSet(helpers.map((h) => h._id))
      logger.info(`[findHelpersForRequest] Busy users found: ${[...busySet].join(', ')}`)
      
      if (busySet.size > 0) {
        const beforeCount = helpers.length
        helpers = helpers.filter((h) => !busySet.has(String(h._id)))
        logger.info(`[findHelpersForRequest] Filtered out ${beforeCount - helpers.length} busy helpers, ${helpers.length} remaining`)
      }
    } catch (e) {
      logger.error('Failed to filter busy helpers', e)
    }

    logger.info(`[findHelpersForRequest] RETURNING ${helpers.length} helpers`)
    return helpers
  } catch (error) {
    logger.error('[findHelpersForRequest] ERROR:', error)
    throw error
  }
}

/**
 * Presence request ke liye nearby users dhundho (smaller radius, urgent)
 */
const findHelpersForPresence = async ({ lng, lat, maxHelpers = 3, excludeIds = [] }) => {
  try {
    // Enhanced validation
    const validatedCoords = validateCoordinates(lng, lat)
    const validatedRadius = validateRadius(GEO.PRESENCE_RADIUS_METERS)
    const validatedMaxHelpers = validateLimit(maxHelpers)
    
    let helpers = await findNearbyAvailableUsers({
      lng: validatedCoords.lng, 
      lat: validatedCoords.lat,
      radiusMeters: validatedRadius,
      excludeIds,
      limit: validatedMaxHelpers,
    })

    try {
      const busySet = await getBusyRequesterIdSet(helpers.map((h) => h._id))
      if (busySet.size > 0) {
        helpers = helpers.filter((h) => !busySet.has(String(h._id)))
      }
    } catch (e) {
      logger.error('Failed to filter busy helpers', e)
      // Continue with unfiltered helpers - don't fail the request
    }

    return helpers.map((h) => ({
      ...h.toObject(),
      distanceMeters: calculateDistance(
        validatedCoords.lng, 
        validatedCoords.lat,
        h.location.coordinates[0],
        h.location.coordinates[1]
      ),
    }))
  } catch (error) {
    if (error.code && error.code.startsWith('INVALID_')) {
      throw error // Re-throw validation errors
    }
    
    logger.error('Error in findHelpersForPresence:', error)
    throw createLocationError(
      'Failed to find helpers due to server error',
      LOCATION_ERROR_CODES.DATABASE_ERROR,
      500
    )
  }
}

module.exports = {
  findHelpersForRequest,
  findHelpersForPresence,
  getBusyRequesterIdSet,
  LOCATION_ERROR_CODES,
  createLocationError
}
