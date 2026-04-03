const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const authMiddleware = require('../middlewares/auth');

// Public route to render the capture page
router.get('/capture', publicController.renderCapturePage);

// API endpoint to save location data
router.post('/save-location', publicController.saveLocation);

// Admin route to get all locations
router.get('/all-locations', authMiddleware, publicController.getAllLocations);

// Admin route to get visitor details
router.get('/visitor/:visitorId', authMiddleware, publicController.getLocationByVisitorId);

module.exports = router;
