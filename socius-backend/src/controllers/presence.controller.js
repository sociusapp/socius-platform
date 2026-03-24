const presenceService = require('../services/presence.service')
const closureService = require('../services/closure.service')
const { success, created } = require('../utils/response')

const createPresenceRequest = async (req, res, next) => {
  try {
    const result = await presenceService.createPresenceRequest(req.user._id, req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      platform: req.headers['x-platform'],
      deviceId: req.headers['x-device-id'],
      appVersion: req.headers['x-app-version'],
    })
    return created(
      res,
      {
        request: result?.request || result,
        noHelpersFound: !!result?.noHelpersFound,
        helperAvailabilityHint: result?.helperAvailabilityHint || null,
        attemptId: result?.attemptId || null,
      },
      'Presence request created. Nearby people are being alerted.'
    )
  } catch (err) {
    next(err)
  }
}

const getPresenceById = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || id.length !== 24) {
      const err = new Error('Invalid ID')
      err.name = 'CastError'
      err.path = '_id'
      err.value = id
      throw err
    }
    const data = await presenceService.getPresenceById(req.user._id, id)
    return success(res, data)
  } catch (err) {
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
    const result = await presenceService.acceptPresence(req.user._id, req.params.id)
    return success(res, result, 'Presence accepted')
  } catch (err) {
    next(err)
  }
}

const updatePresenceMatchStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    const result = await presenceService.updatePresenceMatchStatus(req.user._id, req.params.id, status)
    return success(res, result, `Status updated to ${status}`)
  } catch (err) {
    next(err)
  }
}

const declinePresence = async (req, res, next) => {
  try {
    const result = await presenceService.declinePresence(req.user._id, req.params.id)
    return success(res, result)
  } catch (err) {
    next(err)
  }
}

const cancelPresenceRequest = async (req, res, next) => {
  try {
    const result = await presenceService.cancelPresenceRequest(req.user._id, req.params.id)
    return success(res, result, 'Presence request cancelled')
  } catch (err) {
    next(err)
  }
}

const closePresenceRequest = async (req, res, next) => {
  try {
    const { closureReason } = req.body
    const result = await closureService.closePresenceRequest(req.params.id, req.user._id, {
      closureReason,
    })
    return success(res, result, 'Awareness closed')
  } catch (err) {
    next(err)
  }
}

const getNearbyPresenceRequests = async (req, res, next) => {
  try {
    const { lat, lng, latitude, longitude } = req.query
    const targetLat = lat || latitude
    const targetLng = lng || longitude
    const coords = targetLat && targetLng ? { lat: parseFloat(targetLat), lng: parseFloat(targetLng) } : null
    const requests = await presenceService.getNearbyPresenceRequests(req.user._id, coords)
    return success(res, requests)
  } catch (err) {
    next(err)
  }
}

const updatePresenceRequest = async (req, res, next) => {
  try {
    const result = await presenceService.updatePresenceRequest(req.user._id, req.params.id, req.body)
    return success(res, result, 'Presence request updated.')
  } catch (err) {
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
