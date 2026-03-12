const verificationService = require('../services/verification.service')
const adminService = require('../services/admin.service')
const { adminAwardBadge, revokeBadge } = require('../services/badge.service')
const {
  sendVerificationResultNotification,
  sendAccountUpdateNotification,
} = require('../services/notification.service')
const { success } = require('../utils/response')

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
      // ignore notification errors
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
    } catch (notifyErr) {}
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
    } catch (notifyErr) {}
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
    const { userIds, title, body, priority } = req.body || {}
    const result = await adminService.sendAdminNotification({ userIds, title, body, priority })
    return success(res, result, 'Notification sent')
  } catch (err) { next(err) }
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

module.exports = {
  getPendingVerifications,
  getVerificationDetails,
  approveVerification,
  rejectVerification,
  requestResubmission,
  getUsers,
  getUserDetails,
  limitAccount,
  restoreAccount,
  suspendAccount,
  awardBadge,
  revokeUserBadge,
  getReports,
  resolveReport,
  getDashboardStats,
  getLiveAwareness,
  sendNotification,
  getDeviceTokenCounts,
  getDeviceTokensForUser,
  attachDeviceToken,
  claimLatestUnassignedToken,
  getRequestAttempts,
  getHelpRequests,
  getHelpRequestDetails,
  getPresenceRequests,
  getPresenceRequestDetails,
  getClosures,
  getClosureDetails,
}
