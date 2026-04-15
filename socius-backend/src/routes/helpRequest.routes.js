const router = require('express').Router()
const {
  createRequest,
  updateRequest,
  getMyActiveRequest,
  getRequestById,
  acceptRequest,
  declineRequest,
  cancelRequest,
  closeRequest,
  markAsDelivered,
  getNearbyRequests,
  sessionAction,
  createBorrowItem,
  getBorrowItems,
  respondBorrowItem,
  createOfferItem,
  respondOfferItem,
  getBorrowHistory,
} = require('../controllers/helpRequest.controller')
const { authenticate, requireActive } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')
const { helpRequestLimiter } = require('../middlewares/rateLimiter')

// GET /api/help-request/active
router.get('/active', authenticate, getMyActiveRequest)

// GET /api/help-request/nearby
router.get('/nearby', authenticate, getNearbyRequests)

// GET /api/help-request/:id
router.get('/:id', authenticate, getRequestById)

// PATCH /api/help-request/:id  (requester)
router.patch(
  '/:id',
  authenticate,
  requireActive,
  validate(schemas.updateHelpRequest),
  updateRequest
)

// POST /api/help-request
router.post(
  '/',
  authenticate,
  requireActive,
  helpRequestLimiter,
  validate(schemas.createHelpRequest),
  createRequest
)

// PATCH /api/help-request/:id/accept  (helper)
router.patch('/:id/accept', authenticate, requireActive, acceptRequest)

// PATCH /api/help-request/:id/decline  (helper)
router.patch('/:id/decline', authenticate, declineRequest)

// PATCH /api/help-request/:id/delivered  (helper)
router.patch('/:id/delivered', authenticate, markAsDelivered)

// PATCH /api/help-request/:id/session  (requester — extend or quick-complete)
router.patch(
  '/:id/session',
  authenticate,
  requireActive,
  validate(schemas.helpSessionAction),
  sessionAction
)

// PATCH /api/help-request/:id/cancel  (requester)
router.patch('/:id/cancel', authenticate, cancelRequest)

// PATCH /api/help-request/:id/close
router.patch('/:id/close', authenticate, validate(schemas.closeRequest), closeRequest)

// Borrow item flow (requester <-> matched helper)
router.get('/borrow/history', authenticate, getBorrowHistory)
router.get('/:id/borrow-items', authenticate, getBorrowItems)
router.post('/:id/borrow', authenticate, requireActive, validate(schemas.borrowItemCreate), createBorrowItem)
router.patch('/:id/borrow/:borrowId', authenticate, requireActive, validate(schemas.borrowItemRespond), respondBorrowItem)

router.post('/:id/offer', authenticate, requireActive, validate(schemas.offerItemCreate), createOfferItem)
router.patch('/:id/offer/:offerId', authenticate, requireActive, validate(schemas.offerItemRespond), respondOfferItem)

module.exports = router
