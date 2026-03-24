const presenceService = require('../services/presence.service')
const { emitToUser, emitToRoom } = require('../config/socket')
const logger = require('../utils/logger')

module.exports = (io, socket) => {
  socket.on('presence:join', ({ presenceRequestId }) => {
    if (!presenceRequestId) return
    socket.join(`presence:${presenceRequestId}`)
    logger.info(`User ${socket.userId} joined room presence:${presenceRequestId}`)
  })

  socket.on('presence:leave', ({ presenceRequestId }) => {
    if (!presenceRequestId) return
    socket.leave(`presence:${presenceRequestId}`)
    logger.info(`User ${socket.userId} left room presence:${presenceRequestId}`)
  })

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

      // Emit to room so all participants see the new helper
      emitToRoom(`presence:${presenceRequestId}`, 'presence:accepted', {
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

  // ─── Generic Status Update (for sync) ──────────────────
  socket.on('status_update', async (payload) => {
    try {
      const { requestId, status, type, userId } = payload || {}
      if (!requestId || !status) return

      // Broadcast to relevant rooms if needed, or handle specifically
      if (type === 'PRESENCE_ALARM') {
        const eventName = status === 'accepted' ? 'presence:accepted' : 'presence:declined'
        const res = await presenceService.getPresenceById(requestId)
        const req = res?.request || res
        if (req && req.requesterId) {
          emitToUser(String(req.requesterId), eventName, {
            presenceRequestId: String(requestId),
            userId: String(userId || socket.userId),
            status,
          })
        }
      }
    } catch (err) {
      logger.error('status_update handler error:', err)
    }
  })
}

