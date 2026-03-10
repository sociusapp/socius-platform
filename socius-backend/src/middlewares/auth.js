const { verifyToken } = require('../utils/jwt')
const { unauthorized, forbidden } = require('../utils/response')
const User = require('../models/User')
const logger = require('../utils/logger')

/**
 * JWT token verify karo — har protected route pe lagao
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Access token required')
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (!decoded) {
      return unauthorized(res, 'Invalid or expired token')
    }

    // Fresh user DB se lo (status change ho sakta hai)
    const user = await User.findById(decoded.id).select('-__v')

    if (!user || user.isDeleted) {
      return unauthorized(res, 'User not found')
    }

    if (user.accountStatus === 'suspended') {
      return forbidden(res, 'Your account has been suspended')
    }

    req.user = user
    next()
  } catch (err) {
    logger.error('authenticate middleware error:', err)
    return unauthorized(res, 'Authentication failed')
  }
}

/**
 * Sirf active account allow karo
 * pending_review aur limited users kuch cheezein nahi kar sakte
 */
const requireActive = (req, res, next) => {
  if (req.user.accountStatus !== 'active') {
    return forbidden(res, 'Your account is pending review or limited. This action is not available yet.')
  }
  next()
}

/**
 * Sirf verified identity wale users allow karo
 */
const requireVerified = (req, res, next) => {
  if (!req.user.isIdentityVerified) {
    return forbidden(res, 'Identity verification required for this action')
  }
  next()
}

module.exports = {
  authenticate,
  requireActive,
  requireVerified,
}
