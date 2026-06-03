const router = require('express').Router()
const {
  getProfile,
  updateProfile,
  getHomeData,
  markFirstTimeFlag,
  deleteAccount,
  getHistory,
  getNearbyUsers,
  getPublicUser,
} = require('../controllers/user.controller')
const {
  getContacts,
  addContact,
  updateContact,
  deleteContact,
} = require('../controllers/emergencyContacts.controller')
const { authenticate } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')

// GET /api/user/home
router.get('/home', authenticate, getHomeData)

// GET /api/user/nearby-users?latitude=..&longitude=..&radiusMeters=500
router.get('/nearby-users', authenticate, getNearbyUsers)

// GET /api/user/public/:id
router.get('/public/:id', authenticate, getPublicUser)

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

// GET /api/user/emergency-contacts
router.get('/emergency-contacts', authenticate, getContacts)

// POST /api/user/emergency-contacts
router.post('/emergency-contacts', authenticate, validate(schemas.addEmergencyContact), addContact)

// PUT /api/user/emergency-contacts/:id
router.put('/emergency-contacts/:id', authenticate, validate(schemas.addEmergencyContact), updateContact)

// DELETE /api/user/emergency-contacts/:id
router.delete('/emergency-contacts/:id', authenticate, deleteContact)

module.exports = router
