const GalleryImage = require('../models/GalleryImage');
const { success } = require('../utils/response');
const { persistLocalUpload } = require('../services/mediaStorage.service');
const multer = require('multer');
const path = require('path');
const { resolveUploadDir } = require('../config/uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resolveUploadDir('gallery'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
  }
});

const uploadGalleryImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const { cardIndex } = req.body;
    if (cardIndex === undefined || cardIndex < 0 || cardIndex > 5) {
      return res.status(400).json({ success: false, message: 'Invalid card index (0-5)' });
    }
    
    const fileUrl = await persistLocalUpload(req.file.path, { contentType: req.file.mimetype });
    
    // Update the gallery settings
    let settings = await GalleryImage.findOne();
    if (!settings) {
      settings = new GalleryImage({});
    }
    
    // Update the specific card image
    settings.imageUrls[parseInt(cardIndex)] = fileUrl;
    settings.updatedBy = req.user?._id;
    await settings.save();
    
    return success(res, { 
      imageUrl: fileUrl, 
      cardIndex: parseInt(cardIndex),
      imageUrls: settings.imageUrls 
    }, 'Image uploaded successfully');
  } catch (err) {
    next(err);
  }
};

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
          message: 'Invalid URL at position ' + (i + 1) + ': ' + imageUrls[i]
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
  updateGalleryImages,
  uploadGalleryImage,
  upload
};
