const { rateLimit } = require('../config/redis')
const { tooMany } = require('../utils/response')
const logger = require('../utils/logger')

const formatWindow = (windowSeconds) => {
  const s = Number(windowSeconds) || 0
  if (s <= 0) return 'a moment'
  if (s % 3600 === 0) {
    const h = s / 3600
    return `${h} hour${h === 1 ? '' : 's'}`
  }
  if (s % 60 === 0) {
    const m = s / 60
    return `${m} minute${m === 1 ? '' : 's'}`
  }
  return `${s} second${s === 1 ? '' : 's'}`
}

/**
 * Rate limiter factory
 * @param {string} prefix - Redis key prefix
 * @param {number} maxRequests - max requests allowed
 * @param {number} windowSeconds - time window in seconds
 * @param {function} keyFn - function to get unique key from req
 */
const createRateLimiter = (prefix, maxRequests, windowSeconds, keyFn) => {
  return async (req, res, next) => {
    // Development mode me rate limit bypass karo
    if (process.env.NODE_ENV === 'development') {
      return next()
    }

    try {
      const key = `ratelimit:${prefix}:${keyFn(req)}`
      const result = await rateLimit(key, maxRequests, windowSeconds)

      // Headers set karo
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', result.remaining)

      if (!result.allowed) {
        res.setHeader('Retry-After', Number(windowSeconds) || 0)
        return tooMany(res, `Too many requests. Please try again after ${formatWindow(windowSeconds)}.`)
      }

      next()
    } catch (err) {
      // Redis down ho toh block mat karo — allow karo
      logger.error('rateLimiter error:', err)
      next()
    }
  }
}

// ─── Presets ──────────────────────────────────────────────

// OTP send — 5 requests per 10 min per phone
const otpLimiter = createRateLimiter(
  'otp',
  5,
  10 * 60,
  (req) => req.body?.phone || req.ip
)

// OTP verify — 5 attempts per 10 min per phone
const otpVerifyLimiter = createRateLimiter(
  'otp_verify',
  5,
  10 * 60,
  (req) => req.body?.phone || req.ip
)

// Help request create — 10 per hour per user
const helpRequestLimiter = createRateLimiter(
  'help_request',
  10,
  60 * 60,
  (req) => req.user?._id || req.ip
)

// Presence request — 5 per hour per user
const presenceLimiter = createRateLimiter(
  'presence',
  5,
  60 * 60,
  (req) => req.user?._id || req.ip
)

// General API — 100 per 15 min per IP
const generalLimiter = createRateLimiter(
  'general',
  100,
  15 * 60,
  (req) => req.ip
)

// Report submit — 10 per day per user
const reportLimiter = createRateLimiter(
  'report',
  10,
  24 * 60 * 60,
  (req) => req.user?._id || req.ip
)

module.exports = {
  otpLimiter,
  otpVerifyLimiter,
  helpRequestLimiter,
  presenceLimiter,
  generalLimiter,
  reportLimiter,
  createRateLimiter,
}
