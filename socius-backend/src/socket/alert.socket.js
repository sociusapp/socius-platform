const helpRequestService = require('../services/helpRequest.service')
const { emitToUser } = require('../config/socket')
const logger = require('../utils/logger')

module.exports = (io, socket) => {
  socket.on('help:accept', async (payload) => {
    try {
      const { requestId } = payload || {}
      if (!requestId) return

      const { request } = await helpRequestService.acceptRequest(socket.userId, requestId)

      socket.emit('help:accepted', { requestId: String(request._id) })
    } catch (err) {
      logger.error('help:accept handler error:', err)
      socket.emit('help:error', { message: 'Unable to accept request' })
    }
  })

  socket.on('help:decline', async (payload) => {
    try {
      const { requestId } = payload || {}
      if (!requestId) return

      await helpRequestService.declineRequest(socket.userId, requestId)
      socket.emit('help:declined', { requestId: String(requestId) })
    } catch (err) {
      logger.error('help:decline handler error:', err)
      socket.emit('help:error', { message: 'Unable to decline request' })
    }
  })

  // ─── Generic Status Update (for sync) ──────────────────
  socket.on('status_update', async (payload) => {
    try {
      const { requestId, status, type, userId } = payload || {}
      if (!requestId || !status) return

      if (type === 'HELP_REQUEST') {
        const eventName = status === 'accepted' ? 'help:accepted' : 'help:declined'
        const res = await helpRequestService.getRequestById(requestId)
        const req = res?.request || res
        if (req && req.requesterId) {
          emitToUser(String(req.requesterId), eventName, {
            requestId: String(requestId),
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
