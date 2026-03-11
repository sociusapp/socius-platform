const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const { uploadClosureEvidence } = require('../middlewares/upload')
const { success } = require('../utils/response')

router.post('/closure-upload', authenticate, uploadClosureEvidence, (req, res) => {
  const files = (req.files || []).map(f => {
    const uploadIndex = f.path.indexOf('uploads/')
    const rel = uploadIndex !== -1 ? f.path.substring(uploadIndex) : f.path
    return '/' + rel.replace(/\\/g, '/')
  })
  return success(res, { files })
})

module.exports = router
