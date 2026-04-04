/**
 * Admin Socket Handler
 * Admin users ko 'admin' room me join karwata hai
 * Taaki woh live location updates receive kar sakein
 */
const logger = require('../utils/logger')

module.exports = (io, socket) => {
  // Check if user is admin and join admin room
  socket.on('admin:join', () => {
    // Admin check - userRole should be 'admin' ya isAdmin flag
    if (socket.userRole === 'admin' || socket.isAdmin) {
      socket.join('admin')
      logger.info(`Admin joined room: ${socket.userId}`)
      socket.emit('admin:joined', { success: true, message: 'Joined admin room' })
    } else {
      socket.emit('admin:joined', { success: false, message: 'Unauthorized' })
    }
  })

  // Admin leaves room
  socket.on('admin:leave', () => {
    socket.leave('admin')
    logger.info(`Admin left room: ${socket.userId}`)
  })
}
