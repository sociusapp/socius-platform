const path = require('path')
const fs = require('fs')

// Physical directory for persisted uploads (set absolute path in production).
// Example: UPLOADS_ROOT=/var/socius/uploads
const UPLOADS_ROOT = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.join(__dirname, '../../uploads')

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  return dirPath
}

const resolveUploadDir = (subdir) => {
  const clean = String(subdir || '').replace(/^\/+|\/+$/g, '')
  return ensureDir(path.join(UPLOADS_ROOT, clean))
}

const resolveUploadPublicPath = (subdir) => `/uploads/${String(subdir || '').replace(/^\/+|\/+$/g, '')}`

module.exports = {
  UPLOADS_ROOT,
  resolveUploadDir,
  resolveUploadPublicPath,
}

