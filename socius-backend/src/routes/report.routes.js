const router = require('express').Router()
const { submitReport, getMyReports, updateMyReport, deleteMyReport } = require('../controllers/report.controller')
const { authenticate } = require('../middlewares/auth')
const { validate, schemas } = require('../middlewares/validate')
const { reportLimiter } = require('../middlewares/rateLimiter')

// GET /api/reports/me
router.get('/me', authenticate, getMyReports)

// POST /api/reports
router.post('/', authenticate, reportLimiter, validate(schemas.createReport), submitReport)

// PATCH /api/reports/:reportId
router.patch('/:reportId', authenticate, validate(schemas.updateReport), updateMyReport)

// DELETE /api/reports/:reportId
router.delete('/:reportId', authenticate, deleteMyReport)

module.exports = router
