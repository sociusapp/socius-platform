const { Server } = require('socket.io')
const { verifyToken } = require('../utils/jwt')
const logger = require('../utils/logger')

let io = null

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // ─── Auth Middleware ──────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1]

    if (!token) {
      return next(new Error('Authentication required'))
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return next(new Error('Invalid or expired token'))
    }

    socket.userId = decoded.id
    socket.userRole = decoded.role
    socket.accountStatus = decoded.accountStatus
    next()
  })

  // ─── Connection ──────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.userId}`)

    // User apne room me join karo (userId se)
    socket.join(`user:${socket.userId}`)

    // ─── Register handlers ──────────────────────────
    require('../socket/chat.socket')(io, socket)
    require('../socket/alert.socket')(io, socket)
    require('../socket/presence.socket')(io, socket)

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.userId} — ${reason}`)
    })

    socket.on('error', (err) => {
      logger.error(`Socket error for ${socket.userId}:`, err)
    })
  })

  logger.info('Socket.IO initialized')
  return io
}

/**
 * io instance kahi bhi use karo
 */
const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized. Call initSocket() first.')
  return io
}

/**
 * Specific user ko event emit karo
 */
const emitToUser = (userId, event, data) => {
  getIO().to(`user:${userId}`).emit(event, data)
}

/**
 * Specific room ko event emit karo
 */
const emitToRoom = (room, event, data) => {
  getIO().to(room).emit(event, data)
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToRoom,
}
