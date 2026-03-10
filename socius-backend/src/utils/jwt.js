const jwt = require('jsonwebtoken')
const logger = require('./logger')

const SECRET = process.env.JWT_SECRET
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '730d'
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '730d'

/**
 * Access token generate karo
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

/**
 * Refresh token generate karo
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXPIRES_IN })
}

/**
 * Dono tokens ek saath generate karo
 */
const generateTokens = (user) => {
  const payload = {
    id: user._id,
    phone: user.phone,
    role: user.role,
    accountStatus: user.accountStatus,
  }

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken({ id: user._id }),
  }
}

/**
 * Token verify karo
 * Returns decoded payload ya null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET)
  } catch (err) {
    logger.warn(`JWT verify failed: ${err.message}`)
    return null
  }
}

/**
 * Token decode karo (verify ke bina — sirf read)
 */
const decodeToken = (token) => {
  return jwt.decode(token)
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  decodeToken,
}
