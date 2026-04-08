const router = require('express').Router()
const {
  getSession,
  getSessionByRequest,
  getMessages,
  sendMessage,
  markRead,
  reactToMessage,
  uploadChatMedia,
} = require('../controllers/chat.controller')
const { authenticate } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')
const { uploadChatMedia: uploadChatMulter } = require('../middlewares/upload')

// GET /api/chat/session/:sessionId
router.get('/session/:sessionId', authenticate, getSession)

// GET /api/chat/request/:requestId
router.get('/request/:requestId', authenticate, getSessionByRequest)

// GET /api/chat/session/:sessionId/messages
router.get('/session/:sessionId/messages', authenticate, getMessages)

// POST /api/chat/session/:sessionId/media (multipart file → URL for chat:send)
router.post(
  '/session/:sessionId/media',
  authenticate,
  uploadChatMulter,
  uploadChatMedia
)

// POST /api/chat/session/:sessionId/messages
router.post(
  '/session/:sessionId/messages',
  authenticate,
  validate(schemas.sendMessage),
  sendMessage
)

// PATCH /api/chat/session/:sessionId/read
router.patch('/session/:sessionId/read', authenticate, markRead)

// POST /api/chat/messages/:messageId/react
router.post(
  '/messages/:messageId/react',
  authenticate,
  validate(schemas.reactToMessage),
  reactToMessage
)

module.exports = router
