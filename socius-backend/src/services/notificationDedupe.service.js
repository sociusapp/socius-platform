const logger = require('../utils/logger')

/**
 * Redis SET NX for notification idempotency. Returns true if this is the first send for key.
 */
const shouldSendOnce = async (key, ttlSeconds = 3600) => {
  try {
    const { getRedis } = require('../config/redis')
    const redis = getRedis()
    const ok = await redis.set(`notif:dedupe:${key}`, '1', 'EX', ttlSeconds, 'NX')
    return ok === 'OK'
  } catch (e) {
    logger.warn(`notificationDedupe shouldSendOnce fail-open: ${e.message}`)
    return true
  }
}

module.exports = {
  shouldSendOnce,
}
