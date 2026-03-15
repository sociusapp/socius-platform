const router = require('express').Router()
const {
  sendOtp,
  verifyOtp,
  logout,
  adminPasswordLogin,
  developerPasswordLogin,
  getDeviceTokenStatus,
  updateDeviceToken,
} = require('../controllers/auth.controller')
const { authenticate } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')
const { otpLimiter, otpVerifyLimiter } = require('../middlewares/rateLimiter')

// POST /api/auth/send-otp
router.post('/send-otp', otpLimiter, validate(schemas.sendOtp), sendOtp)

// POST /api/auth/verify-otp
router.post('/verify-otp', otpVerifyLimiter, validate(schemas.verifyOtp), verifyOtp)

// POST /api/auth/admin-login
router.post('/admin-login', validate(schemas.adminLogin), adminPasswordLogin)

// POST /api/auth/developer-login
router.post('/developer-login', validate(schemas.adminLogin), developerPasswordLogin)

router.post('/logout', authenticate, logout)

router.get('/device-token', authenticate, getDeviceTokenStatus)

router.post('/device-token', authenticate, validate(schemas.updateDeviceToken), updateDeviceToken)

module.exports = router
