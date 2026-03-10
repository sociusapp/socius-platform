const ChatSession = require('../models/ChatSession')
const ChatMessage = require('../models/ChatMessage')
const { CHAT_SESSION_STATUS } = require('../utils/constants')
const logger = require('../utils/logger')

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
    .populate('requesterId', 'fullName profileImage')
    .populate('helperId', 'fullName profileImage')

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
 * Message bhejo
 */
const sendMessage = async (sessionId, senderId, text, replyToId = null) => {
  console.log(`sendMessage: ${sessionId}, ${senderId}, ${text}, ${replyToId}`);
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
    const message = await ChatMessage.create({
      sessionId,
      senderId,
      receiverId,
      text,
      replyTo: replyToId,
    })
    console.log(`sendMessage: Message created: ${message._id}`);
    
    if (replyToId) {
      await message.populate('replyTo', 'text senderId')
    }
  
    // Session last message update karo
    await ChatSession.findByIdAndUpdate(sessionId, {
      $inc: { messageCount: 1 },
      lastMessage: {
        text,
        senderId,
        sentAt: new Date(),
      },
    })
    
    return { message, receiverId }
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
    .populate('replyTo', 'text senderId')
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
    .populate('replyTo', 'text senderId')
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

/**
 * Request ke liye session dhundho
 */
const getSessionByRequest = async (requestId, userId) => {
  const session = await ChatSession.findOne({
    requestId,
    $or: [{ requesterId: userId }, { helperId: userId }],
  })
    .populate('requesterId', 'fullName profileImage')
    .populate('helperId', 'fullName profileImage')
  
  return session
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
