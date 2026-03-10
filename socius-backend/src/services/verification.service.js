const Verification = require('../models/Verification')
const User = require('../models/User')
const logger = require('../utils/logger')
const { compressImage } = require('../utils/imageCompressor')
const redis = require('../config/redis')

/**
 * Verification record get karo (ya banao agar nahi hai)
 */
const getOrCreate = async (userId) => {
  let verification = await Verification.findOne({ userId })
  if (!verification) {
    verification = await Verification.create({ userId })
  }
  return verification
}

/**
 * Documents submit karo (govId + selfie)
 */
const submitDocuments = async (userId, files) => {
  const verification = await getOrCreate(userId)

  if (['pending', 'approved'].includes(verification.status)) {
    const err = new Error('Verification already submitted or approved')
    err.statusCode = 409
    throw err
  }

  const updates = { submittedAt: new Date(), status: 'pending' }

  if (files?.government_id?.[0]) {
    const f = files.government_id[0]
    await compressImage(f.path, 70)
    updates.governmentId = {
      fileUrl: f.path,
      fileName: f.filename,
      fileType: f.mimetype,
      uploadedAt: new Date(),
    }
  }

  if (files?.selfie?.[0]) {
    const f = files.selfie[0]
    await compressImage(f.path, 60)
    updates.selfie = {
      fileUrl: f.path,
      fileName: f.filename,
      uploadedAt: new Date(),
    }
  }

  if (!updates.governmentId && !updates.selfie) {
    const err = new Error('At least one document required')
    err.statusCode = 400
    throw err
  }

  Object.assign(verification, updates)
  await verification.save()

  logger.info(`Verification submitted: ${userId}`)
  return verification
}

/**
 * Retry verification — failed ke baad
 */
const retryVerification = async (userId, files) => {
  const verification = await Verification.findOne({ userId })

  if (!verification || verification.status !== 'failed') {
    const err = new Error('No failed verification found to retry')
    err.statusCode = 400
    throw err
  }

  const MAX_RETRIES = 5
  if (verification.retryCount >= MAX_RETRIES) {
    const err = new Error('Maximum retry attempts reached. Please contact support.')
    err.statusCode = 429
    throw err
  }

  const updates = {
    status: 'pending',
    failureReasons: [],
    retryCount: verification.retryCount + 1,
    lastRetryAt: new Date(),
    submittedAt: new Date(),
    adminNote: null,
  }

  if (files?.government_id?.[0]) {
    const f = files.government_id[0]
    await compressImage(f.path, 70)
    updates.governmentId = {
      fileUrl: f.path,
      fileName: f.filename,
      fileType: f.mimetype,
      uploadedAt: new Date(),
    }
  }

  if (files?.selfie?.[0]) {
    const f = files.selfie[0]
    await compressImage(f.path, 60)
    updates.selfie = {
      fileUrl: f.path,
      fileName: f.filename,
      uploadedAt: new Date(),
    }
  }

  Object.assign(verification, updates)
  await verification.save()

  logger.info(`Verification retry: ${userId} (attempt ${verification.retryCount})`)
  return verification
}

/**
 * Manual review request — user ne explain kiya
 */
const submitReviewRequest = async (userId, { userExplanation, files }) => {
  const verification = await Verification.findOne({ userId })

  if (!verification) {
    const err = new Error('Verification record not found')
    err.statusCode = 404
    throw err
  }

  if (files?.updated_doc?.[0]) {
    await compressImage(files.updated_doc[0].path, 70)
  }
  if (files?.updated_selfie?.[0]) {
    await compressImage(files.updated_selfie[0].path, 60)
  }

  verification.reviewRequest = {
    isRequested: true,
    requestedAt: new Date(),
    userExplanation: userExplanation || null,
    updatedDocUrl: files?.updated_doc?.[0]?.path || null,
    updatedSelfieUrl: files?.updated_selfie?.[0]?.path || null,
    status: 'pending',
  }
  verification.status = 'review_requested'

  await verification.save()
  logger.info(`Review requested: ${userId}`)
  return verification
}

// ─── Admin Actions ────────────────────────────────────────

const ensureHistoryArray = (verification) => {
  if (!Array.isArray(verification.reviewHistory)) {
    verification.reviewHistory = []
  }
}

/**
 * Admin — verification approve karo
 * Simple flow: record lo (ya banao), fields set karo, history push karo, save karo
 */
const approveVerification = async (userId, adminId) => {
  const verification = await getOrCreate(userId)
  const now = new Date()

  verification.status = 'approved'
  verification.reviewedBy = adminId
  verification.reviewedAt = now
  verification.failureReasons = []
  verification.adminNote = null
  if (verification.reviewRequest && verification.reviewRequest.status) {
    verification.reviewRequest.status = 'resolved'
  }
  ensureHistoryArray(verification)
  verification.reviewHistory.push({
    status: 'approved',
    action: 'approved',
    reviewedBy: adminId,
    reviewedAt: now,
    failureReasons: [],
    adminNote: null,
  })

  await verification.save()

  await User.findByIdAndUpdate(userId, {
    isIdentityVerified: true,
    accountStatus: 'active',
    profileImage: verification.selfie?.fileUrl || null,
  })

  // Clear caches so mobile app sees the update immediately
  await redis.del(`user:home:${userId}`)
  await redis.del(`user:profile:${userId}`)

  logger.info(`Verification approved: ${userId} by admin ${adminId}`)
  return verification
}

/**
 * Admin — verification reject karo
 * Simple flow: record lo (ya banao), fields set karo, history push karo, save karo
 */
const rejectVerification = async (userId, adminId, { failureReasons, adminNote }) => {
  const verification = await getOrCreate(userId)
  const now = new Date()
  const reasons = Array.isArray(failureReasons) ? failureReasons : []
  const note = adminNote || null

  verification.status = 'failed'
  verification.failureReasons = reasons
  verification.adminNote = note
  verification.reviewedBy = adminId
  verification.reviewedAt = now
  ensureHistoryArray(verification)
  verification.reviewHistory.push({
    status: 'failed',
    action: 'rejected',
    reviewedBy: adminId,
    reviewedAt: now,
    failureReasons: reasons,
    adminNote: note,
  })

  await verification.save()

  await User.findByIdAndUpdate(userId, {
    isIdentityVerified: false,
    accountStatus: 'pending_review',
  })

  // Clear caches
  await redis.del(`user:home:${userId}`)
  await redis.del(`user:profile:${userId}`)

  logger.info(`Verification rejected: ${userId} by admin ${adminId}`)
  return verification
}

/**
 * Admin — request resubmission with rejection data
 */
const requestResubmission = async (userId, adminId, { failureReasons, adminNote }) => {
  const verification = await getOrCreate(userId)
  const now = new Date()
  const reasons = Array.isArray(failureReasons) ? failureReasons : []
  const note = adminNote || null

  verification.status = 'failed'
  verification.failureReasons = reasons
  verification.adminNote = note
  verification.reviewedBy = adminId
  verification.reviewedAt = now
  verification.reviewRequest = {
    isRequested: true,
    requestedAt: now,
    userExplanation: null,
    updatedDocUrl: null,
    updatedSelfieUrl: null,
    status: 'pending',
  }
  ensureHistoryArray(verification)
  verification.reviewHistory.push({
    status: 'failed',
    action: 'rejected',
    reviewedBy: adminId,
    reviewedAt: now,
    failureReasons: reasons,
    adminNote: note,
  })

  await verification.save()

  await User.findByIdAndUpdate(userId, {
    isIdentityVerified: false,
    accountStatus: 'pending_review',
  })

  // Clear caches
  await redis.del(`user:home:${userId}`)
  await redis.del(`user:profile:${userId}`)

  logger.info(`Resubmission requested by admin for user ${userId}`)
  return verification
}

module.exports = {
  getOrCreate,
  submitDocuments,
  retryVerification,
  submitReviewRequest,
  approveVerification,
  rejectVerification,
  requestResubmission,
}
