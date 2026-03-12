const router = require('express').Router()
const {
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
} = require('../controllers/admin.controller')
const { authenticate } = require('../middlewares/auth')
const { requireAdmin } = require('../middlewares/admin')

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin)

// ─── Dashboard ────────────────────────────────────────────
// GET /api/admin/dashboard
router.get('/dashboard', getDashboardStats)

// ─── Live Awareness ───────────────────────────────────────
// GET /api/admin/live-awareness
router.get('/live-awareness', getLiveAwareness)

// ─── Notifications ────────────────────────────────────────
// POST /api/admin/notifications
router.post('/notifications', sendNotification)
// GET /api/admin/device-tokens?userIds=1,2,3
router.get('/device-tokens', getDeviceTokenCounts)
// GET /api/admin/device-tokens/:userId
router.get('/device-tokens/:userId', getDeviceTokensForUser)
// POST /api/admin/users/:userId/device-tokens/attach
router.post('/users/:userId/device-tokens/attach', attachDeviceToken)
// POST /api/admin/users/:userId/device-tokens/claim-latest
router.post('/users/:userId/device-tokens/claim-latest', claimLatestUnassignedToken)

// ─── Verifications ────────────────────────────────────────
// GET /api/admin/verifications
router.get('/verifications', getPendingVerifications)

// GET /api/admin/verifications/:userId
router.get('/verifications/:userId', getVerificationDetails)

// PATCH /api/admin/verifications/:userId/approve
router.patch('/verifications/:userId/approve', approveVerification)

// PATCH /api/admin/verifications/:userId/reject
router.patch('/verifications/:userId/reject', rejectVerification)

// PATCH /api/admin/verifications/:userId/request-resubmission
router.patch('/verifications/:userId/request-resubmission', requestResubmission)

// ─── Users ────────────────────────────────────────────────
// GET /api/admin/users
router.get('/users', getUsers)

// GET /api/admin/users/:userId
router.get('/users/:userId', getUserDetails)

// PATCH /api/admin/users/:userId/limit
router.patch('/users/:userId/limit', limitAccount)

// PATCH /api/admin/users/:userId/restore
router.patch('/users/:userId/restore', restoreAccount)

// PATCH /api/admin/users/:userId/suspend
router.patch('/users/:userId/suspend', suspendAccount)

// ─── Badges ───────────────────────────────────────────────
// POST /api/admin/users/:userId/badges
router.post('/users/:userId/badges', awardBadge)

// DELETE /api/admin/users/:userId/badges
router.delete('/users/:userId/badges', revokeUserBadge)

// ─── Reports ──────────────────────────────────────────────
// GET /api/admin/reports
router.get('/reports', getReports)

// PATCH /api/admin/reports/:reportId/resolve
router.patch('/reports/:reportId/resolve', resolveReport)

// ─── Request Attempts ─────────────────────────────────────
// GET /api/admin/request-attempts
router.get('/request-attempts', getRequestAttempts)

module.exports = router
