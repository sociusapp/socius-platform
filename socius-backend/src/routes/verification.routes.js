const router = require('express').Router()
const {
  getVerificationStatus,
  submitDocuments,
  retryVerification,
  submitReviewRequest,
  updateSelfie,
} = require('../controllers/verification.controller')
const { authenticate } = require('../middlewares/auth')
const { uploadVerificationDocs, uploadReviewDocs } = require('../middlewares/upload')

// GET /api/verification
router.get('/', authenticate, getVerificationStatus)

// POST /api/verification/submit
router.post('/submit', authenticate, uploadVerificationDocs, submitDocuments)

// POST /api/verification/retry
router.post('/retry', authenticate, uploadVerificationDocs, retryVerification)

// POST /api/verification/review-request
router.post('/review-request', authenticate, uploadReviewDocs, submitReviewRequest)

// PATCH /api/verification/selfie — update selfie only (pending status mein bhi allowed)
router.patch('/selfie', authenticate, uploadVerificationDocs, updateSelfie)

module.exports = router
