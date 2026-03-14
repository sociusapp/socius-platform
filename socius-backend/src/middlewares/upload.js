const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { badRequest } = require('../utils/response')

// Folder exist na ho toh create karo
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/others'

    if (file.fieldname === 'government_id') folder = 'uploads/documents'
    if (file.fieldname === 'selfie') folder = 'uploads/selfies'
    if (file.fieldname === 'updated_doc') folder = 'uploads/documents'
    if (file.fieldname === 'updated_selfie') folder = 'uploads/selfies'
    if (file.fieldname === 'icon') folder = 'uploads/help-categories'

    ensureDir(folder)
    cb(null, folder)
  },

  filename: (req, file, cb) => {
    const userId = req.user?._id || 'unknown'
    const ext = path.extname(file.originalname).toLowerCase()
    const unique = `${userId}_${file.fieldname}_${Date.now()}${ext}`
    cb(null, unique)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only JPG, PNG, PDF files are allowed'), false)
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (effectively unlimited for mobile uploads)
  },
  fileFilter,
})

// ─── Upload presets ───────────────────────────────────────

// Government ID upload
const uploadGovId = upload.single('government_id')

// Selfie upload
const uploadSelfie = upload.single('selfie')

// Dono ek saath (verification submit)
// Closure evidence uploads (1-5 photos)
const uploadClosureEvidence = upload.array('closure_evidence', 5)

const uploadVerificationDocs = upload.fields([
  { name: 'government_id', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
])


// Review request re-upload
const uploadReviewDocs = upload.fields([
  { name: 'updated_doc', maxCount: 1 },
  { name: 'updated_selfie', maxCount: 1 },
])

const uploadHelpCategoryIcon = upload.single('icon')

/**
 * Multer errors handle karo gracefully
 */
const handleUploadError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (!err) return next()

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return badRequest(res, 'File too large. Maximum size is 100MB.')
        }
        return badRequest(res, `Upload error: ${err.message}`)
      }

      return badRequest(res, err.message || 'File upload failed')
    })
  }
}

module.exports = {
  uploadGovId: handleUploadError(uploadGovId),
  uploadSelfie: handleUploadError(uploadSelfie),
  uploadClosureEvidence: handleUploadError(uploadClosureEvidence),
  uploadVerificationDocs: handleUploadError(uploadVerificationDocs),
  uploadReviewDocs: handleUploadError(uploadReviewDocs),
  uploadHelpCategoryIcon: handleUploadError(uploadHelpCategoryIcon),
}
