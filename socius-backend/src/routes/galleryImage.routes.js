const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { getGalleryImages, updateGalleryImages } = require('../controllers/galleryImage.controller');

// Get gallery images (public - used by capture page)
router.get('/gallery-images', getGalleryImages);

// Update gallery images (admin only)
router.put('/gallery-images', authenticate, updateGalleryImages);

module.exports = router;
