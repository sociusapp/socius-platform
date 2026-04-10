const ChatSession = require('../models/ChatSession')
const ChatMessage = require('../models/ChatMessage')
const User = require('../models/User')
const PresenceRequest = require('../models/PresenceRequest')
const PresenceMatch = require('../models/PresenceMatch')
const {
  CHAT_SESSION_STATUS,
  PRESENCE_STATUS,
  PRESENCE_MATCH_STATUS,
} = require('../utils/constants')
const logger = require('../utils/logger')
const { sendChatNotification } = require('./notification.service')

const summarizeMessage = (messageType, text, attachment) => {
  const t = String(text || '').trim()
  if (t) return t.slice(0, 200)
  switch (messageType) {
    case 'image':
      return '📷 Photo'
    case 'audio':
      return '🎤 Voice message'
    case 'location':
      return '📍 Location shared'
    case 'file':
      return '📎 File'
    default:
      return 'Message'
  }
}

const notifyChatReceiverAsync = async (session, message, senderId) => {
  try {
    const receiverId =
      String(session.requesterId) === String(senderId) ? session.helperId : session.requesterId
    const recipientRole =
      String(receiverId) === String(session.requesterId) ? 'requester' : 'helper'
    const sender = await User.findById(senderId).select('fullName profileImage').lean()
    const preview = summarizeMessage(
      message.messageType || 'text',
      message.text,
      message.attachment
    )
    await sendChatNotification(receiverId, {
      senderName: sender?.fullName || 'Someone',
      senderImage: sender?.profileImage || '',
      preview,
      sessionId: String(session._id),
      requestId: String(session.requestId),
      messageType: message.messageType || 'text',
      recipientRole,
      requestType: session.requestType || 'HelpRequest',
    })
  } catch (e) {
    logger.warn('notifyChatReceiverAsync failed', e)
  }
}

/**
 * Chat session create karo — jab helper accept kare
 */
const createSession = async ({ requestId, requestType, requesterId, helperId }) => {
  // Already exist karta hai?
  const existing = await ChatSession.findOne({ requestId, helperId, status: CHAT_SESSION_STATUS.ACTIVE })
  if (existing) return existing

  const session = await ChatSession.create({
    requestId,
    requestType,
    requesterId,
    helperId,
    openedAt: new Date(),
  })

  logger.info(`Chat session created: ${session._id}`)
  return session
}

/**
 * Session get karo by ID (verify participant)
 */
const getSession = async (sessionId, userId) => {
  const session = await ChatSession.findById(sessionId)
    .populate('requesterId', 'fullName profileImage phone')
    .populate('helperId', 'fullName profileImage phone')

  if (!session) {
    const err = new Error('Chat session not found')
    err.statusCode = 404
    throw err
  }

  const requesterId = session.requesterId?._id || session.requesterId
  const helperId = session.helperId?._id || session.helperId

  const isParticipant =
    String(requesterId) === String(userId) ||
    String(helperId) === String(userId)

  if (!isParticipant) {
    const err = new Error('Not authorized to access this chat')
    err.statusCode = 403
    throw err
  }

  return session
}

/**
 * Message bhejo (text + optional rich attachment)
 */
const sendMessage = async (sessionId, senderId, text, replyToId = null, options = {}) => {
  const messageType = options.messageType || 'text'
  let attachment = options.attachment || null
  if (attachment && typeof attachment === 'object') {
    attachment = {
      url: attachment.url || null,
      mimeType: attachment.mimeType || null,
      fileName: attachment.fileName || null,
      size: attachment.size != null ? Number(attachment.size) : null,
      durationSec: attachment.durationSec != null ? Number(attachment.durationSec) : null,
      lat: attachment.lat != null ? Number(attachment.lat) : null,
      lng: attachment.lng != null ? Number(attachment.lng) : null,
      address: attachment.address || null,
    }
    const empty = !attachment.url && attachment.lat == null && attachment.lng == null
    if (empty) attachment = null
  }

  let bodyText = typeof text === 'string' ? text.trim() : ''

  if (messageType === 'text') {
    if (!bodyText) {
      const err = new Error('Message text is required')
      err.statusCode = 400
      throw err
    }
  } else if (messageType === 'location') {
    if (!attachment || attachment.lat == null || attachment.lng == null) {
      const err = new Error('Location coordinates are required')
      err.statusCode = 400
      throw err
    }
    if (!bodyText) {
      bodyText =
        attachment.address ||
        `${Number(attachment.lat).toFixed(5)}, ${Number(attachment.lng).toFixed(5)}`
    }
  } else {
    if (!attachment || !attachment.url) {
      const err = new Error('Attachment URL is required')
      err.statusCode = 400
      throw err
    }
    if (!bodyText) {
      bodyText = summarizeMessage(messageType, '', attachment)
    }
  }

  console.log(`sendMessage: ${sessionId}, ${senderId}, type=${messageType}, ${bodyText?.slice(0, 40)}, ${replyToId}`)
  const session = await ChatSession.findById(sessionId)

  if (!session || session.status !== CHAT_SESSION_STATUS.ACTIVE) {
    console.error(`sendMessage: Session not active or not found: ${sessionId}`);
    const err = new Error('Chat session is not active')
    err.statusCode = 400
    throw err
  }

  const isParticipant =
    String(session.requesterId) === String(senderId) ||
    String(session.helperId) === String(senderId)

  if (!isParticipant) {
    console.error(`sendMessage: User ${senderId} not participant in ${sessionId}`);
    const err = new Error('Not authorized')
    err.statusCode = 403
    throw err
  }

  const receiverId =
    String(session.requesterId) === String(senderId)
      ? session.helperId
      : session.requesterId

  try {
    const doc = {
      sessionId,
      senderId,
      receiverId,
      text: bodyText,
      messageType,
      replyTo: replyToId,
    }
    if (attachment) doc.attachment = attachment
    const message = await ChatMessage.create(doc)
    console.log(`sendMessage: Message created: ${message._id}`);

    if (replyToId) {
      await message.populate('replyTo', 'text senderId messageType attachment')
    }

    // Session last message update karo
    await ChatSession.findByIdAndUpdate(sessionId, {
      $inc: { messageCount: 1 },
      lastMessage: {
        text: summarizeMessage(messageType, bodyText, attachment),
        senderId,
        sentAt: new Date(),
      },
    })

    const populated = await ChatMessage.findById(message._id)
      .populate('replyTo', 'text senderId messageType attachment')
      .select('-__v')

    notifyChatReceiverAsync(session, populated, senderId)

    return { message: populated, receiverId }
  } catch (err) {
    console.error(`sendMessage: Failed to create message: ${err}`);
    throw err;
  }
}

/**
 * Messages history get karo
 */
const getMessages = async (sessionId, userId, { page = 1, limit = 50 } = {}) => {
  await getSession(sessionId, userId) // authorization check

  const skip = (page - 1) * limit

  // Get latest messages first
  const messages = await ChatMessage.find({ sessionId, isDeleted: false })
    .populate('replyTo', 'text senderId messageType')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-__v')

  // Return in chronological order (oldest to newest)
  return messages.reverse()
}

/**
 * Messages delivered mark karo
 */
const markMessagesDelivered = async (sessionId, userId) => {
  await ChatMessage.updateMany(
    { sessionId, receiverId: userId, isDelivered: false },
    { isDelivered: true, deliveredAt: new Date() }
  )
}

/**
 * Messages read mark karo
 */
const markMessagesRead = async (sessionId, userId) => {
  console.log(`Marking messages read for session ${sessionId} and user ${userId}`);
  const result = await ChatMessage.updateMany(
    { sessionId, receiverId: userId, isRead: false },
    { isRead: true, readAt: new Date(), isDelivered: true, deliveredAt: new Date() }
  )
  console.log(`Marked ${result.modifiedCount} messages as read`);
}

const toggleReaction = async (messageId, userId, emoji) => {
  const message = await ChatMessage.findOne({ _id: messageId, isDeleted: false })

  if (!message) {
    const err = new Error('Message not found')
    err.statusCode = 404
    throw err
  }

  await getSession(message.sessionId, userId)

  if (!message.reactions) {
    message.reactions = []
  }

  const existingIndex = message.reactions.findIndex(
    (r) => String(r.userId) === String(userId)
  )

  if (existingIndex >= 0) {
    if (message.reactions[existingIndex].emoji === emoji) {
      message.reactions.splice(existingIndex, 1)
    } else {
      message.reactions[existingIndex].emoji = emoji
      message.reactions[existingIndex].createdAt = new Date()
    }
  } else {
    message.reactions.push({ userId, emoji, createdAt: new Date() })
  }

  message.markModified('reactions')
  await message.save()

  const updated = await ChatMessage.findById(messageId)
    .populate('replyTo', 'text senderId messageType attachment')
    .select('-__v')

  return updated
}

/**
 * Session close karo (request close hone pe)
 */
const closeSession = async (sessionId) => {
  await ChatSession.findByIdAndUpdate(sessionId, {
    status: CHAT_SESSION_STATUS.CLOSED,
    closedAt: new Date(),
  })
  logger.info(`Chat session closed: ${sessionId}`)
}

/**
 * Closed sessions ke messages delete karo (privacy — cron job use karta hai)
 */
const deleteClosedSessionMessages = async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24hr baad

  const sessions = await ChatSession.find({
    status: CHAT_SESSION_STATUS.CLOSED,
    closedAt: { $lt: cutoff },
    messagesDeletedAt: null,
  })

  let deletedCount = 0
  for (const session of sessions) {
    await ChatMessage.updateMany(
      { sessionId: session._id },
      { isDeleted: true, deletedAt: new Date() }
    )
    await ChatSession.findByIdAndUpdate(session._id, {
      messagesDeletedAt: new Date(),
    })
    deletedCount++
  }

  logger.info(`Messages deleted for ${deletedCount} closed sessions`)
  return deletedCount
}

const PRESENCE_ACTIVE_FOR_CHAT = [
  PRESENCE_STATUS.ACTIVE,
  PRESENCE_STATUS.HELPERS_NOTIFIED,
  PRESENCE_STATUS.HELPERS_ACCEPTED,
]

const PRESENCE_MATCH_IN_PROGRESS = [
  PRESENCE_MATCH_STATUS.ACCEPTED,
  PRESENCE_MATCH_STATUS.EN_ROUTE,
  PRESENCE_MATCH_STATUS.ARRIVED,
]

/**
 * Legacy / failed createSession: accepted presence hai lekin ChatSession nahi bani ho
 */
const ensurePresenceChatSession = async (requestId, userId) => {
  const presence = await PresenceRequest.findById(requestId).lean()
  if (!presence || !PRESENCE_ACTIVE_FOR_CHAT.includes(presence.status)) return null

  const uid = String(userId)
  const requesterStr = String(presence.requesterId)

  let helperId = null

  if (requesterStr === uid) {
    const match = await PresenceMatch.findOne({
      presenceRequestId: requestId,
      status: { $in: PRESENCE_MATCH_IN_PROGRESS },
    })
      .sort({ acceptedAt: -1 })
      .lean()
    if (!match?.helperId) return null
    helperId = match.helperId
  } else {
    const match = await PresenceMatch.findOne({
      presenceRequestId: requestId,
      helperId: userId,
      status: { $in: PRESENCE_MATCH_IN_PROGRESS },
    }).lean()
    if (!match?.helperId) return null
    helperId = match.helperId
  }

  try {
    const session = await createSession({
      requestId,
      requestType: 'PresenceRequest',
      requesterId: presence.requesterId,
      helperId,
    })
    return session
  } catch (e) {
    logger.warn('ensurePresenceChatSession failed', e)
    return null
  }
}

/**
 * Request ke liye session dhundho
 */
const getSessionByRequest = async (requestId, userId) => {
  const sessions = await ChatSession.find({
    requestId,
    status: CHAT_SESSION_STATUS.ACTIVE,
    $or: [{ requesterId: userId }, { helperId: userId }],
  })
    .sort({ openedAt: -1 })
    .limit(1)
    .populate('requesterId', 'fullName profileImage phone')
    .populate('helperId', 'fullName profileImage phone')

  if (sessions[0]) return sessions[0]

  const ensured = await ensurePresenceChatSession(requestId, userId)
  if (!ensured) return null

  return ChatSession.findById(ensured._id)
    .populate('requesterId', 'fullName profileImage phone')
    .populate('helperId', 'fullName profileImage phone')
}

module.exports = {
  createSession,
  getSession,
  sendMessage,
  getMessages,
  markMessagesDelivered,
  markMessagesRead,
  toggleReaction,
  closeSession,
  deleteClosedSessionMessages,
  getSessionByRequest,
}
