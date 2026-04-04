const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const { authenticate } = require('../middlewares/auth');

// Public route to render the capture page
router.get('/capture', publicController.renderCapturePage);

// API endpoint to save location data
router.post('/save-location', publicController.saveLocation);

// API endpoint to track user journey events (click, permission, etc.)
router.post('/track-event', publicController.trackEvent);

// Admin route to get all locations
router.get('/all-locations', authenticate, publicController.getAllLocations);

// Admin route to get visitor details
router.get('/visitor/:visitorId', authenticate, publicController.getLocationByVisitorId);

module.exports = router;
