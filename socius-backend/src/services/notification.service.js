const DeviceToken = require('../models/DeviceToken')
const { sendToDevice, sendToMultipleDevices } = require('../config/firebase')
const { NOTIFICATION_TYPE, NOTIFICATION_PRIORITY } = require('../utils/constants')
const logger = require('../utils/logger')

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
    return
  }

  for (const token of tokens) {
    await sendToDevice({ token, title, body, data, priority })
  }
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
    return notifyMultipleUsers(helpers, {
      title: '🔔 Someone Nearby Needs Help',
      body: `${helpRequest.category.replace(/_/g, ' ')} — Tap to view details`,
      data: {
        type: NOTIFICATION_TYPE.HELP_REQUEST_ALERT,
        requestId: String(helpRequest._id),
        category: helpRequest.category,
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
    })
  }

  // Send individual notifications with distance
  for (const helper of helpers) {
    const distance = helper.distanceMeters ? Math.round(helper.distanceMeters) : 0
    await notifyUser(String(helper._id), {
      // Data-only notification for custom handling
      data: {
        type: 'HELP_REQUEST',
        requestId: String(helpRequest._id),
        category: helpRequest.category || '',
        description: helpRequest.description || '',
        distanceMeters: String(distance),
        area: helpRequest.location?.address || '',
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
    })
  }
}

/**
 * Presence alarm — HIGH ALARM (urgent)
 */
const sendPresenceAlarm = async (helperIds, presenceRequest) => {
  await notifyMultipleUsers(helperIds, {
    // Data-only notification for custom handling
    data: {
      type: NOTIFICATION_TYPE.PRESENCE_ALARM,
      requestId: String(presenceRequest._id),
      situationType: presenceRequest.situationType,
    },
    priority: NOTIFICATION_PRIORITY.HIGH,
  })
}

/**
 * Request matched notification — requester ko
 */
const sendMatchedNotification = async (requesterId, helperName, requestId) => {
  await notifyUser(requesterId, {
    title: '✅ Someone is coming to help',
    body: `${helperName} has accepted your request`,
    data: { type: NOTIFICATION_TYPE.REQUEST_STATUS, status: 'matched', requestId: String(requestId) },
  })
}

/**
 * Chat message notification
 */
const sendChatNotification = async (receiverId, senderName, messagePreview) => {
  await notifyUser(receiverId, {
    title: `💬 Message from ${senderName}`,
    body: messagePreview.length > 50 ? messagePreview.slice(0, 50) + '...' : messagePreview,
    data: { type: NOTIFICATION_TYPE.CHAT_MESSAGE },
  })
}

const sendHelpClosureInitiatedNotification = async (receiverId, { requestId, initiatedBy }) => {
  const who = initiatedBy === 'requester' ? 'Requester' : initiatedBy === 'helper' ? 'Helper' : 'Someone'
  await notifyUser(receiverId, {
    title: '🧾 Request closing started',
    body: `${who} has started closing this request. Tap to review and finish.`,
    data: {
      type: NOTIFICATION_TYPE.REQUEST_STATUS,
      status: 'closing',
      requestId: String(requestId),
      initiatedBy: initiatedBy ? String(initiatedBy) : '',
    },
    priority: NOTIFICATION_PRIORITY.NORMAL,
  })
}

const sendHelpRequestClosedNotification = async (receiverId, { requestId, reason }) => {
  const label =
    reason === 'auto_closed' ? 'auto closed' :
    reason === 'cancelled' ? 'cancelled' :
    'closed'

  await notifyUser(receiverId, {
    title: '✅ Request closed',
    body: `This request was ${label}. Tap to view details.`,
    data: {
      type: NOTIFICATION_TYPE.REQUEST_STATUS,
      status: 'closed',
      requestId: String(requestId),
      reason: reason ? String(reason) : '',
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
    // Data-only notification to trigger background cancel logic
    data: {
      type: 'CANCEL_ALARM',
      requestId: String(requestId),
    },
    priority: 'high',
  })
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
  invalidateToken,
}
