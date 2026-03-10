const router = require('express').Router();
const controller = require('../controllers/staticPage.controller');
const { authenticate } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/admin');

// Public route to fetch a page by its slug
// Example: GET /api/pages/privacy-policy
router.get('/:slug', controller.getPageBySlug);

// Admin routes
// List all pages
router.get('/', authenticate, requireAdmin, controller.getAllPages);

// Create a new page
router.post('/', authenticate, requireAdmin, controller.createPage);

// Update an existing page
router.put('/:slug', authenticate, requireAdmin, controller.updatePage);

module.exports = router;
