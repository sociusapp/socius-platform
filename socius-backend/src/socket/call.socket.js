const { emitToUser } = require('../config/socket')
const logger = require('../utils/logger')
const { trackFromSocket, logSignalRelay } = require('../services/callTracking.service')

module.exports = (io, socket) => {
  socket.on('call:signal', async (payload) => {
    try {
      const { callId, toUserId, type, data } = payload || {}
      if (!callId || !toUserId || !type) return
      if (!['offer', 'answer', 'ice', 'end'].includes(String(type))) return

      emitToUser(String(toUserId), 'call:signal', {
        callId: String(callId),
        fromUserId: String(socket.userId),
        type: String(type),
        data: data || null,
      })

      logSignalRelay({
        callKey: String(callId),
        fromUserId: String(socket.userId),
        toUserId: String(toUserId),
        type: String(type),
        data: data || null,
        occurredAt: new Date(),
      }).catch(() => {})
    } catch (err) {
      logger.error('call:signal handler error:', err)
      socket.emit('call:error', { message: 'Unable to relay call signal' })
    }
  })

  socket.on('call:track', async (payload, ack) => {
    try {
      const result = await trackFromSocket(String(socket.userId), payload, {
        ip: socket.handshake.address || null,
        userAgent: socket.handshake.headers?.['user-agent'] || null,
      })
      if (typeof ack === 'function') {
        ack({ success: true, data: { callId: result.call?._id, callKey: result.call?.callKey, eventId: result.event?._id } })
      }
    } catch (err) {
      logger.error('call:track handler error:', err)
      if (typeof ack === 'function') {
        ack({ success: false, message: err.message || 'Unable to track call event' })
      }
    }
  })
}
