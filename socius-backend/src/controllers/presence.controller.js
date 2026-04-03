const presenceService = require('../services/presence.service')
const closureService = require('../services/closure.service')
const { success, created, badRequest } = require('../utils/response')
const { PRESENCE_ERRORS } = require('../utils/errorConstants')

const createPresenceRequest = async (req, res, next) => {
  try {
    const result = await presenceService.createPresenceRequest(req.user._id, req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      platform: req.headers['x-platform'],
      deviceId: req.headers['x-device-id'],
      appVersion: req.headers['x-app-version'],
    })
    
    // Enhanced response with helpful information
    const responseData = {
      request: result?.request || result,
      noHelpersFound: !!result?.noHelpersFound,
      helperAvailabilityHint: result?.helperAvailabilityHint || null,
      attemptId: result?.attemptId || null,
    }
    
    // Add helpful messages based on helper availability
    let message = 'Presence request created. Nearby people are being alerted.'
    if (result?.noHelpersFound) {
      if (result?.helperAvailabilityHint === 'only_self_available') {
        message = 'Presence request created. No other helpers are available nearby. Try expanding your search area.'
      } else if (result?.helperAvailabilityHint === 'helpers_busy_or_ineligible') {
        message = 'Presence request created. All nearby helpers are currently busy. Your request will remain active.'
      } else {
        message = 'Presence request created. No helpers found in your area. Your request will remain active if someone becomes available.'
      }
    }
    
    return created(res, responseData, message)
  } catch (err) {
    // Enhanced error handling with specific error codes
    if (err.code === PRESENCE_ERRORS.ACTIVE_REQUEST_EXISTS) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.INVALID_COORDINATES) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.INVALID_SITUATION_TYPE) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.DESCRIPTION_TOO_LONG) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.MAX_HELPERS_EXCEEDED) {
      return badRequest(res, err.message, null, err.code)
    }
    next(err)
  }
}

const getPresenceById = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || id.length !== 24) {
      return badRequest(res, 'Invalid presence request ID', null, PRESENCE_ERRORS.REQUEST_NOT_FOUND)
    }
    
    const data = await presenceService.getPresenceById(req.user._id, id)
    return success(res, data)
  } catch (err) {
    if (err.code === PRESENCE_ERRORS.REQUEST_NOT_FOUND) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.FORBIDDEN) {
      return badRequest(res, err.message, null, err.code)
    }
    next(err)
  }
}

const getActivePresenceRequest = async (req, res, next) => {
  try {
    const data = await presenceService.getActivePresenceRequest(req.user._id)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

const acceptPresence = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || id.length !== 24) {
      return badRequest(res, 'Invalid presence request ID', null, PRESENCE_ERRORS.REQUEST_NOT_FOUND)
    }
    
    const result = await presenceService.acceptPresence(req.user._id, id)
    return success(res, result, 'Presence accepted')
  } catch (err) {
    if (err.code === PRESENCE_ERRORS.REQUEST_NOT_FOUND) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.MATCH_NOT_FOUND) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.REQUEST_CLOSED) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.HELPER_BUSY) {
      return badRequest(res, err.message, null, err.code)
    }
    next(err)
  }
}

const updatePresenceMatchStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!id || id.length !== 24) {
      return badRequest(res, 'Invalid presence request ID', null, PRESENCE_ERRORS.REQUEST_NOT_FOUND)
    }
    
    if (!status) {
      return badRequest(res, 'Status is required', null, PRESENCE_ERRORS.INVALID_STATUS)
    }
    
    const result = await presenceService.updatePresenceMatchStatus(req.user._id, id, status)
    return success(res, result, `Status updated to ${status}`)
  } catch (err) {
    if (err.code === PRESENCE_ERRORS.INVALID_STATUS) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.REQUEST_NOT_FOUND) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.MATCH_NOT_FOUND) {
      return badRequest(res, err.message, null, err.code)
    }
    next(err)
  }
}

const declinePresence = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || id.length !== 24) {
      return badRequest(res, 'Invalid presence request ID', null, PRESENCE_ERRORS.REQUEST_NOT_FOUND)
    }
    
    const result = await presenceService.declinePresence(req.user._id, id)
    return success(res, result, 'Presence request declined')
  } catch (err) {
    if (err.code === PRESENCE_ERRORS.REQUEST_NOT_FOUND) {
      return badRequest(res, err.message, null, err.code)
    }
    next(err)
  }
}

const cancelPresenceRequest = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || id.length !== 24) {
      return badRequest(res, 'Invalid presence request ID', null, PRESENCE_ERRORS.REQUEST_NOT_FOUND)
    }
    
    const result = await presenceService.cancelPresenceRequest(req.user._id, id)
    return success(res, result, 'Presence request cancelled')
  } catch (err) {
    if (err.code === PRESENCE_ERRORS.REQUEST_NOT_FOUND) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.REQUEST_CLOSED) {
      return badRequest(res, err.message, null, err.code)
    }
    next(err)
  }
}

const closePresenceRequest = async (req, res, next) => {
  try {
    const { id } = req.params
    const { closureReason } = req.body
    
    if (!id || id.length !== 24) {
      return badRequest(res, 'Invalid presence request ID', null, PRESENCE_ERRORS.REQUEST_NOT_FOUND)
    }
    
    if (!closureReason) {
      return badRequest(res, 'Closure reason is required', null, PRESENCE_ERRORS.INVALID_STATUS)
    }
    
    const result = await closureService.closePresenceRequest(id, req.user._id, {
      closureReason,
    })
    return success(res, result, 'Presence request closed')
  } catch (err) {
    if (err.code === PRESENCE_ERRORS.REQUEST_NOT_FOUND) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.FORBIDDEN) {
      return badRequest(res, err.message, null, err.code)
    }
    next(err)
  }
}

const getNearbyPresenceRequests = async (req, res, next) => {
  try {
    const { lat, lng, latitude, longitude } = req.query
    const targetLat = lat || latitude
    const targetLng = lng || longitude
    
    // Validate coordinates if provided
    if (targetLat !== undefined || targetLng !== undefined) {
      if (targetLat === undefined || targetLng === undefined) {
        return badRequest(res, 'Both latitude and longitude must be provided', null, PRESENCE_ERRORS.INVALID_COORDINATES)
      }
      
      const latNum = parseFloat(targetLat)
      const lngNum = parseFloat(targetLng)
      
      if (isNaN(latNum) || isNaN(lngNum) || 
          latNum < -90 || latNum > 90 || 
          lngNum < -180 || lngNum > 180) {
        return badRequest(res, 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180', null, PRESENCE_ERRORS.INVALID_COORDINATES)
      }
    }
    
    const coords = targetLat && targetLng ? { lat: parseFloat(targetLat), lng: parseFloat(targetLng) } : null
    const requests = await presenceService.getNearbyPresenceRequests(req.user._id, coords)
    return success(res, requests)
  } catch (err) {
    if (err.code === PRESENCE_ERRORS.INVALID_COORDINATES) {
      return badRequest(res, err.message, null, err.code)
    }
    next(err)
  }
}

const updatePresenceRequest = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || id.length !== 24) {
      return badRequest(res, 'Invalid presence request ID', null, PRESENCE_ERRORS.REQUEST_NOT_FOUND)
    }
    
    // Check if at least one field is provided for update
    if (!req.body || Object.keys(req.body).length === 0) {
      return badRequest(res, 'At least one field must be provided for update', null, PRESENCE_ERRORS.INVALID_STATUS)
    }
    
    const result = await presenceService.updatePresenceRequest(req.user._id, id, req.body)
    return success(res, result, 'Presence request updated')
  } catch (err) {
    if (err.code === PRESENCE_ERRORS.REQUEST_NOT_FOUND) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.FORBIDDEN) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.REQUEST_CLOSED) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.DESCRIPTION_TOO_LONG) {
      return badRequest(res, err.message, null, err.code)
    }
    if (err.code === PRESENCE_ERRORS.INVALID_SITUATION_TYPE) {
      return badRequest(res, err.message, null, err.code)
    }
    next(err)
  }
}

module.exports = {
  createPresenceRequest,
  getPresenceById,
  getActivePresenceRequest,
  acceptPresence,
  updatePresenceMatchStatus,
  declinePresence,
  cancelPresenceRequest,
  closePresenceRequest,
  getNearbyPresenceRequests,
  updatePresenceRequest,
}
