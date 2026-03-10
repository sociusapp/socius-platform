const presenceService = require('../services/presence.service')
const { emitToUser } = require('../config/socket')
const logger = require('../utils/logger')

module.exports = (io, socket) => {
  socket.on('presence:accept', async (payload) => {
    try {
      const { presenceRequestId, requesterId } = payload || {}
      if (!presenceRequestId || !requesterId) return

      const { request } = await presenceService.acceptPresence(
        socket.userId,
        presenceRequestId
      )

      emitToUser(request.requesterId, 'presence:accepted', {
        presenceRequestId: String(request._id),
        helperId: String(socket.userId),
      })

      socket.emit('presence:accepted', { presenceRequestId: String(request._id) })
    } catch (err) {
      logger.error('presence:accept handler error:', err)
      socket.emit('presence:error', { message: 'Unable to accept presence request' })
    }
  })

  socket.on('presence:decline', async (payload) => {
    try {
      const { presenceRequestId } = payload || {}
      if (!presenceRequestId) return

      await presenceService.declinePresence(socket.userId, presenceRequestId)
      socket.emit('presence:declined', { presenceRequestId: String(presenceRequestId) })
    } catch (err) {
      logger.error('presence:decline handler error:', err)
      socket.emit('presence:error', { message: 'Unable to decline presence request' })
    }
  })
}

