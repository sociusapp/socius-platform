const HelpRequest = require('../models/HelpRequest')
const HelpMatch = require('../models/HelpMatch')
const ClosureStatus = require('../models/ClosureStatus')
const logger = require('../utils/logger')
const { HELP_REQUEST_STATUS, HELP_MATCH_STATUS } = require('../utils/constants')
const { emitToUser } = require('../config/socket')
const { sendHelpClosureInitiatedNotification, sendHelpRequestClosedNotification } = require('./notification.service')
const { closeSession } = require('./chat.service')
const { updateCommunityBalance } = require('./communityBalance.service')
const { awardBadgeIfEarned } = require('./badge.service')

const safeEmitToUser = (userId, event, data) => {
  try {
    if (!userId) return
    emitToUser(String(userId), event, data)
  } catch (e) {
    logger.error('Socket emit failed', e)
  }
}

const ensureAcceptedMatch = async (requestId) => {
  return HelpMatch.findOne({
    requestId,
    status: { $in: ['accepted', 'completed'] }
  })
}

const getOrCreateClosure = async ({ requestId, requesterId, helperId }) => {
  let doc = await ClosureStatus.findOne({ requestId, helperId })
  if (!doc) {
    doc = await ClosureStatus.create({ requestId, requesterId, helperId, status: 'initiated' })
  }
  return doc
}

const initiateClosure = async (userId, { requestId, rating, feedback }) => {
  const request = await HelpRequest.findById(requestId)
  if (!request) {
    const err = new Error('Request not found')
    err.statusCode = 404
    throw err
  }
  const match = await ensureAcceptedMatch(requestId)
  if (!match) {
    const err = new Error('No accepted helper for this request')
    err.statusCode = 409
    throw err
  }
  const isRequester = String(userId) === String(request.requesterId)
  const isHelper = String(userId) === String(match.helperId)
  if (!isRequester && !isHelper) {
    const err = new Error('Not authorized to close this request')
    err.statusCode = 403
    throw err
  }

  const closure = await getOrCreateClosure({
    requestId,
    requesterId: request.requesterId,
    helperId: match.helperId
  })

  if (isRequester) {
    const providedHelp = typeof feedback?.providedHelp === 'boolean' ? feedback.providedHelp : null
    if (providedHelp !== false) {
      if (!rating || rating < 1 || rating > 5) {
        const err = new Error('Rating (1-5) is required')
        err.statusCode = 400
        throw err
      }
      closure.ratingByRequester = rating
    } else {
      closure.ratingByRequester = null
    }
    closure.requesterFeedback = {
      providedHelp,
      cancelledAfterAccept: !!feedback?.cancelledAfterAccept,
      noReplyAfterAccept: !!feedback?.noReplyAfterAccept,
      itemIssue: !!feedback?.itemIssue,
      itemIssueDescription: feedback?.itemIssueDescription || null,
      evidencePhotos: Array.isArray(feedback?.evidencePhotos) ? feedback.evidencePhotos : []
    }
    // Flags
    if (feedback?.itemIssue) closure.flags.itemIssue = true
    if (feedback?.cancelledAfterAccept || feedback?.noReplyAfterAccept || feedback?.providedHelp === false) {
      closure.flags.helperNoShow = true
    }
  } else if (isHelper) {
    const providedHelp = typeof feedback?.providedHelp === 'boolean' ? feedback.providedHelp : null
    if (providedHelp !== false) {
      if (!rating || rating < 1 || rating > 5) {
        const err = new Error('Rating (1-5) is required')
        err.statusCode = 400
        throw err
      }
      closure.ratingByHelper = rating
    } else {
      closure.ratingByHelper = null
    }
    closure.helperFeedback = {
      providedHelp,
      requesterUnavailable: !!feedback?.requesterUnavailable,
      safetyConcerns: !!feedback?.safetyConcerns,
      notes: feedback?.notes || null
    }
  }

  // Ghosting rule: if helper accepted but no reply, set deadline in 24 hours
  if (!closure.ghostingDeadlineAt) {
    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000)
    closure.ghostingDeadlineAt = deadline
  }

  // Determine status
  const requesterDone = typeof closure.requesterFeedback?.providedHelp === 'boolean' || !!closure.ratingByRequester
  const helperDone = typeof closure.helperFeedback?.providedHelp === 'boolean' || !!closure.ratingByHelper
  const conflictingFeedback =
    requesterDone &&
    helperDone &&
    typeof closure.requesterFeedback?.providedHelp === 'boolean' &&
    typeof closure.helperFeedback?.providedHelp === 'boolean' &&
    closure.requesterFeedback.providedHelp !== closure.helperFeedback.providedHelp
  if (requesterDone && helperDone) {
    closure.status = conflictingFeedback ? 'disputed' : 'closed'
    closure.closedAt = new Date()
  } else {
    closure.status = 'awaiting_other_party'
  }

  await closure.save()

  if (requesterDone && helperDone) {
    await finalizeClosureInternal(closure, userId)
  } else {
    if (!['closing', 'closed'].includes(request.status)) {
      request.status = HELP_REQUEST_STATUS.CLOSING || 'closing'
      await request.save()
    }

    const otherUserId = isRequester ? match.helperId : request.requesterId
    const occurredAt = new Date().toISOString()
    safeEmitToUser(otherUserId, 'help:closure_initiated', {
      requestId: String(requestId),
      requestType: request?.category || 'help_request',
      initiatedBy: isRequester ? 'requester' : 'helper',
      status: String(request.status || 'closing'),
      occurredAt,
    })
    sendHelpClosureInitiatedNotification(String(otherUserId), {
      requestId,
      requestType: request?.category || 'help_request',
      initiatedBy: isRequester ? 'requester' : 'helper',
      occurredAt,
    }).catch(() => {})
  }

  return closure.toObject()
}

const autoCloseIfGhosted = async (closure) => {
  if (!closure || !closure.ghostingDeadlineAt) return null
  if (closure.closedAt) return null

  const helperDone = typeof closure.helperFeedback?.providedHelp === 'boolean' || !!closure.ratingByHelper
  if (new Date() >= new Date(closure.ghostingDeadlineAt) && !helperDone) {
    closure.status = 'auto_closed_penalty'
    closure.flags.helperGhosted = true
    closure.flags.penaltyApplied = true
    closure.closedAt = new Date()
    await closure.save()
    await finalizeClosureInternal(closure, null)
    return closure
  }
  return null
}

const finalizeClosureInternal = async (closure, actorUserId) => {
  const request = await HelpRequest.findById(closure.requestId)
  if (!request) return null

  if (request.status === HELP_REQUEST_STATUS.CLOSED) {
    return request
  }

  request.status = HELP_REQUEST_STATUS.CLOSED || 'closed'
  request.closedAt = new Date()
  await request.save()

  const matchUpdate = await HelpMatch.findOneAndUpdate(
    { requestId: closure.requestId, helperId: closure.helperId, status: { $in: ['accepted', 'notified'] } },
    {
      status: HELP_MATCH_STATUS.COMPLETED,
      completedAt: new Date(),
      'helperClosure.wasResolved': closure.requesterFeedback?.providedHelp ?? null,
      'helperClosure.accountability': closure.flags?.helperNoShow ? 'no_show' : null,
      'helperClosure.rating': closure.ratingByRequester || null,
      'helperClosure.closedAt': new Date(),
    }
  )

  closure.finalizedBy = actorUserId || null
  await closure.save()

  const ChatSession = require('../models/ChatSession')
  const session = await ChatSession.findOne({ requestId: closure.requestId })
  if (session) {
    try {
      await closeSession(session._id)
    } catch (e) {
      logger.error('finalizeClosureInternal: closeSession failed', e)
    }
  }

  if (matchUpdate) {
    const wasResolved = closure.requesterFeedback?.providedHelp === true
    const accountability = closure.flags?.helperNoShow ? 'no_show' : wasResolved ? 'arrived_completed' : null
    try {
      await updateCommunityBalance(closure.helperId, 'help_given')
      await awardBadgeIfEarned(closure.helperId, { wasResolved, accountability })
    } catch (e) {
      logger.error('finalizeClosureInternal: balance/badge failed', e)
    }
  }

  const occurredAt = new Date().toISOString()
  safeEmitToUser(request.requesterId, 'help:request_closed', {
    requestId: String(closure.requestId),
    requestType: request?.category || 'help_request',
    closedBy: actorUserId ? String(actorUserId) : null,
    reason: 'finalized',
    occurredAt,
    userRole: 'requester',
  })
  safeEmitToUser(closure.helperId, 'help:request_closed', {
    requestId: String(closure.requestId),
    requestType: request?.category || 'help_request',
    closedBy: actorUserId ? String(actorUserId) : null,
    reason: 'finalized',
    occurredAt,
    userRole: 'helper',
  })
  sendHelpRequestClosedNotification(String(request.requesterId), {
    requestId: closure.requestId,
    requestType: request?.category || 'help_request',
    reason: 'finalized',
    occurredAt,
    recipientRole: 'requester',
  }).catch(() => {})
  sendHelpRequestClosedNotification(String(closure.helperId), {
    requestId: closure.requestId,
    requestType: request?.category || 'help_request',
    reason: 'finalized',
    occurredAt,
    recipientRole: 'helper',
  }).catch(() => {})

  return request
}

const getClosure = async (userId, requestId) => {
  const closure = await ClosureStatus.findOne({ requestId })
  if (!closure) {
    const err = new Error('Closure not found')
    err.statusCode = 404
    throw err
  }
  // Permission check
  if (![String(closure.requesterId), String(closure.helperId)].includes(String(userId))) {
    const err = new Error('Not allowed')
    err.statusCode = 403
    throw err
  }

  await autoCloseIfGhosted(closure)
  return closure.toObject()
}

const finalizeClosure = async (userId, { requestId }) => {
  const closure = await ClosureStatus.findOne({ requestId })
  if (!closure) {
    const err = new Error('Closure not found')
    err.statusCode = 404
    throw err
  }
  if (![String(closure.requesterId), String(closure.helperId)].includes(String(userId))) {
    const err = new Error('Not allowed')
    err.statusCode = 403
    throw err
  }
  const requesterDone = typeof closure.requesterFeedback?.providedHelp === 'boolean' || !!closure.ratingByRequester
  const helperDone = typeof closure.helperFeedback?.providedHelp === 'boolean' || !!closure.ratingByHelper
  if (!requesterDone || !helperDone) {
    const err = new Error('Both parties must submit closure feedback before finalizing')
    err.statusCode = 400
    throw err
  }
  closure.status = 'closed'
  closure.closedAt = new Date()
  await closure.save()
  await finalizeClosureInternal(closure, userId)
  return closure.toObject()
}

const getBlacklistedHelpersForRequester = async (requesterId) => {
  const docs = await ClosureStatus.find({
    requesterId,
    $or: [
      { 'flags.helperNoShow': true },
      { 'flags.helperGhosted': true },
      { ratingByRequester: { $lte: 2 } },
    ]
  }).select('helperId')
  const ids = [...new Set(docs.map(d => String(d.helperId)))]
  return ids
}

module.exports = {
  initiateClosure,
  getClosure,
  finalizeClosure,
  getBlacklistedHelpersForRequester,
}
