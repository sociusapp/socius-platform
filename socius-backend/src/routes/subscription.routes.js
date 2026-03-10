const router = require('express').Router()
const {
  getSubscription,
  createSubscription,
  skipSubscription,
  updatePaymentMethod,
  pauseSubscription,
  cancelSubscription,
} = require('../controllers/subscription.controller')
const { authenticate } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')

// GET /api/subscription
router.get('/', authenticate, getSubscription)

// POST /api/subscription/create
router.post('/create', authenticate, createSubscription)

// POST /api/subscription/skip
router.post('/skip', authenticate, skipSubscription)

// PATCH /api/subscription/payment-method
router.patch('/payment-method', authenticate, validate(schemas.updatePayment), updatePaymentMethod)

// PATCH /api/subscription/pause
router.patch('/pause', authenticate, pauseSubscription)

// PATCH /api/subscription/cancel
router.patch('/cancel', authenticate, cancelSubscription)

module.exports = router
