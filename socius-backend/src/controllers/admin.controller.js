const path = require('path')
const verificationService = require('../services/verification.service')
const adminService = require('../services/admin.service')
const NotificationCampaignAsset = require('../models/NotificationCampaignAsset')
const { adminAwardBadge, revokeBadge } = require('../services/badge.service')
const {
  sendVerificationResultNotification,
  sendAccountUpdateNotification,
} = require('../services/notification.service')
const { persistLocalUpload } = require('../services/mediaStorage.service')
const { success } = require('../utils/response')
const logger = require('../utils/logger')

// ─── Verifications ─────────────────────────────────────────

const getPendingVerifications = async (req, res, next) => {
  try {
    const data = await adminService.getPendingVerifications(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

const getVerificationDetails = async (req, res, next) => {
  try {
    const data = await adminService.getVerificationDetails(req.params.userId)
    return success(res, data)
  } catch (err) { next(err) }
}

const approveVerification = async (req, res, next) => {
  try {
    const { userId } = req.params
    const verification = await verificationService.approveVerification(userId, req.user._id)
    try {
      await sendVerificationResultNotification(userId, true)
    } catch (notifyErr) {
      logger.warn('[Admin] verification approve notify failed', notifyErr?.message || notifyErr)
    }
    return success(res, verification, 'Verification approved')
  } catch (err) { next(err) }
}

const rejectVerification = async (req, res, next) => {
  try {
    const { userId } = req.params
    const verification = await verificationService.rejectVerification(userId, req.user._id, req.body)
    try {
      await sendVerificationResultNotification(userId, false)
    } catch (notifyErr) {
      logger.warn('[Admin] verification reject notify failed', notifyErr?.message || notifyErr)
    }
    return success(res, verification, 'Verification rejected')
  } catch (err) {
    return next(err)
  }
}

const requestResubmission = async (req, res, next) => {
  try {
    const { userId } = req.params
    const verification = await verificationService.requestResubmission(userId, req.user._id, req.body)
    try {
      await sendVerificationResultNotification(userId, false)
    } catch (notifyErr) {
      logger.warn('[Admin] verification resubmission notify failed', notifyErr?.message || notifyErr)
    }
    return success(res, verification, 'Resubmission requested')
  } catch (err) {
    return next(err)
  }
}

// ─── Account Management ───────────────────────────────────

const getUsers = async (req, res, next) => {
  try {
    const data = await adminService.getUsers(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

const exportUsersCsv = async (req, res, next) => {
  try {
    const csv = await adminService.exportUsersCsv(req.query)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="socius-users.csv"')
    res.send(`\ufeff${csv}`)
  } catch (err) {
    next(err)
  }
}

const getScenarioConfig = async (req, res, next) => {
  try {
    const data = await adminService.getScenarioConfigDraft()
    return success(res, data)
  } catch (err) { next(err) }
}

const patchScenarioConfig = async (req, res, next) => {
  try {
    const data = await adminService.upsertScenarioConfigDraft(req.user._id, req.body)
    return success(res, data, 'Scenario draft saved')
  } catch (err) { next(err) }
}

const adminClosePresenceRequest = async (req, res, next) => {
  try {
    await adminService.adminClosePresenceRequest(req.params.id, req.user._id, req.body)
    return success(res, { id: req.params.id }, 'Presence request closed')
  } catch (err) { next(err) }
}

const getUserDetails = async (req, res, next) => {
  try {
    const data = await adminService.getUserDetails(req.params.userId)
    return success(res, data)
  } catch (err) { next(err) }
}

const limitAccount = async (req, res, next) => {
  try {
    const user = await adminService.setAccountStatus(req.params.userId, 'limited', req.body.reason)
    await sendAccountUpdateNotification(req.params.userId, 'Your account is currently limited. Please contact support.')
    return success(res, user, 'Account limited')
  } catch (err) { next(err) }
}

const restoreAccount = async (req, res, next) => {
  try {
    const user = await adminService.setAccountStatus(req.params.userId, 'active')
    await sendAccountUpdateNotification(req.params.userId, 'Your account has been restored. All features are available.')
    return success(res, user, 'Account restored')
  } catch (err) { next(err) }
}

const suspendAccount = async (req, res, next) => {
  try {
    const user = await adminService.setAccountStatus(req.params.userId, 'suspended', req.body.reason)
    return success(res, user, 'Account suspended')
  } catch (err) { next(err) }
}

// ─── Badges ───────────────────────────────────────────────

const awardBadge = async (req, res, next) => {
  try {
    const badge = await adminAwardBadge(req.params.userId, req.body.type, req.user._id)
    return success(res, badge, badge ? 'Badge awarded' : 'Badge already exists')
  } catch (err) { next(err) }
}

const revokeUserBadge = async (req, res, next) => {
  try {
    await revokeBadge(req.params.userId, req.body.type, req.body.reason)
    return success(res, null, 'Badge revoked')
  } catch (err) { next(err) }
}

// ─── Reports ──────────────────────────────────────────────

const getReports = async (req, res, next) => {
  try {
    const data = await adminService.getReports(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

const updateReportReviewStatus = async (req, res, next) => {
  try {
    const report = await adminService.updateReportReviewStatus(
      req.params.reportId,
      req.user._id,
      req.body
    )
    return success(res, report, 'Report updated')
  } catch (err) {
    next(err)
  }
}

const resolveReport = async (req, res, next) => {
  try {
    const report = await adminService.resolveReport(req.params.reportId, req.user._id, req.body)
    return success(res, report, 'Report resolved')
  } catch (err) { next(err) }
}

// ─── Dashboard ────────────────────────────────────────────

const getDashboardStats = async (req, res, next) => {
  try {
    const data = await adminService.getDashboardStats()
    return success(res, data)
  } catch (err) { next(err) }
}

// ─── Live Awareness ───────────────────────────────────────

const getLiveAwareness = async (req, res, next) => {
  try {
    const data = await adminService.getLiveAwareness(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

// ─── Notifications ────────────────────────────────────────

const sendNotification = async (req, res, next) => {
  try {
    const result = await adminService.sendAdminNotification(req.body || {})
    return success(res, result, 'Notification sent')
  } catch (err) {
    next(err)
  }
}

const TTL_DAYS_RAW = Number(process.env.NOTIFICATION_CAMPAIGN_IMAGE_TTL_DAYS)
const NOTIFICATION_IMAGE_TTL_DAYS = Number.isFinite(TTL_DAYS_RAW)
  ? Math.min(90, Math.max(1, TTL_DAYS_RAW))
  : 7

/** POST multipart: field name `image` — stored under uploads/notification-campaigns, auto-deleted after TTL. */
const uploadAdminNotificationImage = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('Image file is required (field name: image)')
      err.statusCode = 400
      throw err
    }
    const rel = path.posix.join('notification-campaigns', req.file.filename)
    const expiresAt = new Date(Date.now() + NOTIFICATION_IMAGE_TTL_DAYS * 24 * 60 * 60 * 1000)
    const stored = await persistLocalUpload(req.file.path, { contentType: req.file.mimetype })
    await NotificationCampaignAsset.create({
      relativePath: rel,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user?._id || null,
      expiresAt,
    })
    let origin = String(process.env.PUBLIC_ORIGIN || process.env.SOCIUS_PUBLIC_ORIGIN || '')
      .trim()
      .replace(/\/+$/, '')
    if (!origin) {
      const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim()
      const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim()
      if (host) origin = `${proto}://${host}`
    }
    const isAbs = /^https?:\/\//i.test(stored)
    const imageUrl = isAbs ? stored : origin ? `${origin}${stored.startsWith('/') ? stored : `/${stored}`}` : stored
    return success(res, {
      imageUrl,
      publicPath: stored,
      expiresAt: expiresAt.toISOString(),
      ttlDays: NOTIFICATION_IMAGE_TTL_DAYS,
    })
  } catch (err) {
    next(err)
  }
}

// ─── Device Tokens ────────────────────────────────────────

const getDeviceTokenCounts = async (req, res, next) => {
  try {
    const raw = req.query.userIds || ''
    const ids = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const data = await adminService.getDeviceTokenCounts(ids)
    return success(res, data)
  } catch (err) { next(err) }
}

const getDeviceTokensForUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    const data = await adminService.getDeviceTokensForUser(userId)
    return success(res, data)
  } catch (err) { next(err) }
}

const attachDeviceToken = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { token, platform } = req.body || {}
    const result = await adminService.attachDeviceTokenToUser({ userId, token, platform })
    return success(res, result, 'Device token attached')
  } catch (err) { next(err) }
}

const claimLatestUnassignedToken = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { platform } = req.body || {}
    const result = await adminService.claimLatestUnassignedToken({ userId, platform })
    return success(res, result, 'Latest unassigned device token attached')
  } catch (err) { next(err) }
}

const getRequestAttempts = async (req, res, next) => {
  try {
    const data = await adminService.getRequestAttempts(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

const getHelpRequests = async (req, res, next) => {
  try {
    const data = await adminService.getHelpRequests(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

const getHelpRequestDetails = async (req, res, next) => {
  try {
    const data = await adminService.getHelpRequestDetails(req.params.id)
    return success(res, data)
  } catch (err) { next(err) }
}

const getPresenceRequests = async (req, res, next) => {
  try {
    const data = await adminService.getPresenceRequests(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

const getPresenceRequestDetails = async (req, res, next) => {
  try {
    const data = await adminService.getPresenceRequestDetails(req.params.id)
    return success(res, data)
  } catch (err) { next(err) }
}

const getIncidentReview = async (req, res, next) => {
  try {
    const data = await adminService.getIncidentReview(req.query)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

const getClosures = async (req, res, next) => {
  try {
    const data = await adminService.getClosures(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

const getClosureDetails = async (req, res, next) => {
  try {
    const data = await adminService.getClosureDetails(req.params.id)
    return success(res, data)
  } catch (err) { next(err) }
}

const getSubscriptionPlans = async (req, res, next) => {
  try {
    const data = await adminService.getSubscriptionPlansForAdmin()
    return success(res, { items: data })
  } catch (err) { next(err) }
}

const updateSubscriptionPlan = async (req, res, next) => {
  try {
    const { planKey } = req.params
    const data = await adminService.updateSubscriptionPlanByKey(planKey, req.body || {}, req.user?._id)
    return success(res, data, 'Plan updated')
  } catch (err) { next(err) }
}

const getSystemSafeguards = async (req, res, next) => {
  try {
    const data = adminService.getSystemSafeguardsSnapshot()
    return success(res, data)
  } catch (err) { next(err) }
}

const getAuditLogs = async (req, res, next) => {
  try {
    const data = await adminService.getAdminAuditLogs(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

const getLegalExportHistory = async (req, res, next) => {
  try {
    const data = await adminService.listLegalExportRecords(req.query)
    return success(res, data)
  } catch (err) { next(err) }
}

const generateLegalExport = async (req, res, next) => {
  try {
    const bundle = await adminService.generateLegalExportBundle(req.user._id, req.body || {})
    const filename = `socius-legal-export-${Date.now()}.json`
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).send(JSON.stringify(bundle, null, 2))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getPendingVerifications,
  getVerificationDetails,
  approveVerification,
  rejectVerification,
  requestResubmission,
  getUsers,
  exportUsersCsv,
  getScenarioConfig,
  patchScenarioConfig,
  adminClosePresenceRequest,
  getUserDetails,
  limitAccount,
  restoreAccount,
  suspendAccount,
  awardBadge,
  revokeUserBadge,
  getReports,
  updateReportReviewStatus,
  resolveReport,
  getDashboardStats,
  getLiveAwareness,
  sendNotification,
  uploadAdminNotificationImage,
  getDeviceTokenCounts,
  getDeviceTokensForUser,
  attachDeviceToken,
  claimLatestUnassignedToken,
  getRequestAttempts,
  getHelpRequests,
  getHelpRequestDetails,
  getPresenceRequests,
  getPresenceRequestDetails,
  getIncidentReview,
  getClosures,
  getClosureDetails,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  getSystemSafeguards,
  getAuditLogs,
  getLegalExportHistory,
  generateLegalExport,
}
