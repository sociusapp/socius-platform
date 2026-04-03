const { verifyToken } = require('../utils/jwt')
const { unauthorized, forbidden } = require('../utils/response')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const logger = require('../utils/logger')

// Enhanced error codes for authentication
const AUTH_ERROR_CODES = {
  NO_TOKEN: 'NO_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  ACCOUNT_PENDING: 'ACCOUNT_PENDING',
  VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE'
}

// Custom error creator for authentication
const createAuthError = (message, code, statusCode = 401) => {
  const err = new Error(message)
  err.code = code
  err.statusCode = statusCode
  return err
}

/**
 * JWT token verify karo — har protected route pe lagao
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return unauthorized(res, 'Authentication token is required', AUTH_ERROR_CODES.NO_TOKEN)
    }

    if (!authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Invalid token format. Must be "Bearer <token>"', AUTH_ERROR_CODES.INVALID_TOKEN)
    }

    const token = authHeader.substring(7)
    
    if (!token) {
      return unauthorized(res, 'Authentication token is required', AUTH_ERROR_CODES.NO_TOKEN)
    }

    // Verify JWT token
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return unauthorized(res, 'Your session has expired. Please login again.', AUTH_ERROR_CODES.TOKEN_EXPIRED)
      }
      return unauthorized(res, 'Invalid authentication token', AUTH_ERROR_CODES.INVALID_TOKEN)
    }

    // Find user
    const user = await User.findById(decoded.id).select('-password')
    if (!user || user.isDeleted) {
      return unauthorized(res, 'User not found. Please login again.', AUTH_ERROR_CODES.USER_NOT_FOUND)
    }

    // Check account status (Admins are always allowed)
    if (!user.isAdmin) {
      if (user.isSuspended) {
        return forbidden(res, 'Your account has been suspended. Please contact support.', AUTH_ERROR_CODES.ACCOUNT_SUSPENDED)
      }

      // Check identity verification for sensitive operations
      if (req.path.includes('/presence') && !user.isIdentityVerified) {
        return forbidden(res, 'Identity verification required for presence requests', AUTH_ERROR_CODES.VERIFICATION_REQUIRED)
      }
    }

    req.user = user
    next()
  } catch (error) {
    logger.error('Authentication error:', error)
    return unauthorized(res, 'Authentication failed', AUTH_ERROR_CODES.INVALID_TOKEN)
  }
}

/**
 * Sirf active account allow karo
 */
const requireActive = (req, res, next) => {
  try {
    if (!req.user) {
      return unauthorized(res, 'Authentication required', AUTH_ERROR_CODES.NO_TOKEN)
    }

    // Bypass for admins
    if (req.user.isAdmin) {
      return next()
    }

    const status = req.user.accountStatus || 'active'
    
    if (status === 'suspended') {
      return forbidden(res, 'Your account has been suspended. Please contact support.', AUTH_ERROR_CODES.ACCOUNT_SUSPENDED)
    }

    // Production check: Allow active, pending_review, and limited
    const allowedStatuses = ['active', 'pending_review', 'limited']
    
    if (allowedStatuses.includes(status)) {
      return next()
    }

    return forbidden(res, 'Your account is not active. Please contact support.', AUTH_ERROR_CODES.ACCOUNT_INACTIVE)
  } catch (error) {
    logger.error('RequireActive error:', error)
    return forbidden(res, 'Account validation failed', AUTH_ERROR_CODES.ACCOUNT_INACTIVE)
  }
}

/**
 * Sirf verified identity wale users allow karo
 */
const requireVerified = (req, res, next) => {
  if (!req.user.isIdentityVerified) {
    return forbidden(res, 'Identity verification required for this action', AUTH_ERROR_CODES.VERIFICATION_REQUIRED)
  }
  next()
}

module.exports = {
  authenticate,
  requireActive,
  requireVerified,
  AUTH_ERROR_CODES,
  createAuthError
}
