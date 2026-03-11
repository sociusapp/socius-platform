const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const controller = require('../controllers/requestClosure.controller')

// POST /api/request/close
router.post('/close', authenticate, controller.postClose)

// GET /api/request/closure-feedback/:requestId
router.get('/closure-feedback/:requestId', authenticate, controller.getClosureFeedback)

// PUT /api/request/finalize-closure
router.put('/finalize-closure', authenticate, controller.putFinalize)

module.exports = router
