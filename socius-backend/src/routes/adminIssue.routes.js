const router = require('express').Router()
const {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  getAIStats,
  aiCompleteIssue,
} = require('../controllers/adminIssue.controller')
const { authenticate } = require('../middlewares/auth')
const { requireAdmin } = require('../middlewares/admin')
const { upload } = require('../middlewares/upload')

// Require internal authentication for all routes
router.use(authenticate, requireAdmin)

// GET /api/admin-issues
router.get('/', getIssues)

// GET /api/admin-issues/ai-stats
router.get('/stats/performance', getAIStats)

// POST /api/admin-issues/force-sync
router.post('/force-sync', async (req, res) => {
  const { syncIssuesToFile } = require('../utils/issueSync');
  await syncIssuesToFile();
  res.json({ success: true, message: 'Sync triggered' });
});

// POST /api/admin-issues
router.post('/', upload.fields([
  { name: 'screenshot', maxCount: 1 },
  { name: 'voiceNote', maxCount: 1 }
]), createIssue)

// GET /api/admin/issues/:id
router.get('/:id', getIssueById)

// POST /api/admin/issues/:id/ai-complete
router.post('/:id/ai-complete', aiCompleteIssue)

// PATCH /api/admin/issues/:id
router.patch('/:id', updateIssue)

// DELETE /api/admin/issues/:id
router.delete('/:id', deleteIssue)

module.exports = router
