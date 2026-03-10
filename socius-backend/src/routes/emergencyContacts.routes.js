const router = require('express').Router()
const {
  getContacts,
  addContact,
  updateContact,
  deleteContact,
} = require('../controllers/emergencyContacts.controller')
const { authenticate } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')

// GET /api/emergency-contacts
router.get('/', authenticate, getContacts)

// POST /api/emergency-contacts
router.post('/', authenticate, validate(schemas.addEmergencyContact), addContact)

// PUT /api/emergency-contacts/:id
router.put('/:id', authenticate, validate(schemas.addEmergencyContact), updateContact)

// DELETE /api/emergency-contacts/:id
router.delete('/:id', authenticate, deleteContact)

module.exports = router
