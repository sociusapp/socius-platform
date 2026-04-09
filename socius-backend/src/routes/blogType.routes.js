const express = require('express')
const router = express.Router()
const multer = require('multer')
const { resolveUploadDir } = require('../config/uploads')
const blogTypeController = require('../controllers/blogType.controller')
const { authenticate, requireAdmin } = require('../middlewares/auth')

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = resolveUploadDir('blog-types')
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = require('path').extname(file.originalname)
    cb(null, 'blogtype-' + uniqueSuffix + ext)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

// Public routes (for mobile app)
router.get('/public', blogTypeController.getActiveBlogTypes)

// Admin routes (protected)
router.get('/', authenticate, requireAdmin, blogTypeController.getAllBlogTypes)
router.get('/:id', authenticate, requireAdmin, blogTypeController.getBlogTypeById)
router.post('/', authenticate, requireAdmin, upload.single('icon'), blogTypeController.createBlogType)
router.put('/:id', authenticate, requireAdmin, upload.single('icon'), blogTypeController.updateBlogType)
router.delete('/:id', authenticate, requireAdmin, blogTypeController.deleteBlogType)

module.exports = router
