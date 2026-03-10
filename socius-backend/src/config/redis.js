const Redis = require('ioredis')
const logger = require('../utils/logger')

let client = null

const connectRedis = () => {
  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  client.on('connect', () => {
    logger.info('Redis connected')
  })

  client.on('error', (err) => {
    logger.error('Redis error:', err)
  })

  client.on('reconnecting', () => {
    logger.warn('Redis reconnecting...')
  })

  return client
}

const getRedis = () => {
  if (!client) throw new Error('Redis not initialized. Call connectRedis() first.')
  return client
}

// ─── Helper methods ───────────────────────────────────────

/**
 * Key set karo with expiry (seconds)
 */
const setEx = async (key, seconds, value) => {
  return getRedis().setex(key, seconds, JSON.stringify(value))
}

/**
 * Key get karo
 */
const get = async (key) => {
  const data = await getRedis().get(key)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return data
  }
}

/**
 * Key delete karo
 */
const del = async (key) => {
  return getRedis().del(key)
}

/**
 * Key exist karo check
 */
const exists = async (key) => {
  return getRedis().exists(key)
}

/**
 * Rate limit check — X requests per window
 * Returns { allowed: bool, remaining: number }
 */
const rateLimit = async (key, maxRequests, windowSeconds) => {
  const redis = getRedis()
  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, windowSeconds)
  }

  return {
    allowed: current <= maxRequests,
    remaining: Math.max(0, maxRequests - current),
    total: current,
  }
}

const disconnectRedis = async () => {
  if (client) {
    await client.quit()
    logger.info('Redis disconnected cleanly')
  }
}

// ─── Geo Helpers ──────────────────────────────────────────

/**
 * User location update karo Redis me (GeoSet)
 */
const updateUserLocation = async (userId, lng, lat) => {
  try {
    return await getRedis().geoadd('user_locations', lng, lat, userId.toString())
  } catch (err) {
    logger.error('Redis updateUserLocation error:', err)
  }
}

/**
 * Nearby users dhundho Redis se
 * Returns list of user IDs
 */
const getNearbyUserIds = async (lng, lat, radiusMeters) => {
  try {
    // GEORADIUS is compatible with older Redis, GEOSEARCH is for 6.2+
    // We'll use GEORADIUS for broad compatibility
    return await getRedis().georadius('user_locations', lng, lat, radiusMeters, 'm')
  } catch (err) {
    logger.error('Redis getNearbyUserIds error:', err)
    return null
  }
}

/**
 * User remove karo (jab offline ho)
 */
const removeUserLocation = async (userId) => {
  try {
    return await getRedis().zrem('user_locations', userId.toString())
  } catch (err) {
    logger.error('Redis removeUserLocation error:', err)
  }
}

// ─── Help Request Geo Helpers ─────────────────────────────

/**
 * Help Request location update karo Redis me
 */
const updateHelpRequestLocation = async (requestId, lng, lat) => {
  try {
    return await getRedis().geoadd('help_requests_locations', lng, lat, requestId.toString())
  } catch (err) {
    logger.error('Redis updateHelpRequestLocation error:', err)
  }
}

/**
 * Nearby help requests dhundho Redis se
 */
const getNearbyHelpRequestIds = async (lng, lat, radiusMeters) => {
  try {
    return await getRedis().georadius('help_requests_locations', lng, lat, radiusMeters, 'm')
  } catch (err) {
    logger.error('Redis getNearbyHelpRequestIds error:', err)
    return null
  }
}

/**
 * Help Request remove karo
 */
const removeHelpRequestLocation = async (requestId) => {
  try {
    return await getRedis().zrem('help_requests_locations', requestId.toString())
  } catch (err) {
    logger.error('Redis removeHelpRequestLocation error:', err)
  }
}

module.exports = {
  connectRedis,
  getRedis,
  setEx,
  get,
  del,
  exists,
  rateLimit,
  disconnectRedis,
  updateUserLocation,
  getNearbyUserIds,
  removeUserLocation,
  updateHelpRequestLocation,
  getNearbyHelpRequestIds,
  removeHelpRequestLocation,
}
