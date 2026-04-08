const DeviceToken = require('../models/DeviceToken')
const { sendToDeviceWithRetry, sendToMultipleDevices } = require('../config/firebase')
const { NOTIFICATION_TYPE, NOTIFICATION_PRIORITY, BADGE_TYPE } = require('../utils/constants')
const logger = require('../utils/logger')
const { shouldSendOnce } = require('./notificationDedupe.service')
const { rateLimit } = require('../config/redis')

/**
 * User ke active device tokens lo
 */
const getUserTokens = async (userId) => {
  const tokens = await DeviceToken.find({ userId, isActive: true }).select('token')
  return tokens.map((t) => t.token)
}

/**
 * Multiple users ke tokens lo
 */
const getMultipleUserTokens = async (userIds) => {
  const tokens = await DeviceToken.find({
    userId: { $in: userIds },
    isActive: true,
  }).select('token userId')
  return tokens
}

/**
 * Single user ko notification bhejo
 */
const notifyUser = async (userId, { title, body, data = {}, priority = 'normal' }) => {
  const tokens = await getUserTokens(userId)
  if (!tokens.length) {
    logger.warn(`No active tokens for user: ${userId}`)
    return { userId: String(userId), tokensFound: 0, successCount: 0, failureCount: 0 }
  }

  let successCount = 0
  let failureCount = 0
  for (const token of tokens) {
    // eslint-disable-next-line no-await-in-loop
    const r = await sendToDeviceWithRetry({ token, title, body, data, priority })
    if (r && r.success) successCount++
    else failureCount++
  }

  return { userId: String(userId), tokensFound: tokens.length, successCount, failureCount }
}

/**
 * Multiple users ko notification bhejo
 */
const notifyMultipleUsers = async (userIds, { title, body, data = {}, priority = 'normal' }) => {
  const tokenDocs = await getMultipleUserTokens(userIds)
  const tokens = tokenDocs.map((t) => t.token)

  if (!tokens.length) {
    logger.warn('No active tokens found for users')
    return { success: false, tokensFound: 0, successCount: 0, failureCount: 0 }
  }

  const result = await sendToMultipleDevices({ tokens, title, body, data, priority })
  const successCount = result?.successCount ?? 0
  const failureCount = result?.failureCount ?? 0
  const responses = Array.isArray(result?.responses) ? result.responses : []
  let invalidatedCount = 0
  let firstErrorCode = null
  let firstErrorMessage = null

  // Map token -> response by index and invalidate known-bad tokens
  for (let i = 0; i < responses.length; i++) {
    const r = responses[i]
    if (r && r.error && r.error.code) {
      const code = String(r.error.code)
      if (!firstErrorCode) {
        firstErrorCode = code
        firstErrorMessage = r.error.message || String(r.error)
      }
      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-registration-token')
      ) {
        try {
          await invalidateToken(tokens[i])
          invalidatedCount++
        } catch (_) {}
      }
    }
  }

  logger.info(`notifyMultipleUsers: tokens=${tokens.length}, success=${successCount}, failure=${failureCount}`)

  return {
    success: Boolean(result?.success),
    tokensFound: tokens.length,
    successCount,
    failureCount,
    invalidatedCount,
    firstErrorCode: firstErrorCode || null,
    firstErrorMessage: firstErrorMessage || result?.error || null,
  }
}

// ─── Notification Templates ───────────────────────────────

/**
 * Help request alert — HIGH ALARM
 * @param {Array} helpers - Array of helper objects with _id and distanceMeters
 * @param {Object} helpRequest - The help request object
 */
const sendHelpRequestAlert = async (helpers, helpRequest) => {
  // If helpers is just an array of IDs (backward compatibility or error case)
  if (helpers.length > 0 && typeof helpers[0] === 'string') {
    const r = await notifyMultipleUsers(helpers, {
      data: {
        type: NOTIFICATION_TYPE.HELP_REQUEST_ALERT,
        requestId: String(helpRequest._id || ''),
        category: helpRequest.category || '',
        categoryName: helpRequest.categoryName || '',
        categoryIcon: helpRequest.categoryIcon || '',
        description: helpRequest.description || '',
        distanceMeters: '0',
        area: helpRequest.location?.address || '',
        wave: '1',
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
    })
    // Exact per-helper delivery cannot be inferred from bulk token responses here.
    return { deliveredHelperIds: [], result: r }
  }

  const deliveredHelperIds = []
  const results = []

  // Send individual notifications with distance
  for (const helper of helpers) {
    const distance = helper.distanceMeters ? Math.round(helper.distanceMeters) : 0
    // eslint-disable-next-line no-await-in-loop
    const r = await notifyUser(String(helper._id), {
      // Send notification+data so Android background/killed reliably shows a tray alert.
      title: 'Socius . Help Request',
      body: String(helpRequest.description || helpRequest.categoryName || helpRequest.category || 'Someone nearby needs help').slice(0, 140),
      data: {
        type: NOTIFICATION_TYPE.HELP_REQUEST_DATA,
        requestId: String(helpRequest._id),
        category: helpRequest.category || '',
        categoryName: helpRequest.categoryName || '',
        categoryIcon: helpRequest.categoryIcon || '',
        description: helpRequest.description || '',
        distanceMeters: String(distance),
        area: helpRequest.location?.address || '',
        wave: '1',
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
    })
    results.push(r)
    if (r && r.successCount > 0) {
      deliveredHelperIds.push(String(helper._id))
    }
  }
  return { deliveredHelperIds, results }
}

/**
 * Presence alarm — HIGH ALARM (urgent)
 */
const sendPresenceAlarm = async (helperIds, presenceRequest, helpersNearby = []) => {
  const deliveredHelperIds = []
  const results = []

  const requester = presenceRequest.requesterId
  const requesterName = requester ? (requester.fullName || requester.firstName || 'Someone') : 'Someone'
  const address = presenceRequest.location?.address || requester?.cityArea || 'Nearby'

  for (const helperId of helperIds) {
    const helper = helpersNearby.find((h) => String(h._id) === String(helperId))
    const distanceMeters = helper ? helper.distanceMeters : 0

    // eslint-disable-next-line no-await-in-loop
    const r = await notifyUser(String(helperId), {
      title: 'Socius . Presence Alert',
      body: String(presenceRequest.description || 'Someone nearby needs support').slice(0, 140),
      data: {
        type: NOTIFICATION_TYPE.PRESENCE_ALARM,
        requestId: String(presenceRequest._id),
        situationType: presenceRequest.situationType,
        requesterName,
        description: presenceRequest.description || '',
        area: address,
        locationLabel: address,
        distanceMeters: String(distanceMeters),
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
    })
    results.push(r)
    if (r && r.successCount > 0) {
      deliveredHelperIds.push(String(helperId))
    }
  }

  return { deliveredHelperIds, results }
}

/**
 * Request matched notification — requester ko
 */
const sendMatchedNotification = async (requesterId, helperName, requestId) => {
  await notifyUser(requesterId, {
    data: {
      type: NOTIFICATION_TYPE.REQUEST_STATUS,
      status: 'matched',
      requestId: String(requestId),
      helperName: helperName ? String(helperName) : '',
      recipientRole: 'requester',
    },
  })
}

/**
 * Chat message — data-only so the app can suppress duplicates when the chat modal is open.
 */
const sendChatNotification = async (
  receiverId,
  { senderName, preview, sessionId, requestId, messageType = 'text', recipientRole = '' }
) => {
  const prev = String(preview || '').slice(0, 180)
  await notifyUser(String(receiverId), {
    data: {
      type: NOTIFICATION_TYPE.CHAT_MESSAGE,
      sessionId: String(sessionId || ''),
      requestId: String(requestId || ''),
      senderName: String(senderName || 'Someone'),
      preview: prev,
      messageType: String(messageType || 'text'),
      recipientRole: String(recipientRole || ''),
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
}

const sendHelpClosureInitiatedNotification = async (receiverId, { requestId, requestType, initiatedBy, occurredAt }) => {
  const by = String(initiatedBy || '').toLowerCase()
  const recipientRole = by === 'requester' ? 'helper' : by === 'helper' ? 'requester' : ''
  await notifyUser(receiverId, {
    data: {
      type: NOTIFICATION_TYPE.REQUEST_STATUS,
      status: 'closing',
      requestId: String(requestId),
      requestType: requestType ? String(requestType) : '',
      initiatedBy: initiatedBy ? String(initiatedBy) : '',
      occurredAt: occurredAt ? String(occurredAt) : '',
      recipientRole,
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
}

const sendHelpRequestClosedNotification = async (
  receiverId,
  { requestId, requestType, reason, occurredAt, recipientRole = '' }
) => {
  await notifyUser(receiverId, {
    data: {
      type: NOTIFICATION_TYPE.REQUEST_STATUS,
      status: 'closed',
      requestId: String(requestId),
      requestType: requestType ? String(requestType) : '',
      reason: reason ? String(reason) : '',
      occurredAt: occurredAt ? String(occurredAt) : '',
      recipientRole: String(recipientRole || ''),
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
}

/**
 * Account status update notification
 */
const sendAccountUpdateNotification = async (userId, message) => {
  await notifyUser(userId, {
    title: '📋 Account Update',
    body: message,
    data: { type: NOTIFICATION_TYPE.ACCOUNT_UPDATE },
  })
}

/**
 * Verification result notification
 */
const sendVerificationResultNotification = async (userId, approved) => {
  const message = approved
    ? 'Your identity has been verified! You can now access all features.'
    : 'Verification needs attention. Please check the app for details.'

  await notifyUser(userId, {
    title: approved ? '✅ Verification Approved' : '⚠️ Verification Update',
    body: message,
    data: {
      type: NOTIFICATION_TYPE.REVIEW_DECISION,
      approved: String(approved),
    },
  })
}

/**
 * Cancel alarm for other helpers
 */
const sendCancelAlert = async (helperIds, requestId) => {
  await notifyMultipleUsers(helperIds, {
    data: {
      type: NOTIFICATION_TYPE.CANCEL_ALARM,
      requestId: String(requestId),
    },
    priority: NOTIFICATION_PRIORITY.HIGH,
  })
}

const sendRequestAcknowledgedNotification = async (requesterId, { requestId, correlationId, serverReceivedAt }) => {
  const ok = await shouldSendOnce(`ack:${requestId}`, 300)
  if (!ok) return
  await notifyUser(requesterId, {
    data: {
      type: NOTIFICATION_TYPE.REQUEST_ACKNOWLEDGED,
      requestId: String(requestId),
      correlationId: correlationId ? String(correlationId) : String(requestId),
      serverReceivedAt: serverReceivedAt ? String(serverReceivedAt) : new Date().toISOString(),
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
}

const sendNoHelpersNearbyNotification = async (requesterId, { requestId, hint, attemptId }) => {
  const ok = await shouldSendOnce(`nohelpers:${requestId}`, 86400)
  if (!ok) return
  await notifyUser(requesterId, {
    title: 'No helpers nearby yet',
    body: 'Your request is live — we will notify people if they come in range.',
    data: {
      type: NOTIFICATION_TYPE.NO_HELPERS_NEARBY,
      requestId: String(requestId),
      hint: hint ? String(hint) : '',
      attemptId: attemptId ? String(attemptId) : '',
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
}

const sendRequestExpiringWarningNotification = async (requesterId, { requestId, phase, expiresAt }) => {
  const ok = await shouldSendOnce(`expwarn:${requestId}:${phase}`, 7200)
  if (!ok) return
  const body =
    phase === 't5'
      ? 'Your help request expires in about 5 minutes if no one accepts.'
      : 'Your help request expires in about 15 minutes if no one accepts.'
  await notifyUser(requesterId, {
    title: 'Request expiring soon',
    body,
    data: {
      type: NOTIFICATION_TYPE.REQUEST_EXPIRING_WARNING,
      requestId: String(requestId),
      phase: String(phase),
      expiresAt: expiresAt ? String(expiresAt) : '',
    },
    priority: NOTIFICATION_PRIORITY.HIGH,
  })
}

const sendHelperArrivedNotification = async (requesterId, { requestId, helperId, distanceMeters }) => {
  const ok = await shouldSendOnce(`arrived:${requestId}:${helperId}`, 7200)
  if (!ok) return
  await notifyUser(requesterId, {
    title: 'Helper is nearby',
    body: 'They marked that they are close — check the map or chat.',
    data: {
      type: NOTIFICATION_TYPE.HELPER_ARRIVED,
      requestId: String(requestId),
      helperId: helperId ? String(helperId) : '',
      distanceMeters: distanceMeters != null ? String(distanceMeters) : '',
      occurredAt: new Date().toISOString(),
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
}

const sendHelperDistanceUpdateThrottled = async (requesterId, { requestId, distanceMeters, seq }) => {
  try {
    const rl = await rateLimit(`notif:dist:${requestId}:${requesterId}`, 1, 90)
    if (!rl.allowed) return { skipped: true }
  } catch (e) {
    logger.warn('distance update throttle skipped', e.message)
  }
  await notifyUser(requesterId, {
    data: {
      type: NOTIFICATION_TYPE.HELPER_DISTANCE_UPDATE,
      requestId: String(requestId),
      distanceMeters: distanceMeters != null ? String(distanceMeters) : '',
      seq: seq != null ? String(seq) : '',
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
  return { sent: true }
}

const sendCommunityBalanceNudgeNotification = async (userId, { helpRequestsSent, helpGiven, nudgeKey }) => {
  const ok = await shouldSendOnce(`balancenudge:${userId}:${nudgeKey || 'v1'}`, 86400 * 7)
  if (!ok) return
  await notifyUser(userId, {
    title: 'Community balance',
    body: 'You have requested help more than you have given — consider helping nearby when you can.',
    data: {
      type: NOTIFICATION_TYPE.COMMUNITY_BALANCE_NUDGE,
      nudgeKey: nudgeKey ? String(nudgeKey) : 'give_back',
      helpRequestsSent: String(helpRequestsSent ?? ''),
      helpGiven: String(helpGiven ?? ''),
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
}

const badgeTitleForType = (type) => {
  const labels = {
    [BADGE_TYPE.CLOSES_PROPERLY]: 'Closes properly',
    [BADGE_TYPE.RETURNS_ON_TIME]: 'Returns on time',
    [BADGE_TYPE.ALSO_HELPS_OTHERS]: 'Also helps others',
    [BADGE_TYPE.OCCASIONAL_REQUESTER]: 'Thoughtful requester',
  }
  return labels[type] || 'New badge'
}

const sendBadgeEarnedNotification = async (userId, { badgeType, badgeTitle }) => {
  const ok = await shouldSendOnce(`badge:${userId}:${badgeType}`, 86400 * 30)
  if (!ok) return
  const title = badgeTitle || badgeTitleForType(badgeType)
  await notifyUser(userId, {
    title: 'Badge earned',
    body: `You earned: ${title}`,
    data: {
      type: NOTIFICATION_TYPE.BADGE_EARNED,
      badgeType: String(badgeType),
      badgeTitle: String(title),
      earnedAt: new Date().toISOString(),
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
}

/**
 * Second notify wave (e.g. radius boost) — same call-style as HELP_REQUEST_DATA
 */
/**
 * Requester: session window ended — confirm completion or extend (high priority).
 * Prefer data + notification so background tray shows copy; client adds action buttons via Notifee.
 */
const sendRequestCompletionPromptNotification = async (requesterId, { requestId, sessionEndsAt }) => {
  const ends =
    sessionEndsAt instanceof Date ? sessionEndsAt.toISOString() : sessionEndsAt
      ? new Date(sessionEndsAt).toISOString()
      : ''
  // Data-first: client shows Notifee (actions + HELP_ALARM) without a duplicate system heads-up.
  return notifyUser(String(requesterId), {
    data: {
      type: NOTIFICATION_TYPE.REQUEST_COMPLETION_PROMPT,
      requestId: String(requestId),
      sessionEndsAt: ends,
      recipientRole: 'requester',
    },
    priority: NOTIFICATION_PRIORITY.HIGH,
  })
}

/**
 * Helper: meeting window ended — title/body distinct from requester prompt.
 */
const sendHelperSessionTimeEndedNotification = async (helperId, { requestId, sessionEndsAt }) => {
  const ends =
    sessionEndsAt instanceof Date ? sessionEndsAt.toISOString() : sessionEndsAt
      ? new Date(sessionEndsAt).toISOString()
      : ''
  return notifyUser(String(helperId), {
    data: {
      type: NOTIFICATION_TYPE.HELP_SESSION_TIME_ENDED_HELPER,
      requestId: String(requestId),
      sessionEndsAt: ends,
      recipientRole: 'helper',
    },
    priority: NOTIFICATION_PRIORITY.HIGH,
  })
}

/**
 * Helper: requester extended the session window.
 */
const sendHelperSessionExtendedNotification = async (
  helperId,
  { requestId, additionalMinutes, sessionEndsAt }
) => {
  const ends =
    sessionEndsAt instanceof Date ? sessionEndsAt.toISOString() : sessionEndsAt
      ? new Date(sessionEndsAt).toISOString()
      : ''
  const mins = Number(additionalMinutes)
  const minsLabel = Number.isFinite(mins) ? String(Math.round(mins)) : String(additionalMinutes || '')
  return notifyUser(String(helperId), {
    data: {
      type: NOTIFICATION_TYPE.HELP_SESSION_EXTENDED_HELPER,
      requestId: String(requestId),
      additionalMinutes: minsLabel,
      sessionEndsAt: ends,
      recipientRole: 'helper',
    },
    priority: NOTIFICATION_PRIORITY.HIGH,
  })
}

const sendRequestRematchedToHelpers = async (helpers, helpRequest, { wave = '2', reason = 'rematch' } = {}) => {
  if (!helpers?.length) return
  if (typeof helpers[0] === 'string') {
    return notifyMultipleUsers(helpers, {
      title: 'Someone Nearby Needs Help',
      body: `${String(helpRequest.category || 'help').replace(/_/g, ' ')} — Tap to view`,
      data: {
        type: NOTIFICATION_TYPE.REQUEST_REMATCHED,
        requestId: String(helpRequest._id),
        category: helpRequest.category,
        wave: String(wave),
        reason: String(reason),
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
    })
  }
  for (const helper of helpers) {
    const distance = helper.distanceMeters ? Math.round(helper.distanceMeters) : 0
    // eslint-disable-next-line no-await-in-loop
    await notifyUser(String(helper._id), {
      data: {
        type: NOTIFICATION_TYPE.REQUEST_REMATCHED,
        requestId: String(helpRequest._id),
        category: helpRequest.category || '',
        categoryName: helpRequest.categoryName || '',
        categoryIcon: helpRequest.categoryIcon || '',
        description: helpRequest.description || '',
        distanceMeters: String(distance),
        area: helpRequest.location?.address || '',
        wave: String(wave),
        reason: String(reason),
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
    })
  }
}

/**
 * Invalid token cleanup karo
 */
const invalidateToken = async (token) => {
  await DeviceToken.findOneAndUpdate(
    { token },
    { isActive: false, invalidatedAt: new Date() }
  )
}

module.exports = {
  notifyUser,
  notifyMultipleUsers,
  sendHelpRequestAlert,
  sendPresenceAlarm,
  sendMatchedNotification,
  sendChatNotification,
  sendHelpClosureInitiatedNotification,
  sendHelpRequestClosedNotification,
  sendAccountUpdateNotification,
  sendVerificationResultNotification,
  sendCancelAlert,
  sendRequestAcknowledgedNotification,
  sendNoHelpersNearbyNotification,
  sendRequestExpiringWarningNotification,
  sendHelperArrivedNotification,
  sendHelperDistanceUpdateThrottled,
  sendCommunityBalanceNudgeNotification,
  sendBadgeEarnedNotification,
  sendRequestRematchedToHelpers,
  sendRequestCompletionPromptNotification,
  sendHelperSessionTimeEndedNotification,
  sendHelperSessionExtendedNotification,
  invalidateToken,
}
