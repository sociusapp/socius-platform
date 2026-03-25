const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Public route to render the capture page
router.get('/capture', publicController.renderCapturePage);

// API endpoint to save location data
router.post('/save-location', publicController.saveLocation);

// Admin route to get all locations (should be protected in a real scenario)
// But for now, we'll keep it simple for the task
router.get('/all-locations', publicController.getAllLocations);

module.exports = router;
