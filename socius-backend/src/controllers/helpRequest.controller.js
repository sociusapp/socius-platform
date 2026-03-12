const helpRequestService = require('../services/helpRequest.service')
const closureService = require('../services/closure.service')
const { shouldShowNudge, recordNudgeShown } = require('../services/communityBalance.service')
const { success, created } = require('../utils/response')

const createRequest = async (req, res, next) => {
  try {
    // Nudge check karo pehle
    const nudge = await shouldShowNudge(req.user._id)
    if (nudge) {
      await recordNudgeShown(req.user._id)
      return success(res, { showNudge: true }, 'Community balance nudge')
    }

    const request = await helpRequestService.createRequest(req.user._id, req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      platform: req.headers['x-platform'],
      deviceId: req.headers['x-device-id'],
      appVersion: req.headers['x-app-version'],
    })
    return created(res, request, 'Help request created')
  } catch (err) {
    next(err)
  }
}

const getMyActiveRequest = async (req, res, next) => {
  try {
    const request = await helpRequestService.getMyActiveRequest(req.user._id)
    return success(res, request)
  } catch (err) {
    next(err)
  }
}

const getRequestById = async (req, res, next) => {
  try {
    const data = await helpRequestService.getRequestById(req.params.id, req.user._id)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

const acceptRequest = async (req, res, next) => {
  try {
    console.log(`[HelpRequestController] Accepting request ${req.params.id} by user ${req.user._id}`)
    const result = await helpRequestService.acceptRequest(req.user._id, req.params.id)
    return success(res, result, 'Request accepted')
  } catch (err) {
    console.error(`[HelpRequestController] Error accepting request ${req.params.id}:`, err)
    next(err)
  }
}

const declineRequest = async (req, res, next) => {
  try {
    const result = await helpRequestService.declineRequest(req.user._id, req.params.id)
    return success(res, result, 'Request declined')
  } catch (err) {
    next(err)
  }
}

const cancelRequest = async (req, res, next) => {
  try {
    const result = await helpRequestService.cancelRequest(req.user._id, req.params.id)
    return success(res, result, 'Request cancelled')
  } catch (err) {
    next(err)
  }
}

const closeRequest = async (req, res, next) => {
  try {
    const { wasResolved, accountability, rating } = req.body
    const result = await closureService.closeHelpRequest(req.params.id, req.user._id, {
      wasResolved,
      accountability,
      rating,
    })
    return success(res, result, 'Request closed')
  } catch (err) {
    next(err)
  }
}

const markAsDelivered = async (req, res, next) => {
  try {
    const result = await helpRequestService.markAsDelivered(req.user._id, req.params.id)
    return success(res, result, 'Marked as delivered')
  } catch (err) {
    next(err)
  }
}

const getNearbyRequests = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.query
    const coords = latitude && longitude ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : null
    const requests = await helpRequestService.getNearbyHelpRequests(req.user._id, coords)
    return success(res, requests)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createRequest,
  getMyActiveRequest,
  getRequestById,
  acceptRequest,
  declineRequest,
  cancelRequest,
  closeRequest,
  markAsDelivered,
  getNearbyRequests,
}
