const GalleryImage = require('../models/GalleryImage');
const { success } = require('../utils/response');

const getGalleryImages = async (req, res, next) => {
  try {
    const settings = await GalleryImage.getSettings();
    return success(res, { imageUrls: settings.imageUrls });
  } catch (err) {
    next(err);
  }
};

const updateGalleryImages = async (req, res, next) => {
  try {
    const { imageUrls } = req.body;
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length !== 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Exactly 6 image URLs are required' 
      });
    }
    
    // Validate URLs
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        new URL(imageUrls[i]);
      } catch {
        return res.status(400).json({
          success: false,
          message: `Invalid URL at position ${i + 1}: ${imageUrls[i]}`
        });
      }
    }
    
    let settings = await GalleryImage.findOne();
    if (!settings) {
      settings = new GalleryImage({ imageUrls });
    } else {
      settings.imageUrls = imageUrls;
    }
    
    settings.updatedBy = req.user?._id;
    await settings.save();
    
    return success(res, { imageUrls: settings.imageUrls }, 'Gallery images updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGalleryImages,
  updateGalleryImages
};
