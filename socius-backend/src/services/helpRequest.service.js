const HelpRequest = require('../models/HelpRequest')
const HelpMatch = require('../models/HelpMatch')
const HelpBorrowItem = require('../models/HelpBorrowItem')
const Verification = require('../models/Verification')
const PresenceRequest = require('../models/PresenceRequest')
const HelpCategory = require('../models/HelpCategory')
const Badge = require('../models/Badge')
const User = require('../models/User')
const { findHelpersForRequest, getBusyRequesterIdSet } = require('./location.service')
const {
  sendHelpRequestAlert,
  sendMatchedNotification,
  sendCancelAlert,
  sendRequestAcknowledgedNotification,
  sendNoHelpersNearbyNotification,
  sendHelperArrivedNotification,
  sendHelperSessionExtendedNotification,
  sendBorrowItemRequestNotification,
  sendOfferItemRequestNotification,
} = require('./notification.service')
const { findNearbyAvailableUsers, calculateDistance } = require('../utils/geoQuery')
const { parseRequestedDurationMinutes } = require('../utils/helpDuration')
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

const normalizeUploadPath = (path) => {
  if (!path) return null
  const s = String(path)
  if (/^https?:\/\//i.test(s)) return s
  const idx = s.indexOf('uploads/')
  if (idx !== -1) return '/' + s.substring(idx).replace(/\\/g, '/')
  return s.startsWith('/') ? s : `/${s}`
}

const attachCategoryMeta = async (categorySlug) => {
  if (!categorySlug) return { categoryName: null, categoryIcon: null }
  const c = await HelpCategory.findOne({ slug: String(categorySlug).trim().toLowerCase(), isActive: true })
    .select('name iconPath')
    .lean()
  if (!c) return { categoryName: null, categoryIcon: null }
  return {
    categoryName: c.name || null,
    categoryIcon: c.iconPath ? normalizeUploadPath(c.iconPath) : null,
  }
}
const { updateCommunityBalance } = require('./communityBalance.service')
const chatService = require('./chat.service')
const { emitToUser } = require('../config/socket')
const { HELP_REQUEST_STATUS, HELP_MATCH_STATUS, PRESENCE_STATUS, GEO, AUTO_CLOSE, BADGE_TYPE } = require('../utils/constants')
const logger = require('../utils/logger')
const { logRequestAttempt } = require('./requestAttempt.service')

const computeHelpRequestStats = async (requestId) => {
  const matches = await HelpMatch.find({ requestId }).select('status viewedAt markedDeliveredAt').lean()
  return {
    totalCandidates: matches.length,
    notificationSentCount: matches.filter(
      (m) => String(m.status || '').toLowerCase() !== HELP_MATCH_STATUS.PENDING || !!m.markedDeliveredAt
    ).length,
    viewedCount: matches.filter((m) => !!m.viewedAt).length,
    declinedCount: matches.filter((m) =>
      [HELP_MATCH_STATUS.DECLINED, HELP_MATCH_STATUS.NOT_AVAILABLE].includes(
        String(m.status || '').toLowerCase()
      )
    ).length,
    acceptedCount: matches.filter((m) => String(m.status || '').toLowerCase() === HELP_MATCH_STATUS.ACCEPTED)
      .length,
  }
}

const buildTrustSignalsForUser = async (userId) => {
  if (!userId) {
    return {
      closes_properly: false,
      returns_on_time: false,
      also_helps_others: false,
      occasional_requester: false,
      new_user: true,
    }
  }
  const [badges, userDoc] = await Promise.all([
    Badge.find({ userId, isActive: true }).select('type').lean(),
    User.findById(userId).select('createdAt').lean(),
  ])

  const types = new Set((badges || []).map((b) => String(b.type || '')))
  const createdAtMs = userDoc?.createdAt ? new Date(userDoc.createdAt).getTime() : Date.now()
  const ageDays = Math.max(0, Math.floor((Date.now() - createdAtMs) / (24 * 60 * 60 * 1000)))

  return {
    closes_properly: types.has(BADGE_TYPE.CLOSES_PROPERLY),
    returns_on_time: types.has(BADGE_TYPE.RETURNS_ON_TIME),
    also_helps_others: types.has(BADGE_TYPE.ALSO_HELPS_OTHERS),
    occasional_requester: types.has(BADGE_TYPE.OCCASIONAL_REQUESTER),
    new_user: ageDays <= 30,
  }
}

const emitHelpRequestStatsUpdate = async ({ requestId, requesterId, type, extra = {} }) => {
  try {
    const stats = await computeHelpRequestStats(requestId)
    emitToUser(String(requesterId), 'help:request_updated', {
      requestId: String(requestId),
      type,
      stats,
      ...extra,
    })
  } catch (e) {
    logger.error('help:request_updated emit failed', e)
  }
}

const updateRequest = async (requesterId, requestId, { category, categoryId, subcategoryId, description, time, location, itemReturnRequired }) => {
  const allowedStatuses = [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING]

  const set = {}
  if (typeof category === 'string') {
    set.category = category
    const meta = await attachCategoryMeta(category)
    set.categoryName = meta.categoryName
    set.categoryIcon = meta.categoryIcon
  }
  if (typeof categoryId === 'string' && categoryId.trim()) set.categoryId = categoryId
  if (subcategoryId !== undefined) {
    set.subcategoryId = typeof subcategoryId === 'string' && subcategoryId.trim() ? subcategoryId : null
  }
  if (typeof description === 'string') set.description = description
  if (typeof time === 'string') set.requestedDurationLabel = time || null
  if (typeof itemReturnRequired === 'boolean') set.itemReturnRequired = itemReturnRequired
  if (location && typeof location.lng === 'number' && typeof location.lat === 'number') {
    set.location = {
      type: 'Point',
      coordinates: [location.lng, location.lat],
      address: location.address || null,
      whereToFindText: location.whereToFindText || null,
    }
  }

  const updated = await HelpRequest.findOneAndUpdate(
    { _id: requestId, requesterId, status: { $in: allowedStatuses } },
    { $set: set },
    { new: true }
  )

  if (!updated) {
    const exists = await HelpRequest.findOne({ _id: requestId, requesterId }).select('_id status')
    if (!exists) {
      const err = new Error('Request not found')
      err.statusCode = 404
      throw err
    }
    const err = new Error('Request cannot be updated at this stage')
    err.statusCode = 409
    err.code = 'REQUEST_NOT_UPDATABLE'
    err.data = { status: exists.status }
    throw err
  }

  if (set.location) {
    updateHelpRequestLocation(updated._id, set.location.coordinates[0], set.location.coordinates[1]).catch(() => {})
  }

  return updated
}

/**
 * Naya help request create karo + helpers notify karo
 */
const createRequest = async (requesterId, { category, categoryId, subcategoryId, description, time, location, itemReturnRequired }, meta = null) => {
  logger.info(`[HelpRequest] createRequest by=${requesterId} cat=${category} loc=(${location?.lng},${location?.lat})`)

  const activePresence = await PresenceRequest.findOne({
    requesterId,
    status: { $in: [PRESENCE_STATUS.ACTIVE, PRESENCE_STATUS.HELPERS_NOTIFIED, PRESENCE_STATUS.HELPERS_ACCEPTED] },
  }).select('_id status')

  if (activePresence) {
    logger.warn(`[HelpRequest] BLOCK: active presence request exists id=${activePresence._id} status=${activePresence.status}`)
    logRequestAttempt({
      requesterId,
      requestKind: 'help_request',
      outcome: 'blocked_active_request',
      reason: 'active_presence_request',
      category,
      description,
      itemReturnRequired: itemReturnRequired || false,
      location,
      radiusMeters: GEO.DEFAULT_RADIUS_METERS,
      meta,
    }).catch(() => {})
    const err = new Error('You already have an active request')
    err.statusCode = 409
    err.code = 'ACTIVE_REQUEST_EXISTS'
    throw err
  }

  // Auto close schedule
  const autoCloseAt = new Date(Date.now() + AUTO_CLOSE.HELP_REQUEST_MINUTES * 60 * 1000)

  // Nearby helpers dhundho
  const requesterIdStr = String(requesterId)
  let helpers = await findHelpersForRequest({
    lng: location.lng,
    lat: location.lat,
    category,
    excludeIds: [requesterId],
  })

  // Safety guard: requester should never receive their own incoming help alert.
  helpers = helpers.filter((h) => String(h?._id) !== requesterIdStr)

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

  let helperAvailabilityHint = null
  let attemptId = null
  if (helpers.length === 0) {
    try {
      // Check ALL nearby users (not just available ones) to determine if they're busy or just not available
      const allNearbyUsersExcludingSelf = await findNearbyAvailableUsers({
        lng: location.lng,
        lat: location.lat,
        radiusMeters: GEO.DEFAULT_RADIUS_METERS,
        excludeIds: [requesterId],
        limit: 50,
        requireAvailability: false, // Get ALL users, not just available ones
      })
      const candidatesIncludingSelf = await findNearbyAvailableUsers({
        lng: location.lng,
        lat: location.lat,
        radiusMeters: GEO.DEFAULT_RADIUS_METERS,
        excludeIds: [],
        limit: 10,
        requireAvailability: true,
      })

      // Check which nearby users are actually busy (have active requests)
      const busyUserIds = await getBusyRequesterIdSet(allNearbyUsersExcludingSelf.map(u => u._id))
      const busyUsersCount = allNearbyUsersExcludingSelf.filter(u => busyUserIds.has(String(u._id))).length

      if (candidatesIncludingSelf.length > 0 && allNearbyUsersExcludingSelf.length === 0) {
        helperAvailabilityHint = 'only_self_available'
      } else if (busyUsersCount > 0) {
        helperAvailabilityHint = 'helpers_busy_or_ineligible'
      } else if (allNearbyUsersExcludingSelf.length > 0) {
        // Users nearby but none are available (not busy, just unavailable)
        helperAvailabilityHint = 'no_helpers_in_radius'
      } else {
        helperAvailabilityHint = 'no_helpers_in_radius'
      }
    } catch (e) {
      helperAvailabilityHint = 'unknown'
    }

    try {
      const attempt = await logRequestAttempt({
        requesterId,
        requestKind: 'help_request',
        outcome: 'no_helpers_found',
        reason: 'no_helpers_in_radius',
        category,
        description,
        itemReturnRequired: itemReturnRequired || false,
        location,
        radiusMeters: GEO.DEFAULT_RADIUS_METERS,
        helpersFound: 0,
        meta,
      })
      attemptId = attempt?._id ? String(attempt._id) : null
    } catch (e) { }
  }

  const categoryMeta = await attachCategoryMeta(category)

  const request = await HelpRequest.create({
    requesterId,
    category,
    categoryId: categoryId || null,
    subcategoryId: subcategoryId || null,
    description,
    categoryName: categoryMeta.categoryName,
    categoryIcon: categoryMeta.categoryIcon,
    requestedDurationLabel: typeof time === 'string' ? time || null : null,
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

    // HIGH ALARM notification bhejo (track exact successful deliveries)
    const alertResult = await sendHelpRequestAlert(helpers, request)
    const deliveredHelperIds = Array.isArray(alertResult?.deliveredHelperIds)
      ? alertResult.deliveredHelperIds.map((id) => String(id))
      : []
    if (deliveredHelperIds.length > 0) {
      await HelpMatch.updateMany(
        {
          requestId: request._id,
          helperId: { $in: deliveredHelperIds },
          status: HELP_MATCH_STATUS.PENDING,
        },
        {
          $set: {
            status: HELP_MATCH_STATUS.NOTIFIED,
            markedDeliveredAt: new Date(),
          },
        }
      )
      await emitHelpRequestStatsUpdate({
        requestId: request._id,
        requesterId,
        type: 'notified',
        extra: { deliveredCount: deliveredHelperIds.length },
      })
    }

    for (const h of helpers) {
      if (String(h?._id) === requesterIdStr) continue
      try {
        emitToUser(String(h._id), 'help:incoming_request', {
          requestId: String(request._id),
          requesterId: requesterIdStr,
          category: request.category || '',
          categoryName: request.categoryName || '',
          categoryIcon: request.categoryIcon || '',
          description: request.description || '',
          distanceMeters: String(h.distanceMeters != null ? Math.round(h.distanceMeters) : ''),
          area: request.location?.address || '',
        })
      } catch (e) {
        logger.error('help:incoming_request emit failed', e)
      }
    }

    await HelpRequest.findByIdAndUpdate(request._id, {
      status: HELP_REQUEST_STATUS.OPEN,
    })
  }

  logger.info(`Help request created: ${request._id} by ${requesterId}`)

  const receivedAt = new Date().toISOString()
  sendRequestAcknowledgedNotification(requesterId, {
    requestId: request._id,
    correlationId: attemptId || String(request._id),
    serverReceivedAt: receivedAt,
  }).catch((e) => logger.error('sendRequestAcknowledgedNotification failed', e))

  if (helpers.length === 0) {
    sendNoHelpersNearbyNotification(requesterId, {
      requestId: request._id,
      hint: helperAvailabilityHint || '',
      attemptId: attemptId || '',
    }).catch((e) => logger.error('sendNoHelpersNearbyNotification failed', e))
  }

  return {
    request,
    noHelpersFound: helpers.length === 0,
    helperAvailabilityHint,
    attemptId,
  }
}

/**
 * Helper ne accept kiya (atomic: partial unique index on HelpMatch + conditional HelpRequest update)
 */
const acceptRequest = async (helperId, requestId) => {
  let request = await HelpRequest.findById(requestId)
  if (!request || !['open', 'matching', 'matched', 'active'].includes(request.status)) {
    const err = new Error('Request is no longer available')
    err.statusCode = 409
    throw err
  }

  if (String(request.requesterId) === String(helperId)) {
    const err = new Error('You cannot accept your own request')
    err.statusCode = 403
    throw err
  }

  const taken = await HelpMatch.findOne({
    requestId,
    status: HELP_MATCH_STATUS.ACCEPTED,
    helperId: { $ne: helperId },
  }).select('helperId')
  if (taken) {
    const err = new Error('Request is no longer available')
    err.statusCode = 409
    throw err
  }

  let match = await HelpMatch.findOne({ requestId, helperId })
  if (match && match.status === HELP_MATCH_STATUS.COMPLETED) {
    const err = new Error('Request not found or already responded')
    err.statusCode = 409
    throw err
  }
  if (match && match.status === HELP_MATCH_STATUS.ACCEPTED) {
    return { request, match }
  }

  if (!match) {
    try {
      match = await HelpMatch.create({
        requestId,
        helperId,
        status: HELP_MATCH_STATUS.PENDING,
        notifiedAt: new Date(),
      })
    } catch (e) {
      if (e && e.code === 11000) {
        match = await HelpMatch.findOne({ requestId, helperId })
      } else {
        throw e
      }
    }
  }

  const extendUntil = new Date(Date.now() + AUTO_CLOSE.HELP_MATCHED_EXTENSION_MINUTES * 60 * 1000)
  let promoted
  try {
    promoted = await HelpMatch.findOneAndUpdate(
      {
        _id: match._id,
        status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED] },
      },
      {
        $set: {
          status: HELP_MATCH_STATUS.ACCEPTED,
          acceptedAt: new Date(),
          respondedAt: new Date(),
          'helperClosure.wasResolved': null,
          'helperClosure.accountability': null,
          'helperClosure.rating': null,
          'helperClosure.closedAt': null,
        },
      },
      { new: true }
    )
  } catch (e) {
    if (e && e.code === 11000) {
      const err = new Error('Request is no longer available')
      err.statusCode = 409
      throw err
    }
    throw e
  }

  if (!promoted) {
    const selfAccepted = await HelpMatch.findOne({ requestId, helperId, status: HELP_MATCH_STATUS.ACCEPTED })
    if (selfAccepted) {
      request = await HelpRequest.findById(requestId)
      return { request, match: selfAccepted }
    }
    const err = new Error('Request is no longer available')
    err.statusCode = 409
    throw err
  }

  const sessionEndsAt = new Date(
    Date.now() + parseRequestedDurationMinutes(request.requestedDurationLabel) * 60 * 1000
  )

  const reqUpdated = await HelpRequest.findOneAndUpdate(
    {
      _id: requestId,
      status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING] },
    },
    {
      $set: {
        status: HELP_REQUEST_STATUS.MATCHED,
        matchedAt: new Date(),
        activeAt: new Date(),
        autoCloseScheduledAt: extendUntil,
        sessionEndsAt,
        completionPromptSentAt: null,
      },
    },
    { new: true }
  )

  if (!reqUpdated) {
    await HelpMatch.findOneAndUpdate(
      { _id: promoted._id },
      {
        $set: { status: HELP_MATCH_STATUS.PENDING },
        $unset: { acceptedAt: 1, respondedAt: 1 },
      }
    )
    const err = new Error('Request is no longer available')
    err.statusCode = 409
    throw err
  }

  request = reqUpdated
  match = promoted

  removeHelpRequestLocation(requestId).catch(e => logger.error('Redis remove on accept failed', e))

  try {
    emitToUser(String(request.requesterId), 'help:accepted', {
      requestId: String(requestId),
      helperId: String(helperId),
      sessionEndsAt:
        request.sessionEndsAt != null
          ? new Date(request.sessionEndsAt).toISOString()
          : sessionEndsAt.toISOString(),
    })
  } catch (e) {
    logger.error('Failed to emit help:accepted', e)
  }

  const otherHelpers = await HelpMatch.find({
    requestId,
    helperId: { $ne: helperId },
    status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED] },
  })

  for (const h of otherHelpers) {
    emitToUser(h.helperId, 'help:request_taken', { requestId })
  }

  const otherHelperIds = otherHelpers.map(h => h.helperId)
  if (otherHelperIds.length > 0) {
    sendCancelAlert(otherHelperIds, requestId).catch(err => logger.error('Failed to send cancel alert', err))
  }

  await HelpMatch.updateMany(
    { requestId, helperId: { $ne: helperId }, status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED] } },
    { status: HELP_MATCH_STATUS.CANCELLED }
  )

  const helper = await require('../models/User').findById(helperId).select('fullName')
  await sendMatchedNotification(request.requesterId, helper?.fullName || 'Someone', requestId)

  try {
    await chatService.createSession({
      requestId,
      requestType: 'HelpRequest',
      requesterId: request.requesterId,
      helperId,
    })
  } catch (error) {
    logger.error('[HelpRequestService] Error creating chat session', error)
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
      await emitHelpRequestStatsUpdate({
        requestId,
        requesterId: request.requesterId,
        type: 'declined',
        extra: { helperId },
      })
    }
  }

  return { message: 'Declined' }
}

/**
 * Request cancel karo (requester)
 */
const cancelRequest = async (requesterId, requestId) => {
  logger.info(`[HelpRequest] cancelRequest by=${requesterId} id=${requestId}`)
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

  const matchesBeforeCancel = await HelpMatch.find({ requestId })
    .select('helperId status')
    .lean()

  // All pending/notified/accepted matches cancel karo
  await HelpMatch.updateMany(
    { requestId, status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED, HELP_MATCH_STATUS.ACCEPTED] } },
    { status: HELP_MATCH_STATUS.CANCELLED }
  )

  const occurredAt = new Date().toISOString()
  try {
    const helperIds = [...new Set(matchesBeforeCancel.map((m) => String(m.helperId)).filter(Boolean))]
    const acceptedHelperIds = [...new Set(
      matchesBeforeCancel
        .filter((m) => String(m.status || '').toLowerCase() === HELP_MATCH_STATUS.ACCEPTED)
        .map((m) => String(m.helperId))
        .filter(Boolean)
    )]

    emitToUser(String(requesterId), 'help:request_closed', {
      requestId: String(requestId),
      requestType: request?.category || 'help_request',
      closedBy: String(requesterId),
      reason: 'cancelled',
      occurredAt,
      userRole: 'requester',
    })

    for (const hid of acceptedHelperIds) {
      emitToUser(hid, 'help:request_closed', {
        requestId: String(requestId),
        requestType: request?.category || 'help_request',
        closedBy: String(requesterId),
        reason: 'cancelled',
        occurredAt,
        userRole: 'helper',
      })
    }

    if (helperIds.length > 0) {
      sendCancelAlert(helperIds, requestId).catch(err => logger.error('Failed to send cancel alert', err))
    }
  } catch (e) {
    logger.error('Failed to emit cancel updates', e)
  }

  try {
    const ChatSession = require('../models/ChatSession')
    const session = await ChatSession.findOne({ requestId })
    if (session) {
      await chatService.closeSession(session._id)
    }
  } catch (e) {
    logger.error('Failed to close chat session on cancel', e)
  }

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
  request.requesterTrustSignals = await buildTrustSignalsForUser(request.requesterId?._id || request.requesterId)

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
    await emitHelpRequestStatsUpdate({
      requestId,
      requesterId,
      type: 'viewed',
      extra: { viewerId: userId },
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
      volunteer.trustSignals = await buildTrustSignalsForUser(match.helperId)
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
        volunteer.trustSignals = await buildTrustSignalsForUser(acceptedMatch.helperId)
      }
    }
  }

  return { request, match, volunteer }
}

/**
 * User ki active requests (multiple concurrent allowed: arrays + first-item legacy fields)
 */
const getMyActiveRequest = async (userId) => {
  logger.info(`[HelpRequest] getMyActiveRequest for=${userId}`)

  const requests = await HelpRequest.find({
    requesterId: userId,
    status: { $in: ['open', 'matching', 'matched', 'active'] },
  })
    .sort({ updatedAt: -1 })
    .populate('requesterId', 'fullName location profileImage')

  const requesterDataList = []
  for (const request of requests) {
    logger.info(`[HelpRequest] Active as requester id=${request._id} status=${request.status}`)
    const stats = await computeHelpRequestStats(request._id)
    const matches = await HelpMatch.find({ requestId: request._id })

    let volunteer = null
    if (request.status === 'matched' || request.status === 'active') {
      const acceptedMatch = matches.find((m) => m.status === 'accepted')
      if (acceptedMatch) {
        const helperUser = await require('../models/User').findById(acceptedMatch.helperId).select('fullName phone profileImage')
        if (helperUser) {
          volunteer = helperUser.toObject()
          if (volunteer.profileImage) {
            volunteer.profileImage = normalizeProfileImage(volunteer.profileImage)
          }
          if (!volunteer.profileImage) {
            const ver = await Verification.findOne({ userId: acceptedMatch.helperId }).select('selfie')
            if (ver?.selfie?.fileUrl) volunteer.profileImage = normalizeProfileImage(ver.selfie.fileUrl)
          }
        }
      }
    }
    const requesterData = { ...request.toObject(), stats, volunteer }

    if (requesterData.requesterId && requesterData.requesterId.profileImage) {
      requesterData.requesterId.profileImage = normalizeProfileImage(requesterData.requesterId.profileImage)
    }

    if (requesterData.requesterId && !requesterData.requesterId.profileImage) {
      const ver = await Verification.findOne({ userId: requesterData.requesterId._id }).select('selfie')
      if (ver?.selfie?.fileUrl) {
        requesterData.requesterId.profileImage = normalizeProfileImage(ver.selfie.fileUrl)
      }
    }
    requesterData.requesterTrustSignals = await buildTrustSignalsForUser(
      requesterData.requesterId?._id || requesterData.requesterId
    )
    requesterDataList.push(requesterData)
  }

  const activeHelpMatches = await HelpMatch.find({
    helperId: userId,
    status: 'accepted',
  })
    .sort({ acceptedAt: -1 })
    .populate({
      path: 'requestId',
      match: { status: { $in: ['matched', 'active'] } },
      populate: { path: 'requesterId', select: 'fullName location profileImage' },
    })

  const helperDataList = []
  for (const activeHelpMatch of activeHelpMatches) {
    if (!activeHelpMatch.requestId) continue
    logger.info(
      `[HelpRequest] Active as helper match=${activeHelpMatch._id} req=${activeHelpMatch.requestId?._id} status=${activeHelpMatch.status}`
    )
    let reqObj = activeHelpMatch.requestId.toObject()

    if (reqObj.requesterId && reqObj.requesterId.profileImage) {
      reqObj.requesterId.profileImage = normalizeProfileImage(reqObj.requesterId.profileImage)
    }

    if (reqObj.requesterId && !reqObj.requesterId.profileImage) {
      const ver = await Verification.findOne({ userId: reqObj.requesterId._id }).select('selfie')
      if (ver?.selfie?.fileUrl) {
        reqObj.requesterId.profileImage = normalizeProfileImage(ver.selfie.fileUrl)
      }
    }
    reqObj.requesterTrustSignals = await buildTrustSignalsForUser(reqObj.requesterId?._id || reqObj.requesterId)

    helperDataList.push({
      matchId: activeHelpMatch._id,
      request: reqObj,
      status: activeHelpMatch.status,
      acceptedAt: activeHelpMatch.acceptedAt,
    })
  }

  logger.info(
    `[HelpRequest] Active summary requesterCount=${requesterDataList.length} helperCount=${helperDataList.length}`
  )
  return {
    activeRequest: requesterDataList[0] || null,
    activeRequests: requesterDataList,
    activeHelp: helperDataList[0] || null,
    activeHelps: helperDataList,
  }
}

/**
 * Mark request as delivered/received by helper
 */
const markAsDelivered = async (helperId, requestId) => {
  const now = new Date()
  let match = await HelpMatch.findOneAndUpdate(
    {
      requestId,
      helperId,
      status: HELP_MATCH_STATUS.PENDING,
      markedDeliveredAt: null,
    },
    {
      $set: {
        markedDeliveredAt: now,
        status: HELP_MATCH_STATUS.NOTIFIED,
      },
    },
    { new: true }
  )
  if (!match) {
    match = await HelpMatch.findOneAndUpdate(
      {
        requestId,
        helperId,
        status: { $in: [HELP_MATCH_STATUS.NOTIFIED, HELP_MATCH_STATUS.ACCEPTED] },
        markedDeliveredAt: null,
      },
      { $set: { markedDeliveredAt: now } },
      { new: true }
    )
  }

  if (match) {
    const request = await HelpRequest.findById(requestId).select('requesterId')
    if (request) {
      await emitHelpRequestStatsUpdate({
        requestId,
        requesterId: request.requesterId,
        type: 'delivered',
        extra: { helperId },
      })
      if (String(match.status || '').toLowerCase() === HELP_MATCH_STATUS.ACCEPTED) {
        sendHelperArrivedNotification(String(request.requesterId), {
          requestId,
          helperId,
          distanceMeters: match.distanceMeters,
        }).catch((e) => logger.error('sendHelperArrivedNotification failed', e))
      }
    }
    return { success: true }
  }

  const already = await HelpMatch.findOne({
    requestId,
    helperId,
    status: { $in: [HELP_MATCH_STATUS.NOTIFIED, HELP_MATCH_STATUS.ACCEPTED] },
    markedDeliveredAt: { $ne: null },
  }).select('_id')

  if (already) {
    return { success: true, message: 'Already marked' }
  }

  return { success: false, message: 'Already processed or not found' }
}

/**
 * Nearby help requests dhundho jo open/matching hain
 */
const getNearbyHelpRequests = async (userId, coords = null) => {
  let lng, lat;

  if (coords && (coords.lat !== undefined || coords.latitude !== undefined) && (coords.lng !== undefined || coords.longitude !== undefined)) {
    lng = coords.lng !== undefined ? coords.lng : coords.longitude;
    lat = coords.lat !== undefined ? coords.lat : coords.latitude;
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

  if (lng === undefined || lat === undefined || isNaN(parseFloat(lng)) || isNaN(parseFloat(lat))) {
    return []
  }

  lng = parseFloat(lng);
  lat = parseFloat(lat);

  const { calculateDistance } = require('../utils/geoQuery')

  // 1. Try REDIS first
  let redisRequestIds = await getNearbyHelpRequestIds(lng, lat, GEO.DEFAULT_RADIUS_METERS);

  if (redisRequestIds && redisRequestIds.length > 0) {
    logger.info(`Redis found ${redisRequestIds.length} nearby requests.`)
    const requests = await HelpRequest.find({
      _id: { $in: redisRequestIds },
      requesterId: { $ne: userId },
      status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING] },
    }).populate('requesterId', 'fullName profileImage')

    if (requests.length > 0) {
      const acceptedMatches = await HelpMatch.find({
        requestId: { $in: requests.map((r) => r._id) },
        status: HELP_MATCH_STATUS.ACCEPTED,
      }).select('requestId')
      const acceptedSet = new Set(acceptedMatches.map((m) => String(m.requestId)))

      const filtered = []
      for (const req of requests) {
        if (acceptedSet.has(String(req._id))) continue
        const match = await HelpMatch.findOne({ requestId: req._id, helperId: userId })
        if (match && ['declined', 'not_available', 'accepted', 'completed', 'cancelled'].includes(match.status)) continue

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
    status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING] },
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

  const acceptedMatches = await HelpMatch.find({
    requestId: { $in: requests.map((r) => r._id) },
    status: HELP_MATCH_STATUS.ACCEPTED,
  }).select('requestId')
  const acceptedSet = new Set(acceptedMatches.map((m) => String(m.requestId)))

  const filtered = []
  for (const req of requests) {
    if (acceptedSet.has(String(req._id))) continue
    const match = await HelpMatch.findOne({ requestId: req._id, helperId: userId })

    // Agar helper ne pehle hi accept kar liya hai ya request closed ho chuka hai toh mat dikhao
    if (match && ['accepted', 'completed', 'cancelled'].includes(match.status)) {
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

const extendHelpSession = async (requesterId, requestId, additionalMinutes) => {
  const minutes = Number(additionalMinutes)
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 120) {
    const err = new Error('additionalMinutes must be between 5 and 120')
    err.statusCode = 400
    throw err
  }

  const rid = String(requestId)
  const request = await HelpRequest.findById(rid)
  if (!request) {
    const err = new Error('Request not found')
    err.statusCode = 404
    throw err
  }
  if (String(request.requesterId) !== String(requesterId)) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
  }
  if (![HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE].includes(request.status)) {
    const err = new Error('Request is not active')
    err.statusCode = 409
    throw err
  }

  const match = await HelpMatch.findOne({ requestId: rid, status: HELP_MATCH_STATUS.ACCEPTED })
  if (!match) {
    const err = new Error('No accepted helper for this request')
    err.statusCode = 409
    throw err
  }

  const now = new Date()
  const prevEnd = request.sessionEndsAt ? new Date(request.sessionEndsAt) : now
  const base = prevEnd > now ? prevEnd : now
  const sessionEndsAt = new Date(base.getTime() + minutes * 60 * 1000)

  const updated = await HelpRequest.findByIdAndUpdate(
    rid,
    { $set: { sessionEndsAt, completionPromptSentAt: null } },
    { new: true }
  )

  const payload = {
    requestId: rid,
    sessionEndsAt: sessionEndsAt.toISOString(),
  }
  try {
    emitToUser(String(requesterId), 'help:session_updated', payload)
    emitToUser(String(match.helperId), 'help:session_updated', payload)
  } catch (e) {
    logger.error('help:session_updated emit failed', e)
  }

  try {
    await sendHelperSessionExtendedNotification(match.helperId, {
      requestId: rid,
      additionalMinutes: minutes,
      sessionEndsAt,
    })
  } catch (e) {
    logger.error('sendHelperSessionExtendedNotification failed', e)
  }

  return { request: updated }
}

const getAcceptedMatchForRequest = async (requestId) => {
  return HelpMatch.findOne({ requestId, status: HELP_MATCH_STATUS.ACCEPTED }).select('helperId')
}

const createBorrowItemRequest = async (requesterId, requestId, { itemName, note, requestedMinutes, imageUrl }) => {
  const request = await HelpRequest.findById(requestId).select('_id requesterId status')
  if (!request) {
    const err = new Error('Request not found')
    err.statusCode = 404
    throw err
  }
  if (String(request.requesterId) !== String(requesterId)) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
  }
  if (![HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE].includes(String(request.status || '').toLowerCase())) {
    const err = new Error('Request is not active for borrow items')
    err.statusCode = 409
    throw err
  }

  const acceptedMatch = await getAcceptedMatchForRequest(requestId)
  if (!acceptedMatch?.helperId) {
    const err = new Error('No active helper assigned')
    err.statusCode = 409
    throw err
  }

  const doc = await HelpBorrowItem.create({
    requestId,
    requesterId,
    helperId: acceptedMatch.helperId,
    itemName,
    note: note || '',
    requestedMinutes: Number(requestedMinutes),
    imageUrl: imageUrl || '',
    status: 'pending',
    initiatedBy: 'requester',
  })

  const payload = {
    borrowId: String(doc._id),
    requestId: String(requestId),
    requesterId: String(requesterId),
    helperId: String(acceptedMatch.helperId),
    itemName: doc.itemName,
    note: doc.note || '',
    requestedMinutes: String(doc.requestedMinutes),
    imageUrl: doc.imageUrl || '',
    status: doc.status,
    initiatedBy: 'requester',
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  }

  try {
    emitToUser(String(acceptedMatch.helperId), 'help:borrow_requested', payload)
  } catch (e) {
    logger.error('help:borrow_requested emit failed', e)
  }

  try {
    const requester = await require('../models/User').findById(requesterId).select('fullName')
    await sendBorrowItemRequestNotification(String(acceptedMatch.helperId), {
      ...payload,
      requesterName: requester?.fullName || 'Requester',
    })
  } catch (e) {
    logger.error('sendBorrowItemRequestNotification failed', e)
  }

  return { item: doc }
}

const getBorrowItems = async (userId, requestId) => {
  const request = await HelpRequest.findById(requestId).select('_id requesterId status')
  if (!request) {
    const err = new Error('Request not found')
    err.statusCode = 404
    throw err
  }
  const acceptedMatch = await getAcceptedMatchForRequest(requestId)
  const helperId = acceptedMatch?.helperId ? String(acceptedMatch.helperId) : ''
  const allowed =
    String(request.requesterId) === String(userId) ||
    (helperId && helperId === String(userId))
  if (!allowed) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
  }

  const items = await HelpBorrowItem.find({ requestId })
    .sort({ createdAt: -1 })
    .lean()
  return { items }
}

const createOfferItemRequest = async (helperId, requestId, { itemName, note, requestedMinutes, imageUrl }) => {
  const request = await HelpRequest.findById(requestId).select('_id requesterId status')
  if (!request) {
    const err = new Error('Request not found')
    err.statusCode = 404
    throw err
  }
  if (![HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE].includes(String(request.status || '').toLowerCase())) {
    const err = new Error('Request is not active for offers')
    err.statusCode = 409
    throw err
  }

  const acceptedMatch = await getAcceptedMatchForRequest(requestId)
  if (!acceptedMatch?.helperId || String(acceptedMatch.helperId) !== String(helperId)) {
    const err = new Error('Only the assigned helper can send an offer')
    err.statusCode = 403
    throw err
  }

  const pendingOffer = await HelpBorrowItem.findOne({
    requestId,
    helperId,
    status: 'pending',
    initiatedBy: 'helper',
  })
    .select('_id')
    .lean()
  if (pendingOffer) {
    const err = new Error('You already have a pending offer for this request')
    err.statusCode = 409
    err.code = 'OFFER_ITEM_PENDING_EXISTS'
    throw err
  }

  const doc = await HelpBorrowItem.create({
    requestId,
    requesterId: request.requesterId,
    helperId,
    itemName,
    note: note || '',
    requestedMinutes: Number(requestedMinutes),
    imageUrl: imageUrl || '',
    status: 'pending',
    initiatedBy: 'helper',
  })

  const helperUser = await User.findById(helperId).select('fullName').lean()
  const helperName = helperUser?.fullName || 'Helper'

  const payload = {
    offerId: String(doc._id),
    borrowId: String(doc._id),
    requestId: String(requestId),
    requesterId: String(request.requesterId),
    helperId: String(helperId),
    helperName,
    itemName: doc.itemName,
    note: doc.note || '',
    requestedMinutes: String(doc.requestedMinutes),
    imageUrl: doc.imageUrl || '',
    status: doc.status,
    initiatedBy: 'helper',
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
  }

  try {
    emitToUser(String(request.requesterId), 'help:offer_requested', payload)
  } catch (e) {
    logger.error('help:offer_requested emit failed', e)
  }

  try {
    await sendOfferItemRequestNotification(String(request.requesterId), {
      ...payload,
      offerId: String(doc._id),
    })
  } catch (e) {
    logger.error('sendOfferItemRequestNotification failed', e)
  }

  return { item: doc }
}

const respondOfferItemRequest = async (requesterId, requestId, offerId, { action }) => {
  const request = await HelpRequest.findById(requestId).select('_id requesterId').lean()
  if (!request) {
    const err = new Error('Request not found')
    err.statusCode = 404
    throw err
  }
  if (String(request.requesterId) !== String(requesterId)) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
  }

  const status = action === 'accept' ? 'accepted' : 'declined'
  const item = await HelpBorrowItem.findOneAndUpdate(
    { _id: offerId, requestId, requesterId, status: 'pending', initiatedBy: 'helper' },
    { $set: { status, actedAt: new Date(), actedBy: requesterId } },
    { new: true }
  )
  if (!item) {
    const err = new Error('Offer not found or already handled')
    err.statusCode = 404
    throw err
  }

  const helperUser = await User.findById(item.helperId).select('fullName').lean()
  const helperName = helperUser?.fullName || 'Helper'

  const responsePayload = {
    offerId: String(item._id),
    borrowId: String(item._id),
    requestId: String(requestId),
    status: item.status,
    initiatedBy: 'helper',
    helperId: String(item.helperId),
    helperName,
    requesterId: String(item.requesterId),
    actedAt: item.actedAt ? item.actedAt.toISOString() : new Date().toISOString(),
    itemName: item.itemName,
    note: item.note || '',
    requestedMinutes: String(item.requestedMinutes),
    imageUrl: item.imageUrl || '',
  }

  try {
    emitToUser(String(item.requesterId), 'help:offer_response', responsePayload)
    emitToUser(String(item.helperId), 'help:offer_response', responsePayload)
  } catch (e) {
    logger.error('help:offer_response emit failed', e)
  }

  return { item }
}

const respondBorrowItemRequest = async (helperId, requestId, borrowId, { action }) => {
  const acceptedMatch = await getAcceptedMatchForRequest(requestId)
  if (!acceptedMatch?.helperId || String(acceptedMatch.helperId) !== String(helperId)) {
    const err = new Error('Only current helper can respond')
    err.statusCode = 403
    throw err
  }

  const status = action === 'accept' ? 'accepted' : 'declined'
  const item = await HelpBorrowItem.findOneAndUpdate(
    {
      _id: borrowId,
      requestId,
      helperId,
      status: 'pending',
      initiatedBy: { $ne: 'helper' },
    },
    { $set: { status, actedAt: new Date(), actedBy: helperId } },
    { new: true }
  )
  if (!item) {
    const err = new Error('Borrow request not found or already handled')
    err.statusCode = 404
    throw err
  }

  const responsePayload = {
    borrowId: String(item._id),
    requestId: String(requestId),
    status: item.status,
    actedAt: item.actedAt ? item.actedAt.toISOString() : new Date().toISOString(),
    helperId: String(helperId),
    initiatedBy: item.initiatedBy || 'requester',
  }

  try {
    emitToUser(String(item.requesterId), 'help:borrow_response', responsePayload)
    emitToUser(String(helperId), 'help:borrow_response', responsePayload)
  } catch (e) {
    logger.error('help:borrow_response emit failed', e)
  }

  return { item }
}

// ─── Late / incremental helper notifications (open + matching requests) ─────

const PENDING_RETRY_COOLDOWN_MS = 90 * 1000

/**
 * One helper + one open help request: create HelpMatch if needed, send FCM if not already notified.
 * Safe to call repeatedly (cron + availability toggle).
 */
const tryNotifyHelperForOpenHelpRequest = async (helperId, requestId) => {
  const helperIdStr = String(helperId)
  const requestIdStr = String(requestId)

  const req = await HelpRequest.findById(requestIdStr)
    .select('status requesterId location category categoryName categoryIcon description')
    .lean()
  if (!req) return

  const st = String(req.status || '').toLowerCase()
  if (![HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING].includes(st)) return

  const requesterIdStr = String(req.requesterId || '')
  if (!requesterIdStr || helperIdStr === requesterIdStr) return

  const anyAccepted = await HelpMatch.findOne({
    requestId: requestIdStr,
    status: HELP_MATCH_STATUS.ACCEPTED,
  })
    .select('_id')
    .lean()
  if (anyAccepted) return

  const coords = req.location?.coordinates
  if (!Array.isArray(coords) || coords.length !== 2) return

  const helperUser = await User.findById(helperIdStr).select('location isAvailable accountStatus isDeleted').lean()
  if (!helperUser || helperUser.isDeleted || !helperUser.isAvailable) return
  const hCoords = helperUser.location?.coordinates
  if (!Array.isArray(hCoords) || hCoords.length !== 2) return

  const dist = calculateDistance(coords[0], coords[1], hCoords[0], hCoords[1])
  if (dist > GEO.DEFAULT_RADIUS_METERS) return

  try {
    const { getBlacklistedHelpersForRequester } = require('./requestClosure.service')
    const blocked = await getBlacklistedHelpersForRequester(requesterIdStr)
    if (blocked.includes(helperIdStr)) return
  } catch (e) {
    logger.error('[tryNotifyHelperForOpenHelpRequest] blacklist read failed', e)
  }

  try {
    const busy = await getBusyRequesterIdSet([helperIdStr])
    if (busy.has(helperIdStr)) return
  } catch (e) {
    logger.error('[tryNotifyHelperForOpenHelpRequest] busy check failed', e)
  }

  const existing = await HelpMatch.findOne({ requestId: requestIdStr, helperId: helperIdStr }).lean()
  if (existing) {
    const ms = String(existing.status || '').toLowerCase()
    if (['declined', 'not_available', 'cancelled', 'completed', 'accepted'].includes(ms)) return
    if (ms === HELP_MATCH_STATUS.NOTIFIED || ms === 'notified') return
    if (ms === HELP_MATCH_STATUS.PENDING || ms === 'pending') {
      const last = new Date(existing.markedDeliveredAt || existing.notifiedAt || existing.createdAt).getTime()
      if (Date.now() - last < PENDING_RETRY_COOLDOWN_MS) return
    }
  }

  const requestDoc = await HelpRequest.findById(requestIdStr)
  if (!requestDoc) return

  const helperObj = { _id: helperIdStr, distanceMeters: dist }

  if (!existing) {
    try {
      await HelpMatch.create({
        requestId: requestIdStr,
        helperId: helperIdStr,
        status: HELP_MATCH_STATUS.PENDING,
        distanceMeters: dist,
        notifiedAt: new Date(),
      })
    } catch (e) {
      if (e && e.code !== 11000) throw e
    }
  }

  const alertResult = await sendHelpRequestAlert([helperObj], requestDoc)
  const delivered = Array.isArray(alertResult?.deliveredHelperIds)
    ? alertResult.deliveredHelperIds.map(String)
    : []
  if (delivered.includes(helperIdStr)) {
    await HelpMatch.updateOne(
      { requestId: requestIdStr, helperId: helperIdStr, status: HELP_MATCH_STATUS.PENDING },
      {
        $set: {
          status: HELP_MATCH_STATUS.NOTIFIED,
          markedDeliveredAt: new Date(),
          distanceMeters: dist,
        },
      }
    )
    await emitHelpRequestStatsUpdate({
      requestId: requestIdStr,
      requesterId: requesterIdStr,
      type: 'notified',
      extra: { deliveredCount: 1, incremental: true },
    })
  }

  try {
    emitToUser(helperIdStr, 'help:incoming_request', {
      requestId: requestIdStr,
      requesterId: requesterIdStr,
      category: requestDoc.category || '',
      categoryName: requestDoc.categoryName || '',
      categoryIcon: requestDoc.categoryIcon || '',
      description: requestDoc.description || '',
      distanceMeters: String(Math.round(dist)),
      area: requestDoc.location?.address || '',
    })
  } catch (e) {
    logger.error('help:incoming_request emit failed (incremental)', e)
  }

  if (delivered.includes(helperIdStr) && st === HELP_REQUEST_STATUS.MATCHING) {
    await HelpRequest.updateOne(
      { _id: requestIdStr, status: HELP_REQUEST_STATUS.MATCHING },
      { $set: { status: HELP_REQUEST_STATUS.OPEN } }
    )
  }
}

/**
 * Helper ne availability ON kiya / location update — Redis ke aas-paas ke open requests scan karke notify.
 */
const notifyMatchingHelpRequestsForHelper = async (helperId) => {
  const helperIdStr = String(helperId)
  const user = await User.findById(helperIdStr).select('location isAvailable isDeleted').lean()
  if (!user || user.isDeleted || !user.isAvailable) return
  const coords = user.location?.coordinates
  if (!Array.isArray(coords) || coords.length !== 2) return
  const [lng, lat] = coords

  let ids = await getNearbyHelpRequestIds(lng, lat, GEO.DEFAULT_RADIUS_METERS)
  if (!ids || !ids.length) return
  ids = [...new Set(ids.map(String))].slice(0, 50)

  for (const rid of ids) {
    try {
      await tryNotifyHelperForOpenHelpRequest(helperIdStr, rid)
    } catch (e) {
      logger.error(`[notifyMatchingHelpRequestsForHelper] rid=${rid}`, e)
    }
  }
}

/**
 * Cron: har open/matching request ke liye abhi radius me jo helpers available hain unko notify (incremental).
 */
const notifyMissingHelpersForOpenRequestsBatch = async () => {
  const reqs = await HelpRequest.find({
    status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING] },
  })
    .select('_id requesterId location category')
    .limit(35)
    .lean()

  for (const req of reqs) {
    let helpers = []
    try {
      const coords = req.location?.coordinates
      if (!Array.isArray(coords) || coords.length !== 2) continue
      helpers = await findHelpersForRequest({
        lng: coords[0],
        lat: coords[1],
        category: req.category,
        excludeIds: [req.requesterId],
      })
    } catch (e) {
      logger.error('[notifyMissingHelpersForOpenRequestsBatch] findHelpers failed', e)
      continue
    }

    for (const h of helpers) {
      try {
        await tryNotifyHelperForOpenHelpRequest(String(h._id), String(req._id))
      } catch (e) {
        logger.error('[notifyMissingHelpersForOpenRequestsBatch] notify failed', e)
      }
    }
  }
}

module.exports = {
  createRequest,
  updateRequest,
  acceptRequest,
  declineRequest,
  cancelRequest,
  getRequestById,
  getMyActiveRequest,
  markAsDelivered,
  getNearbyHelpRequests,
  extendHelpSession,
  createBorrowItemRequest,
  createOfferItemRequest,
  getBorrowItems,
  respondBorrowItemRequest,
  respondOfferItemRequest,
  notifyMatchingHelpRequestsForHelper,
  notifyMissingHelpersForOpenRequestsBatch,
}
