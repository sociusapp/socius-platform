const router = require('express').Router()
const {
  getProfile,
  updateProfile,
  getHomeData,
  markFirstTimeFlag,
  deleteAccount,
  getHistory,
} = require('../controllers/user.controller')
const { authenticate } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')

// GET /api/user/home
router.get('/home', authenticate, getHomeData)

// GET /api/user/history
router.get('/history', authenticate, getHistory)

// GET /api/user/profile
router.get('/profile', authenticate, getProfile)

// PUT /api/user/profile
router.put('/profile', authenticate, validate(schemas.updateProfile), updateProfile)

// PATCH /api/user/flags/:flag
// flag = hasSeenAvailabilityGuide | hasSeenUserGuide | hasGivenLocationPermission
router.patch('/flags/:flag', authenticate, markFirstTimeFlag)

// DELETE /api/user/account
router.delete('/account', authenticate, deleteAccount)

module.exports = router
