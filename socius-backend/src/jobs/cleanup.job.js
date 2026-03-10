const ChatSession = require('../models/ChatSession')
const ChatMessage = require('../models/ChatMessage')
const { AUTO_CLOSE } = require('../utils/constants')
const logger = require('../utils/logger')

const cleanupOldChats = async () => {
  try {
    const hours = AUTO_CLOSE.CHAT_DELETE_AFTER_HOURS || 24
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)

    const sessions = await ChatSession.find({
      status: 'closed',
      closedAt: { $lt: cutoff },
      $or: [{ messagesDeletedAt: null }, { messagesDeletedAt: { $lt: cutoff } }],
    })

    let deletedMessages = 0

    for (const session of sessions) {
      const result = await ChatMessage.updateMany(
        { sessionId: session._id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() }
      )

      deletedMessages += result.modifiedCount || 0

      session.messagesDeletedAt = new Date()
      await session.save()
    }

    logger.info(
      `Cleanup job completed — sessions: ${sessions.length}, messages: ${deletedMessages}`
    )

    return { sessions: sessions.length, messages: deletedMessages }
  } catch (err) {
    logger.error('Cleanup job failed:', err)
    throw err
  }
}

module.exports = { cleanupOldChats }

