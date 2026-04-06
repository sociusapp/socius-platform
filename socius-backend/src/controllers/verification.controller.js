const verificationService = require('../services/verification.service')
const { success, created } = require('../utils/response')

const getVerificationStatus = async (req, res, next) => {
  try {
    const verification = await verificationService.getOrCreate(req.user._id)
    return success(res, verification)
  } catch (err) {
    next(err)
  }
}

const submitDocuments = async (req, res, next) => {
  try {
    const verification = await verificationService.submitDocuments(req.user._id, req.files)
    return created(res, verification, 'Documents submitted for review')
  } catch (err) {
    next(err)
  }
}

const retryVerification = async (req, res, next) => {
  try {
    const verification = await verificationService.retryVerification(req.user._id, req.files)
    return success(res, verification, 'Verification resubmitted')
  } catch (err) {
    next(err)
  }
}

const submitReviewRequest = async (req, res, next) => {
  try {
    const { userExplanation } = req.body
    const verification = await verificationService.submitReviewRequest(req.user._id, {
      userExplanation,
      files: req.files,
    })
    return success(res, verification, 'Review request submitted')
  } catch (err) {
    next(err)
  }
}

const updateSelfie = async (req, res, next) => {
  try {
    const selfieFile = req.files?.selfie?.[0] || req.file
    const verification = await verificationService.updateSelfieOnly(req.user._id, selfieFile)
    return success(res, verification, 'Selfie updated successfully')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getVerificationStatus,
  submitDocuments,
  retryVerification,
  submitReviewRequest,
  updateSelfie,
}
