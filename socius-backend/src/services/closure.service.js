const HelpRequest = require('../models/HelpRequest')
const HelpMatch = require('../models/HelpMatch')
const PresenceRequest = require('../models/PresenceRequest')
const PresenceMatch = require('../models/PresenceMatch')
const { closeSession } = require('./chat.service')
const { updateCommunityBalance } = require('./communityBalance.service')
const { awardBadgeIfEarned } = require('./badge.service')
const { HELP_REQUEST_STATUS, HELP_MATCH_STATUS, PRESENCE_STATUS, PRESENCE_MATCH_STATUS } = require('../utils/constants')
const logger = require('../utils/logger')
const { removeHelpRequestLocation } = require('../config/redis')
const { emitToUser } = require('../config/socket')
const { sendHelpRequestClosedNotification } = require('./notification.service')

const safeEmitToUser = (userId, event, data) => {
  try {
    if (!userId) return
    emitToUser(String(userId), event, data)
  } catch (e) {
    logger.error('Socket emit failed', e)
  }
}

// ─── Help Request Close ───────────────────────────────────

/**
 * Help request close karo (requester ya helper)
 */
const closeHelpRequest = async (requestId, closedBy, { wasResolved, accountability, rating }) => {
  const request = await HelpRequest.findById(requestId)

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
  removeHelpRequestLocation(requestId).catch(e => logger.error('Redis remove on close failed', e))

  request.status = HELP_REQUEST_STATUS.CLOSED
  request.closedAt = new Date()
  await request.save()

  // Match update karo
  const match = await HelpMatch.findOneAndUpdate(
    {
      requestId,
      status: { $in: [HELP_MATCH_STATUS.ACCEPTED, HELP_MATCH_STATUS.NOTIFIED] },
    },
    {
      status: HELP_MATCH_STATUS.COMPLETED,
      completedAt: new Date(),
      'helperClosure.wasResolved': wasResolved,
      'helperClosure.accountability': accountability || null,
      'helperClosure.rating': rating || null,
      'helperClosure.closedAt': new Date(),
    },
    { new: true }
  )

  // Chat session close karo
  const ChatSession = require('../models/ChatSession')
  const session = await ChatSession.findOne({ requestId })
  if (session) await closeSession(session._id)

  // Community balance update
  if (match) {
    await updateCommunityBalance(match.helperId, 'help_given')
    // Badge check
    await awardBadgeIfEarned(match.helperId, { wasResolved, accountability })
  }

  logger.info(`Help request closed: ${requestId} by ${closedBy}`)
  const occurredAt = new Date().toISOString()
  safeEmitToUser(request.requesterId, 'help:request_closed', {
    requestId: String(requestId),
    requestType: request?.category || 'help_request',
    closedBy: closedBy ? String(closedBy) : null,
    reason: 'closed',
    occurredAt,
    userRole: 'requester',
  })
  sendHelpRequestClosedNotification(String(request.requesterId), {
    requestId,
    requestType: request?.category || 'help_request',
    reason: 'closed',
    occurredAt,
    recipientRole: 'requester',
  }).catch(() => {})
  if (match?.helperId) {
    safeEmitToUser(match.helperId, 'help:request_closed', {
      requestId: String(requestId),
      requestType: request?.category || 'help_request',
      closedBy: closedBy ? String(closedBy) : null,
      reason: 'closed',
      occurredAt,
      userRole: 'helper',
    })
    sendHelpRequestClosedNotification(String(match.helperId), {
      requestId,
      requestType: request?.category || 'help_request',
      reason: 'closed',
      occurredAt,
      recipientRole: 'helper',
    }).catch(() => {})
  }
  return request
}

/**
 * Presence request close karo
 */
const closePresenceRequest = async (presenceRequestId, closedBy, { closureReason }) => {
  const request = await PresenceRequest.findById(presenceRequestId)

  if (!request) {
    const err = new Error('Presence request not found')
    err.statusCode = 404
    throw err
  }

  if (request.status === PRESENCE_STATUS.CLOSED) {
    const err = new Error('Already closed')
    err.statusCode = 409
    throw err
  }

  request.status = PRESENCE_STATUS.CLOSED
  request.closedAt = new Date()
  request.closureReason = closureReason || null
  await request.save()

  // All active matches close karo
  await PresenceMatch.updateMany(
    {
      presenceRequestId,
      status: { $in: [PRESENCE_MATCH_STATUS.ACCEPTED, PRESENCE_MATCH_STATUS.EN_ROUTE, PRESENCE_MATCH_STATUS.ARRIVED] },
    },
    { status: PRESENCE_MATCH_STATUS.CLOSED, closedAt: new Date() }
  )

  // Chat sessions close karo
  const ChatSession = require('../models/ChatSession')
  const sessions = await ChatSession.find({ requestId: presenceRequestId })
  for (const s of sessions) await closeSession(s._id)

  // Presence dene wale helpers ka balance update karo
  const acceptedMatches = await PresenceMatch.find({
    presenceRequestId,
    status: PRESENCE_MATCH_STATUS.CLOSED,
  })
  for (const m of acceptedMatches) {
    await updateCommunityBalance(m.helperId, 'presence_given')
  }

  logger.info(`Presence request closed: ${presenceRequestId} by ${closedBy}`)
  return request
}

// ─── Auto Close (Cron job use karta hai) ─────────────────

/**
 * Inactive help requests auto close karo
 */
const autoCloseInactiveHelpRequests = async () => {
  const now = new Date()

  // Only unmatched requests: never auto-cancel an accepted / in-meeting pairing
  const staleRequests = await HelpRequest.find({
    status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING] },
    autoCloseScheduledAt: { $lt: now },
  })

  let count = 0
  for (const request of staleRequests) {
    const activeMatch = await HelpMatch.findOne({
      requestId: request._id,
      status: { $in: [HELP_MATCH_STATUS.ACCEPTED] },
    }).select('helperId')

    request.status = HELP_REQUEST_STATUS.AUTO_CLOSED
    request.autoClosedAt = now
    await request.save()

    await HelpMatch.updateMany(
      { requestId: request._id, status: { $in: [HELP_MATCH_STATUS.PENDING, HELP_MATCH_STATUS.NOTIFIED] } },
      { status: HELP_MATCH_STATUS.CANCELLED }
    )

    // Chat close karo
    const ChatSession = require('../models/ChatSession')
    const session = await ChatSession.findOne({ requestId: request._id })
    if (session) await closeSession(session._id)

    const occurredAt = new Date().toISOString()
    safeEmitToUser(request.requesterId, 'help:request_closed', {
      requestId: String(request._id),
      requestType: request?.category || 'help_request',
      closedBy: null,
      reason: 'auto_closed',
      occurredAt,
      userRole: 'requester',
    })
    sendHelpRequestClosedNotification(String(request.requesterId), {
      requestId: request._id,
      requestType: request?.category || 'help_request',
      reason: 'auto_closed',
      occurredAt,
      recipientRole: 'requester',
    }).catch(() => {})
    if (activeMatch?.helperId) {
      safeEmitToUser(activeMatch.helperId, 'help:request_closed', {
        requestId: String(request._id),
        requestType: request?.category || 'help_request',
        closedBy: null,
        reason: 'auto_closed',
        occurredAt,
        userRole: 'helper',
      })
      sendHelpRequestClosedNotification(String(activeMatch.helperId), {
        requestId: request._id,
        requestType: request?.category || 'help_request',
        reason: 'auto_closed',
        occurredAt,
        recipientRole: 'helper',
      }).catch(() => {})
    }

    count++
  }

  logger.info(`Auto-closed ${count} help requests`)
  return count
}

/**
 * Inactive presence requests auto close karo
 */
const autoCloseInactivePresenceRequests = async () => {
  const now = new Date()

  const staleRequests = await PresenceRequest.find({
    status: { $in: ['active', 'helpers_notified', 'helpers_accepted'] },
    autoCloseScheduledAt: { $lt: now },
  })

  let count = 0
  for (const request of staleRequests) {
    request.status = PRESENCE_STATUS.AUTO_CLOSED
    request.autoClosedAt = now
    await request.save()

    await PresenceMatch.updateMany(
      { presenceRequestId: request._id, status: { $in: ['alerted', 'accepted', 'en_route'] } },
      { status: 'not_responded' }
    )

    count++
  }

  logger.info(`Auto-closed ${count} presence requests`)
  return count
}

module.exports = {
  closeHelpRequest,
  closePresenceRequest,
  autoCloseInactiveHelpRequests,
  autoCloseInactivePresenceRequests,
}
