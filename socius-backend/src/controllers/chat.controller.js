const chatService = require('../services/chat.service')
const { success, created } = require('../utils/response')

const getSession = async (req, res, next) => {
  try {
    const session = await chatService.getSession(req.params.sessionId, req.user._id)
    return success(res, session)
  } catch (err) {
    next(err)
  }
}

const getSessionByRequest = async (req, res, next) => {
  try {
    const session = await chatService.getSessionByRequest(req.params.requestId, req.user._id)
    return success(res, session)
  } catch (err) {
    next(err)
  }
}

const getMessages = async (req, res, next) => {
  try {
    const { page, limit } = req.query
    const messages = await chatService.getMessages(req.params.sessionId, req.user._id, {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
    })
    return success(res, messages)
  } catch (err) {
    next(err)
  }
}

const sendMessage = async (req, res, next) => {
  try {
    const { text, replyToId } = req.body
    const result = await chatService.sendMessage(req.params.sessionId, req.user._id, text, replyToId)
    return created(res, result.message, 'Message sent')
  } catch (err) {
    next(err)
  }
}

const markRead = async (req, res, next) => {
  try {
    await chatService.markMessagesRead(req.params.sessionId, req.user._id)
    return success(res, null, 'Messages marked as read')
  } catch (err) {
    next(err)
  }
}

const reactToMessage = async (req, res, next) => {
  try {
    const { emoji } = req.body
    const message = await chatService.toggleReaction(req.params.messageId, req.user._id, emoji)
    return success(res, message, 'Reaction updated')
  } catch (err) {
    next(err)
  }
}

module.exports = { getSession, getSessionByRequest, getMessages, sendMessage, markRead, reactToMessage }
