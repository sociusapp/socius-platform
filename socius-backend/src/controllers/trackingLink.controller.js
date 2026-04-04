const TrackingLink = require('../models/TrackingLink');
const { success, created } = require('../utils/response');
const logger = require('../utils/logger');

// Create a new tracking link
const createTrackingLink = async (req, res, next) => {
  try {
    const { slug, name, description, campaign, expiresAt } = req.body;
    
    // Validate slug - only allow alphanumeric, hyphens, underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return res.status(400).json({ 
        error: 'Slug can only contain letters, numbers, hyphens and underscores' 
      });
    }
    
    // Check if slug already exists
    const existing = await TrackingLink.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'This URL slug is already taken' });
    }
    
    const trackingLink = new TrackingLink({
      slug: slug.toLowerCase(),
      name,
      description,
      campaign: campaign || 'default',
      createdBy: req.user._id,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });
    
    await trackingLink.save();
    logger.info(`Tracking link created: ${slug} by ${req.user.email}`);
    
    return created(res, trackingLink, 'Tracking link created successfully');
  } catch (err) {
    next(err);
  }
};

// Get all tracking links
const getAllTrackingLinks = async (req, res, next) => {
  try {
    const links = await TrackingLink.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    return success(res, links);
  } catch (err) {
    next(err);
  }
};

// Get single tracking link
const getTrackingLink = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const link = await TrackingLink.findOne({ slug: slug.toLowerCase() })
      .populate('createdBy', 'name email');
    
    if (!link) {
      return res.status(404).json({ error: 'Tracking link not found' });
    }
    
    return success(res, link);
  } catch (err) {
    next(err);
  }
};

// Update tracking link
const updateTrackingLink = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, description, isActive, campaign, expiresAt } = req.body;
    
    const link = await TrackingLink.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      {
        name,
        description,
        isActive,
        campaign,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      { new: true }
    );
    
    if (!link) {
      return res.status(404).json({ error: 'Tracking link not found' });
    }
    
    logger.info(`Tracking link updated: ${slug}`);
    return success(res, link, 'Tracking link updated successfully');
  } catch (err) {
    next(err);
  }
};

// Delete tracking link
const deleteTrackingLink = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    const link = await TrackingLink.findOneAndDelete({ slug: slug.toLowerCase() });
    
    if (!link) {
      return res.status(404).json({ error: 'Tracking link not found' });
    }
    
    logger.info(`Tracking link deleted: ${slug}`);
    return success(res, null, 'Tracking link deleted successfully');
  } catch (err) {
    next(err);
  }
};

// Increment visit stats
const incrementLinkStats = async (slug, isNewVisitor = false, locationCaptured = false) => {
  try {
    const updates = { $inc: { totalVisits: 1 } };
    if (isNewVisitor) updates.$inc.uniqueVisitors = 1;
    if (locationCaptured) updates.$inc.successfulCaptures = 1;
    
    await TrackingLink.findOneAndUpdate(
      { slug: slug.toLowerCase() },
      updates
    );
  } catch (err) {
    logger.error('Failed to increment link stats:', err.message);
  }
};

module.exports = {
  createTrackingLink,
  getAllTrackingLinks,
  getTrackingLink,
  updateTrackingLink,
  deleteTrackingLink,
  incrementLinkStats
};
