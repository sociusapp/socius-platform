const HelpRequest = require('../models/HelpRequest')
const HelpMatch = require('../models/HelpMatch')
const Verification = require('../models/Verification')
const { findHelpersForRequest } = require('./location.service')
const { sendHelpRequestAlert, sendMatchedNotification, sendCancelAlert } = require('./notification.service')
const {
  updateHelpRequestLocation,
  getNearbyHelpRequestIds,
  removeHelpRequestLocation
} = require('../config/redis')

const normalizeProfileImage = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('https')) return path;
  // If absolute path containing uploads/, extract from uploads/
  const uploadIndex = path.indexOf('uploads/');
  if (uploadIndex !== -1) {
    return path.substring(uploadIndex);
  }
  return path;
};
const { updateCommunityBalance } = require('./communityBalance.service')
const chatService = require('./chat.service')
const { emitToUser } = require('../config/socket')
const { HELP_REQUEST_STATUS, HELP_MATCH_STATUS, AUTO_CLOSE } = require('../utils/constants')
const logger = require('../utils/logger')

/**
 * Naya help request create karo + helpers notify karo
 */
const createRequest = async (requesterId, { category, description, location, itemReturnRequired }) => {
  // Active request check — ek time pe ek hi request
  const activeRequest = await HelpRequest.findOne({
    requesterId,
    status: { $in: ['open', 'matching', 'matched', 'active'] },
  })

  if (activeRequest) {
    const err = new Error('You already have an active request')
    err.statusCode = 409
    throw err
  }

  // Auto close schedule
  const autoCloseAt = new Date(Date.now() + AUTO_CLOSE.HELP_REQUEST_MINUTES * 60 * 1000)

  // Nearby helpers dhundho
  let helpers = await findHelpersForRequest({
    lng: location.lng,
    lat: location.lat,
    category,
    excludeIds: [requesterId],
  })

  logger.info(`Helpers found: ${helpers.length} for potential req`)

  // Blacklist filter: previous negative/penalized helpers should not get repeat notifications
  try {
    const { getBlacklistedHelpersForRequester } = require('./requestClosure.service')
    const blacklistedIds = await getBlacklistedHelpersForRequester(requesterId)
    if (blacklistedIds.length > 0) {
      const before = helpers.length
      helpers = helpers.filter(h => !blacklistedIds.includes(String(h._id)))
      logger.info(`Filtered ${before - helpers.length} blacklisted helpers for requester ${requesterId}`)
    }
  } catch (e) {
    logger.error('Blacklist filter failed', e)
  }

  if (helpers.length === 0) {
    // Logic moved after creation
  }

  const request = await HelpRequest.create({
    requesterId,
    category,
    description,
    location: {
      type: 'Point',
      coordinates: [location.lng, location.lat],
      address: location.address || null,
      whereToFindText: location.whereToFindText || null,
    },
    itemReturnRequired: itemReturnRequired || false,
    status: HELP_REQUEST_STATUS.MATCHING,
    autoCloseScheduledAt: autoCloseAt,
  })

  // REDIS INDEX
  updateHelpRequestLocation(request._id, location.lng, location.lat).catch(e => logger.error('Redis help request indexing failed', e))

  // Community balance update
  await updateCommunityBalance(requesterId, 'request_sent')

  if (helpers.length === 0) {
    // Record created, now notify frontend about "No helpers"
    // Instead of throwing an error that might be caught as generic,
    // we return the request but add a flag. Or throw a specific error with data.
    // If I throw here, the transaction is already committed (mongoose default).

    // User wants "404" behavior but with custom modal.
    const err = new Error('No helpers found nearby')
    err.statusCode = 404
    err.code = 'NO_HELPERS_FOUND'
    err.data = { request } // Pass created request so frontend can use it (e.g. to cancel later)
    throw err
  }

  if (helpers.length > 0) {
    const helperIds = helpers.map((h) => h._id)

    // HelpMatch entries banao
    const matchDocs = helpers.map((h) => ({
      requestId: request._id,
      helperId: h._id,
      status: HELP_MATCH_STATUS.PENDING,
      distanceMeters: h.distanceMeters,
      notifiedAt: new Date(),
    }))
    await HelpMatch.insertMany(matchDocs)

    // HIGH ALARM notification bhejo
    await sendHelpRequestAlert(helpers, request)

    await HelpRequest.findByIdAndUpdate(request._id, {
      status: HELP_REQUEST_STATUS.OPEN,
    })
  }

  logger.info(`Help request created: ${request._id} by ${requesterId}`)
  return request
}

/**
 * Helper ne accept kiya
 */
const acceptRequest = async (helperId, requestId) => {
  const match = await HelpMatch.findOne({
    requestId,
    helperId,
    status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED] },
  })

  if (!match) {
    const err = new Error('Request not found or already responded')
    err.statusCode = 404
    throw err
  }

  const request = await HelpRequest.findById(requestId)
  if (!request || !['open', 'matching', 'matched', 'active'].includes(request.status)) {
    const err = new Error('Request is no longer available')
    err.statusCode = 409
    throw err
  }

  // REDIS REMOVE
  removeHelpRequestLocation(requestId).catch(e => logger.error('Redis remove on accept failed', e))

  // Match accept karo
  match.status = HELP_MATCH_STATUS.ACCEPTED
  match.acceptedAt = new Date()
  match.respondedAt = new Date()

  // Ensure helperClosure is initialized if missing
  if (!match.helperClosure) {
    match.helperClosure = {
      wasResolved: null,
      accountability: null,
      rating: null,
      closedAt: null
    };
  }

  await match.save()

  // Request matched mark karo
  await HelpRequest.findByIdAndUpdate(requestId, {
    status: HELP_REQUEST_STATUS.MATCHED,
    matchedAt: new Date(),
  })

  // NOTE: We no longer auto-cancel other helpers to allow multiple volunteers as per request
  /*
  const otherHelpers = await HelpMatch.find({
    requestId,
    helperId: { $ne: helperId },
    status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED] }
  })

  for (const h of otherHelpers) {
    emitToUser(h.helperId, 'help:request_taken', { requestId })
  }

  // Send Cancel Push Notification (Data only) to stop ringing on killed apps
  const otherHelperIds = otherHelpers.map(h => h.helperId);
  if (otherHelperIds.length > 0) {
    sendCancelAlert(otherHelperIds, requestId).catch(err => logger.error('Failed to send cancel alert', err));
  }

  await HelpMatch.updateMany(
    { requestId, helperId: { $ne: helperId }, status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED] } },
    { status: HELP_MATCH_STATUS.CANCELLED }
  )
  */

  // Requester ko notification
  const helper = await require('../models/User').findById(helperId).select('fullName')
  await sendMatchedNotification(request.requesterId, helper?.fullName || 'Someone')

  // Chat session create karo
  console.log('[HelpRequestService] Creating chat session with params:', {
    requestId,
    requestType: 'HelpRequest',
    requesterId: request.requesterId,
    helperId,
  })

  try {
    await chatService.createSession({
      requestId,
      requestType: 'HelpRequest',
      requesterId: request.requesterId,
      helperId,
    })
  } catch (error) {
    console.error('[HelpRequestService] Error creating chat session:', error)
    // We don't throw here to avoid failing the accept flow if chat creation fails?
    // Or maybe we should throw? The original code didn't catch it specifically, so it would propagate.
    // Let's re-throw to be safe and consistent with original behavior.
    throw error
  }

  return { request, match }
}

/**
 * Helper ne decline kiya
 */
const declineRequest = async (helperId, requestId) => {
  const match = await HelpMatch.findOneAndUpdate(
    { requestId, helperId, status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED] } },
    { status: HELP_MATCH_STATUS.DECLINED, respondedAt: new Date() },
    { new: true }
  )

  if (match) {
    // Notify requester about decline
    const request = await HelpRequest.findById(requestId).select('requesterId')
    if (request) {
      emitToUser(request.requesterId.toString(), 'help:request_updated', {
        requestId,
        type: 'declined',
        helperId
      })
    }
  }

  return { message: 'Declined' }
}

/**
 * Request cancel karo (requester)
 */
const cancelRequest = async (requesterId, requestId) => {
  const request = await HelpRequest.findOne({ _id: requestId, requesterId })

  if (!request) {
    const err = new Error('Request not found')
    err.statusCode = 404
    throw err
  }

  if (['closed', 'cancelled', 'auto_closed'].includes(request.status)) {
    const err = new Error('Request is already closed')
    err.statusCode = 409
    throw err
  }

  // REDIS REMOVE
  removeHelpRequestLocation(requestId).catch(e => logger.error('Redis remove on cancel failed', e))

  request.status = HELP_REQUEST_STATUS.CANCELLED
  request.cancelledAt = new Date()
  await request.save()

  // All pending matches cancel karo
  await HelpMatch.updateMany(
    { requestId, status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED, HELP_MATCH_STATUS.ACCEPTED] } },
    { status: HELP_MATCH_STATUS.CANCELLED }
  )

  return request
}

/**
 * Request details get karo
 */
const getRequestById = async (requestId, userId) => {
  const requestDoc = await HelpRequest.findById(requestId).populate(
    'requesterId',
    'fullName location openTo profileImage'
  )

  if (!requestDoc) {
    const err = new Error('Request not found')
    err.statusCode = 404
    throw err
  }

  // Convert to object to modify
  let request = requestDoc.toObject();

  if (request.requesterId && request.requesterId.profileImage) {
    request.requesterId.profileImage = normalizeProfileImage(request.requesterId.profileImage);
  }

  // Populate requester profile image from Verification if not set in User
  if (request.requesterId && !request.requesterId.profileImage) {
    const ver = await Verification.findOne({ userId: request.requesterId._id }).select('selfie');
    if (ver?.selfie?.fileUrl) {
      request.requesterId.profileImage = normalizeProfileImage(ver.selfie.fileUrl);
    }
  }

  const match = await HelpMatch.findOne({
    requestId,
    helperId: userId,
  })

  // If this is a helper viewing the request, mark as viewed
  if (match && !match.viewedAt) {
    match.viewedAt = new Date()
    await match.save()

    // Notify requester that stats have changed
    const requesterId = request.requesterId._id || request.requesterId
    emitToUser(requesterId.toString(), 'help:request_updated', {
      requestId,
      type: 'viewed',
      viewerId: userId
    })
  }

  // If requester is viewing, also include accepted helper details if any
  let volunteer = null;
  if (match && match.status === 'accepted') {
    // If helper is viewing, they are the volunteer (self)
    // Populate it so frontend has consistent data
    const helperUser = await require('../models/User').findById(match.helperId).select('fullName phone profileImage');
    if (helperUser) {
      volunteer = helperUser.toObject();
      if (volunteer.profileImage) {
        volunteer.profileImage = normalizeProfileImage(volunteer.profileImage);
      }
      if (!volunteer.profileImage) {
        const ver = await Verification.findOne({ userId: match.helperId }).select('selfie');
        if (ver?.selfie?.fileUrl) volunteer.profileImage = normalizeProfileImage(ver.selfie.fileUrl);
      }
    }
  } else if (String(request.requesterId._id) === String(userId)) {
    // If requester is viewing, find accepted match
    const acceptedMatch = await HelpMatch.findOne({ requestId, status: 'accepted' });
    if (acceptedMatch) {
      const helperUser = await require('../models/User').findById(acceptedMatch.helperId).select('fullName phone profileImage');
      if (helperUser) {
        volunteer = helperUser.toObject();
        if (volunteer.profileImage) {
          volunteer.profileImage = normalizeProfileImage(volunteer.profileImage);
        }
        if (!volunteer.profileImage) {
          const ver = await Verification.findOne({ userId: acceptedMatch.helperId }).select('selfie');
          if (ver?.selfie?.fileUrl) volunteer.profileImage = normalizeProfileImage(ver.selfie.fileUrl);
        }
      }
    }
  }

  return { request, match, volunteer }
}

/**
 * User ki active requests
 */
const getMyActiveRequest = async (userId) => {
  // 1. Check if user is a requester (Request active hai)
  const request = await HelpRequest.findOne({
    requesterId: userId,
    status: { $in: ['open', 'matching', 'matched', 'active'] },
  }).populate('requesterId', 'fullName location profileImage')

  let requesterData = null
  if (request) {
    // Calculate stats
    const matches = await HelpMatch.find({ requestId: request._id })

    const stats = {
      notificationSentCount: matches.filter(m => m.status !== 'pending').length,
      viewedCount: matches.filter(m => m.viewedAt).length,
      declinedCount: matches.filter(m => ['declined', 'not_available'].includes(m.status)).length,
      acceptedCount: matches.filter(m => m.status === 'accepted').length
    }

    // Helper details if matched
    let volunteer = null
    if (request.status === 'matched' || request.status === 'active') {
      const acceptedMatch = matches.find(m => m.status === 'accepted')
      if (acceptedMatch) {
        const helperUser = await require('../models/User').findById(acceptedMatch.helperId).select('fullName phone profileImage')
        if (helperUser) {
          volunteer = helperUser.toObject();
          if (volunteer.profileImage) {
            volunteer.profileImage = normalizeProfileImage(volunteer.profileImage);
          }
          if (!volunteer.profileImage) {
            const ver = await Verification.findOne({ userId: acceptedMatch.helperId }).select('selfie');
            if (ver?.selfie?.fileUrl) volunteer.profileImage = normalizeProfileImage(ver.selfie.fileUrl);
          }
        }
      }
    }
    requesterData = { ...request.toObject(), stats, volunteer }

    if (requesterData.requesterId && requesterData.requesterId.profileImage) {
      requesterData.requesterId.profileImage = normalizeProfileImage(requesterData.requesterId.profileImage);
    }

    // Populate requester profile image from Verification if not set
    if (requesterData.requesterId && !requesterData.requesterId.profileImage) {
      const ver = await Verification.findOne({ userId: requesterData.requesterId._id }).select('selfie');
      if (ver?.selfie?.fileUrl) {
        requesterData.requesterId.profileImage = normalizeProfileImage(ver.selfie.fileUrl);
      }
    }
  }

  // 2. Check if user is a helper (Helping someone else)
  const activeHelpMatch = await HelpMatch.findOne({
    helperId: userId,
    status: 'accepted',
  }).populate({
    path: 'requestId',
    match: { status: { $in: ['matched', 'active'] } }, // Request bhi active honi chahiye
    populate: { path: 'requesterId', select: 'fullName location profileImage' }
  })

  let helperData = null
  if (activeHelpMatch && activeHelpMatch.requestId) {
    let reqObj = activeHelpMatch.requestId.toObject();

    if (reqObj.requesterId && reqObj.requesterId.profileImage) {
      reqObj.requesterId.profileImage = normalizeProfileImage(reqObj.requesterId.profileImage);
    }

    if (reqObj.requesterId && !reqObj.requesterId.profileImage) {
      const ver = await Verification.findOne({ userId: reqObj.requesterId._id }).select('selfie');
      if (ver?.selfie?.fileUrl) {
        reqObj.requesterId.profileImage = normalizeProfileImage(ver.selfie.fileUrl);
      }
    }

    helperData = {
      matchId: activeHelpMatch._id,
      request: reqObj,
      status: activeHelpMatch.status,
      acceptedAt: activeHelpMatch.acceptedAt
    }
  }

  return { activeRequest: requesterData, activeHelp: helperData }
}

/**
 * Mark request as delivered/received by helper
 */
const markAsDelivered = async (helperId, requestId) => {
  const match = await HelpMatch.findOne({
    requestId,
    helperId,
    status: HELP_MATCH_STATUS.PENDING,
  })

  if (match) {
    match.status = HELP_MATCH_STATUS.NOTIFIED
    // notifiedAt is already set at creation (as "sent at"), so we don't need to change it.
    // Ideally we would have deliveredAt, but updating status is enough for the count.
    await match.save()

    // Notify requester about stat update
    const request = await HelpRequest.findById(requestId).select('requesterId')
    if (request) {
      emitToUser(request.requesterId.toString(), 'help:request_updated', {
        requestId,
        type: 'delivered',
        helperId
      })
    }
    return { success: true }
  }
  return { success: false, message: 'Already processed or not found' }
}

/**
 * Nearby help requests dhundho jo open/matching hain
 */
const getNearbyHelpRequests = async (userId, coords = null) => {
  let lng, lat;

  if (coords && coords.latitude && coords.longitude) {
    lng = coords.longitude;
    lat = coords.latitude;
  } else {
    // Current user ki location se uthao
    const User = require('../models/User')
    const user = await User.findById(userId).select('location')
    if (!user || !user.location || !user.location.coordinates) {
      return []
    }
    lng = user.location.coordinates[0];
    lat = user.location.coordinates[1];
  }

  const { calculateDistance } = require('../utils/geoQuery')

  // 1. Try REDIS first
  let redisRequestIds = await getNearbyHelpRequestIds(lng, lat, GEO.DEFAULT_RADIUS_METERS);

  if (redisRequestIds && redisRequestIds.length > 0) {
    logger.info(`Redis found ${redisRequestIds.length} nearby requests.`)
    const requests = await HelpRequest.find({
      _id: { $in: redisRequestIds },
      requesterId: { $ne: userId },
      status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING, HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE] },
    }).populate('requesterId', 'fullName profileImage')

    if (requests.length > 0) {
      const filtered = []
      for (const req of requests) {
        const match = await HelpMatch.findOne({ requestId: req._id, helperId: userId })
        if (match && ['declined', 'not_available', 'accepted', 'completed'].includes(match.status)) continue

        const reqObj = req.toObject()
        if (reqObj.requesterId && reqObj.requesterId.profileImage) {
          reqObj.requesterId.profileImage = normalizeProfileImage(reqObj.requesterId.profileImage)
        }
        reqObj.distanceMeters = calculateDistance(lng, lat, req.location.coordinates[0], req.location.coordinates[1])
        filtered.push(reqObj)
      }
      return filtered
    }
  }

  // 2. Fallback to MongoDB
  const query = {
    requesterId: { $ne: userId },
    status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING, HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE] },
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: GEO.DEFAULT_RADIUS_METERS,
      },
    },
  }

  const requests = await HelpRequest.find(query)
    .populate('requesterId', 'fullName profileImage')
    .limit(20)

  const filtered = []
  for (const req of requests) {
    const match = await HelpMatch.findOne({ requestId: req._id, helperId: userId })

    // Agar helper ne pehle hi mana kar diya hai ya accept kar liya hai toh mat dikhao
    if (match && ['declined', 'not_available', 'accepted', 'completed'].includes(match.status)) {
      continue
    }

    const reqObj = req.toObject()
    if (reqObj.requesterId && reqObj.requesterId.profileImage) {
      reqObj.requesterId.profileImage = normalizeProfileImage(reqObj.requesterId.profileImage)
    }

    // Add distance for frontend display
    reqObj.distanceMeters = calculateDistance(
      lng, lat,
      req.location.coordinates[0],
      req.location.coordinates[1]
    )

    filtered.push(reqObj)

    // Self-healing Redis: if it was found in Mongo but not Redis, add it
    updateHelpRequestLocation(req._id, req.location.coordinates[0], req.location.coordinates[1]).catch(() => { })
  }

  return filtered
}

module.exports = {
  createRequest,
  acceptRequest,
  declineRequest,
  cancelRequest,
  getRequestById,
  getMyActiveRequest,
  markAsDelivered,
  getNearbyHelpRequests,
}
