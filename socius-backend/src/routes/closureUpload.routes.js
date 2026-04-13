const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const { uploadClosureEvidence } = require('../middlewares/upload')
const { success } = require('../utils/response')
const { persistLocalUpload } = require('../services/mediaStorage.service')

router.post('/closure-upload', authenticate, uploadClosureEvidence, async (req, res, next) => {
  try {
    const files = []
    for (const f of req.files || []) {
      if (!f?.path) continue
      // eslint-disable-next-line no-await-in-loop
      files.push(await persistLocalUpload(f.path, { contentType: f.mimetype }))
    }
    return success(res, { files })
  } catch (err) {
    next(err)
  }
})

module.exports = router
