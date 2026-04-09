const router = require('express').Router()
const {
  createPresenceRequest,
  getPresenceById,
  getActivePresenceRequest,
  acceptPresence,
  updatePresenceMatchStatus,
  declinePresence,
  cancelPresenceRequest,
  closePresenceRequest,
  getNearbyPresenceRequests,
  updatePresenceRequest,
} = require('../controllers/presence.controller')
const {
  listPublicCategories,
  listPublicItems,
} = require('../controllers/presenceCatalog.controller')
const { authenticate, requireActive } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')
const { presenceLimiter } = require('../middlewares/rateLimiter')

// GET /api/presence/nearby
router.get('/nearby', authenticate, validate(schemas.nearbyPresenceQuery, 'query'), getNearbyPresenceRequests)

// GET /api/presence/categories
router.get('/categories', authenticate, listPublicCategories)

// GET /api/presence/items?categoryId={id}
router.get('/items', authenticate, listPublicItems)

// GET /api/presence/active
router.get('/active', authenticate, getActivePresenceRequest)

// GET /api/presence/:id
router.get('/:id', authenticate, getPresenceById)

// PATCH /api/presence/:id (requester)
router.patch('/:id', authenticate, requireActive, validate(schemas.updatePresenceRequest), updatePresenceRequest)

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

// PATCH /api/presence/:id/status (helper - en_route, arrived)
router.patch('/:id/status', authenticate, requireActive, validate(schemas.updatePresenceStatus), updatePresenceMatchStatus)

// PATCH /api/presence/:id/decline  (helper)
router.patch('/:id/decline', authenticate, declinePresence)

// PATCH /api/presence/:id/cancel  (requester)
router.patch('/:id/cancel', authenticate, cancelPresenceRequest)

// PATCH /api/presence/:id/close
router.patch('/:id/close', authenticate, validate(schemas.closePresenceRequest), closePresenceRequest)

module.exports = router
