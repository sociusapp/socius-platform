const router = require('express').Router()
const {
  getStatus,
  toggleAvailability,
  updateLocation,
} = require('../controllers/availability.controller')
const { authenticate, requireActive } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')

// GET /api/availability
router.get('/', authenticate, getStatus)

// PATCH /api/availability/toggle
router.patch('/toggle', authenticate, requireActive, validate(schemas.updateAvailability), toggleAvailability)

// PATCH /api/availability/location
router.patch('/location', authenticate, requireActive, updateLocation)

module.exports = router
