const StaticPage = require('../models/StaticPage');
const response = require('../utils/response');

// Get page by slug (Public)
exports.getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = await StaticPage.findOne({ slug });
    
    if (!page) {
      return response.notFound(res, 'Page not found');
    }
    
    return response.success(res, page, 'Page fetched successfully');
  } catch (error) {
    console.error('Error fetching static page:', error);
    return response.error(res, 'Internal server error');
  }
};

// Get all pages (Admin)
exports.getAllPages = async (req, res) => {
  try {
    const pages = await StaticPage.find().sort({ section: 1, title: 1 });
    return response.success(res, pages, 'Pages fetched successfully');
  } catch (error) {
    console.error('Error fetching static pages:', error);
    return response.error(res, 'Internal server error');
  }
};

// Create a new page (Admin)
exports.createPage = async (req, res) => {
  try {
    const { slug, title, content, section } = req.body;
    
    const existingPage = await StaticPage.findOne({ slug });
    if (existingPage) {
      return response.conflict(res, 'Page with this slug already exists');
    }
    
    const newPage = await StaticPage.create({ slug, title, content, section });
    return response.created(res, newPage, 'Page created successfully');
  } catch (error) {
    console.error('Error creating static page:', error);
    return response.error(res, 'Internal server error');
  }
};

// Update a page (Admin)
exports.updatePage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, content, section, isActive } = req.body;
    
    const page = await StaticPage.findOneAndUpdate(
      { slug },
      { title, content, section, isActive },
      { new: true, runValidators: true }
    );
    
    if (!page) {
      return response.notFound(res, 'Page not found');
    }
    
    return response.success(res, page, 'Page updated successfully');
  } catch (error) {
    console.error('Error updating static page:', error);
    return response.error(res, 'Internal server error');
  }
};
