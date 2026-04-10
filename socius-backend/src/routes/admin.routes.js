const router = require('express').Router()
const {
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
} = require('../controllers/admin.controller')
const { authenticate } = require('../middlewares/auth')
const { requireAdmin } = require('../middlewares/admin')
const { validate, schemas } = require('../middlewares/validate')
const {
  uploadHelpCategoryIcon,
  uploadPresenceCategoryIcon,
  uploadPresenceItemIcon,
  uploadHelpCatalogItemIcon,
  uploadPrepareCardImage,
  uploadNotificationCampaignImage,
} = require('../middlewares/upload')
const helpCategoryController = require('../controllers/helpCategory.controller')
const presenceCatalogController = require('../controllers/presenceCatalog.controller')
const helpCatalogController = require('../controllers/helpCatalog.controller')
const helpSubcategoryController = require('../controllers/helpSubcategory.controller')
const prepareCardsController = require('../controllers/prepareCards.controller')
const prepareLearnController = require('../controllers/prepareLearn.controller')
const communitySurveyController = require('../controllers/communitySurvey.controller')

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin)

// ─── Subscription catalog (admin-editable plans) ───────────
router.get('/subscription-plans', getSubscriptionPlans)
router.patch('/subscription-plans/:planKey', updateSubscriptionPlan)

router.get('/system-safeguards', getSystemSafeguards)

router.get('/scenario-config', getScenarioConfig)
router.patch('/scenario-config', validate(schemas.scenarioConfigDraft), patchScenarioConfig)

router.get('/audit-logs', getAuditLogs)
router.get('/legal-exports', getLegalExportHistory)
router.post('/legal-exports/generate', generateLegalExport)

// ─── Dashboard ────────────────────────────────────────────
// GET /api/admin/dashboard
router.get('/dashboard', getDashboardStats)

// ─── Live Awareness ───────────────────────────────────────
// GET /api/admin/live-awareness
router.get('/live-awareness', getLiveAwareness)

// ─── Notifications ────────────────────────────────────────
// POST /api/admin/notifications/upload-image (multipart, field: image)
router.post(
  '/notifications/upload-image',
  uploadNotificationCampaignImage,
  uploadAdminNotificationImage
)
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

// PATCH /api/admin/reports/:reportId/status
router.patch('/reports/:reportId/status', updateReportReviewStatus)

// PATCH /api/admin/reports/:reportId/resolve
router.patch('/reports/:reportId/resolve', resolveReport)

// ─── Request Attempts ─────────────────────────────────────
// GET /api/admin/request-attempts
router.get('/request-attempts', getRequestAttempts)

// ─── DailyHelp (Help Requests) ────────────────────────────
// GET /api/admin/help-requests
router.get('/help-requests', getHelpRequests)
// GET /api/admin/help-requests/:id
router.get('/help-requests/:id', getHelpRequestDetails)

// ─── DailyHelp (Presence Requests) ─────────────────────────
// GET /api/admin/presence-requests
router.get('/presence-requests', getPresenceRequests)
// GET /api/admin/presence-requests/:id
router.get('/presence-requests/:id', getPresenceRequestDetails)
router.post(
  '/presence-requests/:id/close',
  validate(schemas.closePresenceRequest),
  adminClosePresenceRequest
)

// ─── Incident review (post-event presence + help) ───────────
// GET /api/admin/incident-review
router.get('/incident-review', getIncidentReview)

// ─── DailyHelp (Closures) ─────────────────────────────────
// GET /api/admin/closures
router.get('/closures', getClosures)
// GET /api/admin/closures/:id
router.get('/closures/:id', getClosureDetails)

// ─── DailyHelp Categories ─────────────────────────────────
router.get('/help-categories', helpCategoryController.listAdmin)
router.post('/help-categories', uploadHelpCategoryIcon, validate(schemas.adminCreateHelpCategory), helpCategoryController.createAdmin)
router.get('/help-categories/:id', helpCategoryController.getAdmin)
router.put('/help-categories/:id', uploadHelpCategoryIcon, validate(schemas.adminUpdateHelpCategory), helpCategoryController.updateAdmin)
router.patch('/help-categories/:id', uploadHelpCategoryIcon, validate(schemas.adminUpdateHelpCategory), helpCategoryController.updateAdmin)
router.delete('/help-categories/:id', helpCategoryController.deleteAdmin)

// ─── DailyHelp catalog items (per HelpCategory) ──────────────
router.get('/help-catalog-items', helpCatalogController.listAdminHelpItems)
router.post('/help-catalog-items', uploadHelpCatalogItemIcon, helpCatalogController.createHelpItem)
router.put('/help-catalog-items/:id', uploadHelpCatalogItemIcon, helpCatalogController.updateHelpItem)
router.patch('/help-catalog-items/:id', uploadHelpCatalogItemIcon, helpCatalogController.updateHelpItem)
router.delete('/help-catalog-items/:id', helpCatalogController.deleteHelpItem)

// ─── DailyHelp Sub-categories (per category) ─────────────────
router.get('/help-subcategories', helpSubcategoryController.listAdmin)
router.post('/help-subcategories', validate(schemas.adminCreateHelpSubcategory), helpSubcategoryController.createAdmin)
router.put('/help-subcategories/:id', validate(schemas.adminUpdateHelpSubcategory), helpSubcategoryController.updateAdmin)
router.patch('/help-subcategories/:id', validate(schemas.adminUpdateHelpSubcategory), helpSubcategoryController.updateAdmin)
router.delete('/help-subcategories/:id', helpSubcategoryController.deleteAdmin)

// ─── Presence Catalog (Categories + Items) ─────────────────
router.get('/presence-categories', presenceCatalogController.listAdminCategories)
router.post('/presence-categories', uploadPresenceCategoryIcon, presenceCatalogController.createCategory)
router.put('/presence-categories/:id', uploadPresenceCategoryIcon, presenceCatalogController.updateCategory)
router.patch('/presence-categories/:id', uploadPresenceCategoryIcon, presenceCatalogController.updateCategory)
router.delete('/presence-categories/:id', presenceCatalogController.deleteCategory)

router.get('/presence-items', presenceCatalogController.listAdminItems)
router.post('/presence-items', uploadPresenceItemIcon, presenceCatalogController.createItem)
router.put('/presence-items/:id', uploadPresenceItemIcon, presenceCatalogController.updateItem)
router.patch('/presence-items/:id', uploadPresenceItemIcon, presenceCatalogController.updateItem)
router.delete('/presence-items/:id', presenceCatalogController.deleteItem)

// ─── Prepare tab (mobile "Prepare & Stay Ready" cards) ─────
// Register /reorder BEFORE /:id so "reorder" is never captured as an id
router.post('/prepare-cards/reorder', prepareCardsController.reorderAdmin)
router.get('/prepare-cards', prepareCardsController.listAdmin)
router.post('/prepare-cards', uploadPrepareCardImage, prepareCardsController.createAdmin)
// Learn more (literal paths — MUST stay before /prepare-cards/:id)
router.get('/prepare-cards/learn-more', prepareLearnController.getAdmin)
router.patch('/prepare-cards/learn-more/settings', prepareLearnController.patchSettingsAdmin)
router.post('/prepare-cards/learn-more/chips/reorder', prepareLearnController.reorderChipsAdmin)
router.post('/prepare-cards/learn-more/chips', prepareLearnController.createChipAdmin)
router.patch('/prepare-cards/learn-more/chips/:chipId', prepareLearnController.updateChipAdmin)
router.delete('/prepare-cards/learn-more/chips/:chipId', prepareLearnController.deleteChipAdmin)
// Only 24-char hex Mongo ids — avoids /learn-more being treated as :id if route order regresses
const prepareCardId = ':id([0-9a-fA-F]{24})'
router.get(`/prepare-cards/${prepareCardId}`, prepareCardsController.getAdminById)
router.put(`/prepare-cards/${prepareCardId}`, uploadPrepareCardImage, prepareCardsController.updateAdmin)
router.patch(`/prepare-cards/${prepareCardId}`, uploadPrepareCardImage, prepareCardsController.updateAdmin)
router.delete(`/prepare-cards/${prepareCardId}`, prepareCardsController.deleteAdmin)

// ─── Community survey (Community tab / mobile) ─────────────
router.get('/community-survey/questions', communitySurveyController.listAdmin)
router.get('/community-survey/votes', communitySurveyController.listVotesAdmin)
router.post('/community-survey/questions', communitySurveyController.createAdmin)
router.put('/community-survey/questions/:id', communitySurveyController.updateAdmin)
router.delete('/community-survey/questions/:id', communitySurveyController.deleteAdmin)

module.exports = router
