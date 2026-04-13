const path = require('path')
const fs = require('fs')

// Physical directory for persisted uploads (set absolute path in production).
// On Render (and similar), point this at a Persistent Disk mount so uploads survive deploys.
// Example: UPLOADS_ROOT=/var/socius/uploads
const UPLOADS_ROOT = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.join(__dirname, '../../uploads')

/** Subfolders served under /uploads/* in server.js — created on startup when the disk is empty. */
const UPLOAD_SUBDIRS = [
  'documents',
  'selfies',
  'help-categories',
  'presence-categories',
  'presence-items',
  'help-catalog-items',
  'issue-screenshots',
  'gallery',
  'blog-types',
  'blogs',
  'chat-media',
  'closures',
  'prepare-cards',
  'notification-campaigns',
]

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

/** Files stored at uploads root (e.g. app update APK/config), not under a /uploads/ URL prefix. */
const resolveUploadRootFile = (filename) => {
  ensureDir(UPLOADS_ROOT)
  const base = path.basename(String(filename || ''))
  if (!base || base === '.' || base === '..') {
    throw new Error('Invalid upload root filename')
  }
  return path.join(UPLOADS_ROOT, base)
}

const ensureAllUploadSubdirs = () => {
  ensureDir(UPLOADS_ROOT)
  for (const d of UPLOAD_SUBDIRS) {
    resolveUploadDir(d)
  }
}

const resolveUploadPublicPath = (subdir) => `/uploads/${String(subdir || '').replace(/^\/+|\/+$/g, '')}`

module.exports = {
  UPLOADS_ROOT,
  UPLOAD_SUBDIRS,
  resolveUploadDir,
  resolveUploadRootFile,
  ensureAllUploadSubdirs,
  resolveUploadPublicPath,
}

