const express = require('express');
const router = express.Router();
const trackingLinkController = require('../controllers/trackingLink.controller');
const { authenticate } = require('../middlewares/auth');

// Admin routes - require authentication
router.post('/', authenticate, trackingLinkController.createTrackingLink);
router.get('/', authenticate, trackingLinkController.getAllTrackingLinks);
router.get('/:slug', authenticate, trackingLinkController.getTrackingLink);
router.put('/:slug', authenticate, trackingLinkController.updateTrackingLink);
router.delete('/:slug', authenticate, trackingLinkController.deleteTrackingLink);

module.exports = router;
