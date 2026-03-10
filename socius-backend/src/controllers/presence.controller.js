const presenceService = require('../services/presence.service')
const closureService = require('../services/closure.service')
const { success, created } = require('../utils/response')

const createPresenceRequest = async (req, res, next) => {
  try {
    const request = await presenceService.createPresenceRequest(req.user._id, req.body)
    return created(res, request, 'Presence request created. Nearby people are being alerted.')
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

module.exports = {
  createPresenceRequest,
  getActivePresenceRequest,
  acceptPresence,
  declinePresence,
  cancelPresenceRequest,
  closePresenceRequest,
}
