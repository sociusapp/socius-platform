const express = require('express')
const router = express.Router()
const multer = require('multer')
const blogController = require('../controllers/blog.controller')
const { authenticate, requireAdmin } = require('../middlewares/auth')

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'src/uploads/blogs'
    const fs = require('fs')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = require('path').extname(file.originalname)
    cb(null, 'blog-' + uniqueSuffix + ext)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Public routes (for mobile app)
router.get('/public/type/:typeId', blogController.getBlogsByType)
router.get('/public/slug/:slug', blogController.getBlogBySlug)

// Admin routes (protected)
router.get('/', authenticate, requireAdmin, blogController.getAllBlogs)
router.get('/admin/:id', authenticate, requireAdmin, blogController.getBlogById)
router.post('/', authenticate, requireAdmin, upload.single('featuredImage'), blogController.createBlog)
router.put('/:id', authenticate, requireAdmin, upload.single('featuredImage'), blogController.updateBlog)
router.delete('/:id', authenticate, requireAdmin, blogController.deleteBlog)

module.exports = router
