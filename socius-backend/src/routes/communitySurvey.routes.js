const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const communitySurveyController = require('../controllers/communitySurvey.controller')

// Logged-in app users only
router.get('/questions', authenticate, communitySurveyController.listForUser)
router.post('/vote', authenticate, communitySurveyController.vote)

module.exports = router
