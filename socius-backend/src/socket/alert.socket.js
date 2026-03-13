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
}
