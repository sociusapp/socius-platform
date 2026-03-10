const router = require('express').Router()
const { getMyBadges, getUserBadges } = require('../controllers/badge.controller')
const { authenticate } = require('../middlewares/auth')

// GET /api/badges/me
router.get('/me', authenticate, getMyBadges)

// GET /api/badges/user/:userId
router.get('/user/:userId', authenticate, getUserBadges)

module.exports = router
