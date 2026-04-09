const router = require('express').Router()
const path = require('path')
const { authenticate } = require('../middlewares/auth')
const { uploadClosureEvidence } = require('../middlewares/upload')
const { success } = require('../utils/response')

router.post('/closure-upload', authenticate, uploadClosureEvidence, (req, res) => {
  const files = (req.files || []).map((f) => {
    const name = f.filename || path.basename(f.path || '')
    if (!name) return ''
    return `/uploads/closures/${name.replace(/\\/g, '/')}`
  }).filter(Boolean)
  return success(res, { files })
})

module.exports = router
