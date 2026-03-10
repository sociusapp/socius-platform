const router = require('express').Router()
const {
  createPresenceRequest,
  getActivePresenceRequest,
  acceptPresence,
  declinePresence,
  cancelPresenceRequest,
  closePresenceRequest,
} = require('../controllers/presence.controller')
const { authenticate, requireActive } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')
const { presenceLimiter } = require('../middlewares/rateLimiter')

// GET /api/presence/active
router.get('/active', authenticate, getActivePresenceRequest)

// POST /api/presence
router.post(
  '/',
  authenticate,
  requireActive,
  presenceLimiter,
  validate(schemas.createPresenceRequest),
  createPresenceRequest
)

// PATCH /api/presence/:id/accept  (helper)
router.patch('/:id/accept', authenticate, requireActive, acceptPresence)

// PATCH /api/presence/:id/decline  (helper)
router.patch('/:id/decline', authenticate, declinePresence)

// PATCH /api/presence/:id/cancel  (requester)
router.patch('/:id/cancel', authenticate, cancelPresenceRequest)

// PATCH /api/presence/:id/close
router.patch('/:id/close', authenticate, closePresenceRequest)

module.exports = router
