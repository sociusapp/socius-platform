const router = require('express').Router()
const { submitReport, getMyReports } = require('../controllers/report.controller')
const { authenticate } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')
const { reportLimiter } = require('../middlewares/rateLimiter')

// GET /api/reports/me
router.get('/me', authenticate, getMyReports)

// POST /api/reports
router.post('/', authenticate, reportLimiter, validate(schemas.createReport), submitReport)

module.exports = router
