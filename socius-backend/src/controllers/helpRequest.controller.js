const helpRequestService = require('../services/helpRequest.service')
const closureService = require('../services/closure.service')
const { shouldShowNudge, recordNudgeShown, getBalance } = require('../services/communityBalance.service')
const { sendCommunityBalanceNudgeNotification } = require('../services/notification.service')
const { success, created } = require('../utils/response')

const createRequest = async (req, res, next) => {
  try {
    const showNudge = await shouldShowNudge(req.user._id)
    const result = await helpRequestService.createRequest(req.user._id, req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      platform: req.headers['x-platform'],
      deviceId: req.headers['x-device-id'],
      appVersion: req.headers['x-app-version'],
    })
    if (showNudge) {
      recordNudgeShown(req.user._id).catch(() => {})
      getBalance(req.user._id)
        .then((bal) =>
          sendCommunityBalanceNudgeNotification(req.user._id, {
            helpRequestsSent: bal?.helpRequestsSent ?? 0,
            helpGiven: bal?.helpGiven ?? 0,
            nudgeKey: 'create_request',
          })
        )
        .catch(() => {})
    }
    return created(
      res,
      {
        request: result?.request || result,
        showNudge,
        noHelpersFound: !!result?.noHelpersFound,
        helperAvailabilityHint: result?.helperAvailabilityHint || null,
        attemptId: result?.attemptId || null,
      },
      'Help request created'
    )
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
    const { id } = req.params
    if (!id || id.length !== 24) {
      const err = new Error('Invalid ID')
      err.name = 'CastError'
      err.path = '_id'
      err.value = id
      throw err
    }
    const data = await helpRequestService.getRequestById(id, req.user._id)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

const updateRequest = async (req, res, next) => {
  try {
    const request = await helpRequestService.updateRequest(req.user._id, req.params.id, req.body)
    return success(res, { request }, 'Help request updated')
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
    const { lat, lng, latitude, longitude } = req.query
    const targetLat = lat || latitude
    const targetLng = lng || longitude
    const coords = targetLat && targetLng ? { lat: parseFloat(targetLat), lng: parseFloat(targetLng) } : null
    const requests = await helpRequestService.getNearbyHelpRequests(req.user._id, coords)
    return success(res, requests)
  } catch (err) {
    next(err)
  }
}

/** Requester: extend session timer or mark completed from completion prompt */
const sessionAction = async (req, res, next) => {
  try {
    const { action, additionalMinutes } = req.body
    const id = req.params.id

    if (action === 'extend') {
      const result = await helpRequestService.extendHelpSession(req.user._id, id, additionalMinutes)
      return success(res, result, 'Session extended')
    }

    if (action === 'complete') {
      const request = await closureService.closeHelpRequest(id, req.user._id, {
        wasResolved: true,
        accountability: 'completed_as_agreed',
      })
      return success(res, { request }, 'Request closed')
    }

    const err = new Error('Invalid action')
    err.statusCode = 400
    throw err
  } catch (err) {
    next(err)
  }
}

const createBorrowItem = async (req, res, next) => {
  try {
    const result = await helpRequestService.createBorrowItemRequest(req.user._id, req.params.id, req.body)
    return created(res, result, 'Borrow item request sent')
  } catch (err) {
    next(err)
  }
}

const getBorrowItems = async (req, res, next) => {
  try {
    const result = await helpRequestService.getBorrowItems(req.user._id, req.params.id)
    return success(res, result)
  } catch (err) {
    next(err)
  }
}

const respondBorrowItem = async (req, res, next) => {
  try {
    const result = await helpRequestService.respondBorrowItemRequest(
      req.user._id,
      req.params.id,
      req.params.borrowId,
      req.body
    )
    return success(res, result, 'Borrow request updated')
  } catch (err) {
    next(err)
  }
}

const createOfferItem = async (req, res, next) => {
  try {
    const result = await helpRequestService.createOfferItemRequest(req.user._id, req.params.id, req.body)
    return created(res, result, 'Offer sent')
  } catch (err) {
    next(err)
  }
}

const respondOfferItem = async (req, res, next) => {
  try {
    const result = await helpRequestService.respondOfferItemRequest(
      req.user._id,
      req.params.id,
      req.params.offerId,
      req.body
    )
    return success(res, result, 'Offer updated')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createRequest,
  updateRequest,
  getMyActiveRequest,
  getRequestById,
  acceptRequest,
  declineRequest,
  cancelRequest,
  closeRequest,
  markAsDelivered,
  getNearbyRequests,
  sessionAction,
  createBorrowItem,
  getBorrowItems,
  respondBorrowItem,
  createOfferItem,
  respondOfferItem,
}
