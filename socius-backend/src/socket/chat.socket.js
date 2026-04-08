const chatService = require('../services/chat.service')
const { emitToUser } = require('../config/socket')
const logger = require('../utils/logger')

module.exports = (io, socket) => {
  socket.on('chat:send', async (payload) => {
    try {
      console.log('Socket chat:send received payload:', payload);
      const { sessionId, text, localId, replyToId, messageType, attachment } = payload || {}
      const mt = messageType || 'text'
      if (!sessionId) {
        console.error('Socket chat:send missing sessionId');
        return;
      }
      if (mt === 'text' && !(text && String(text).trim())) {
        console.error('Socket chat:send missing text for text message');
        return;
      }
      if (mt !== 'text' && !attachment?.url && !(attachment?.lat != null && attachment?.lng != null)) {
        console.error('Socket chat:send missing attachment for media message');
        return;
      }

      const { message, receiverId } = await chatService.sendMessage(
        sessionId,
        socket.userId,
        text,
        replyToId,
        { messageType: mt, attachment }
      )

      console.log('Socket chat:send success, message created:', message._id);

      emitToUser(receiverId, 'chat:new_message', { sessionId, message })
      socket.emit('chat:message_sent', { sessionId, message, localId })
    } catch (err) {
      logger.error('chat:send handler error:', err)
      console.error('chat:send handler detailed error:', err);
      const raw = String(err?.message || '')
      const isSessionClosed =
        raw.toLowerCase().includes('chat session is not active') ||
        raw.toLowerCase().includes('not active')

      socket.emit('chat:error', {
        code: isSessionClosed ? 'SESSION_CLOSED' : 'SEND_FAILED',
        message: isSessionClosed ? 'Chat is closed' : 'Unable to send message',
        error: raw,
      })
    }
  })

  socket.on('chat:load_messages', async (payload) => {
    try {
      console.log('Socket chat:load_messages received:', payload);
      const { sessionId, page = 1, limit = 50 } = payload || {}
      if (!sessionId) {
        console.error('Socket chat:load_messages missing sessionId');
        return
      }

      const messages = await chatService.getMessages(sessionId, socket.userId, { page, limit })
      console.log(`Socket chat:load_messages found ${messages.length} messages for session ${sessionId}`);
      socket.emit('chat:messages_loaded', { sessionId, messages, page })
    } catch (err) {
      logger.error('chat:load_messages handler error:', err)
      console.error('Socket chat:load_messages error:', err);
      socket.emit('chat:error', { message: 'Unable to load messages' })
    }
  })

  socket.on('chat:mark_delivered', async (payload) => {
    try {
      const { sessionId } = payload || {}
      if (!sessionId) return

      await chatService.markMessagesDelivered(sessionId, socket.userId)
      
      // Notify sender that messages were delivered
      const session = await chatService.getSession(sessionId, socket.userId)
      const senderId = String(session.requesterId._id) === String(socket.userId) 
        ? session.helperId._id 
        : session.requesterId._id

      emitToUser(senderId, 'chat:delivered_confirmed', { sessionId })
    } catch (err) {
      logger.error('chat:mark_delivered handler error:', err)
    }
  })

  socket.on('chat:mark_read', async (payload) => {
    try {
      const { sessionId } = payload || {}
      if (!sessionId) return

      await chatService.markMessagesRead(sessionId, socket.userId)
      
      // Notify sender that messages were read
      const session = await chatService.getSession(sessionId, socket.userId)
      const senderId = String(session.requesterId._id) === String(socket.userId) 
        ? session.helperId._id 
        : session.requesterId._id

      emitToUser(senderId, 'chat:read_confirmed', { sessionId })
    } catch (err) {
      logger.error('chat:mark_read handler error:', err)
      socket.emit('chat:error', { message: 'Unable to mark messages as read' })
    }
  })

  socket.on('chat:typing', (payload) => {
    const { sessionId, receiverId } = payload || {}
    if (sessionId && receiverId) {
      emitToUser(receiverId, 'chat:typing', { sessionId, userId: socket.userId })
    }
  })

  socket.on('chat:stop_typing', (payload) => {
    const { sessionId, receiverId } = payload || {}
    if (sessionId && receiverId) {
      emitToUser(receiverId, 'chat:stop_typing', { sessionId, userId: socket.userId })
    }
  })

  socket.on('chat:react', async (payload) => {
    try {
      const { messageId, emoji } = payload || {}
      if (!messageId || !emoji) return

      const message = await chatService.toggleReaction(messageId, socket.userId, emoji)

      const otherUserId =
        String(message.senderId) === String(socket.userId) ? message.receiverId : message.senderId

      emitToUser(otherUserId, 'chat:reaction_updated', {
        sessionId: message.sessionId,
        messageId,
        message,
      })

      socket.emit('chat:reaction_updated', {
        sessionId: message.sessionId,
        messageId,
        message,
      })
    } catch (err) {
      logger.error('chat:react handler error:', err)
      socket.emit('chat:error', { message: 'Unable to react to message' })
    }
  })
}
