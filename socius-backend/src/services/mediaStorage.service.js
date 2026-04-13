const fs = require('fs')
const fsp = require('fs').promises
const path = require('path')
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { UPLOADS_ROOT } = require('../config/uploads')
const logger = require('../utils/logger')

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || ''
const R2_PUBLIC_BASE_URL = String(process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')
const R2_ENABLED = String(process.env.R2_ENABLED || '').toLowerCase() === 'true'

let s3Client = null

const isR2Configured = () =>
  R2_ENABLED &&
  !!R2_ACCOUNT_ID &&
  !!R2_ACCESS_KEY_ID &&
  !!R2_SECRET_ACCESS_KEY &&
  !!R2_BUCKET &&
  !!R2_PUBLIC_BASE_URL

const getS3 = () => {
  if (!isR2Configured()) return null
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  }
  return s3Client
}

/**
 * Relative key under UPLOADS_ROOT, posix slashes (e.g. documents/foo.jpg)
 */
const localPathToKey = (absolutePath) => {
  const normAbs = path.resolve(absolutePath)
  const normRoot = path.resolve(UPLOADS_ROOT)
  const prefix = normRoot.endsWith(path.sep) ? normRoot : normRoot + path.sep
  if (normAbs !== normRoot && !normAbs.startsWith(prefix)) {
    throw new Error('mediaStorage: path outside UPLOADS_ROOT')
  }
  return path.relative(normRoot, normAbs).split(path.sep).join('/')
}

const guessContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.webm': 'audio/webm',
    '.apk': 'application/vnd.android.package-archive',
  }
  return map[ext] || 'application/octet-stream'
}

/**
 * Upload a file that multer wrote under UPLOADS_ROOT to R2 (if configured), delete local copy on success.
 * @returns {Promise<string>} Absolute public https URL (R2) or `/uploads/<key>` for local disk
 */
const persistLocalUpload = async (localPath, options = {}) => {
  if (!localPath) {
    throw new Error('persistLocalUpload: no path')
  }
  if (!fs.existsSync(localPath)) {
    throw new Error('persistLocalUpload: file missing on disk')
  }

  const key = localPathToKey(localPath)
  const contentType = options.contentType || guessContentType(localPath)
  const client = getS3()

  if (!client) {
    return `/uploads/${key}`
  }

  try {
    const body = fs.createReadStream(localPath)
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )
    await fsp.unlink(localPath).catch(() => {})
    const url = `${R2_PUBLIC_BASE_URL}/${key.split('/').map((seg) => encodeURIComponent(seg)).join('/')}`
    logger.info(`[R2] uploaded key=${key}`)
    return url
  } catch (err) {
    logger.warn(`[R2] upload failed, keeping local file: ${err?.message || err}`)
    return `/uploads/${key}`
  }
}

/**
 * Delete object from R2 or local uploads (for cron / TTL cleanup). `relativePath` = key, e.g. notification-campaigns/x.png
 */
const deleteStoredMedia = async (relativePath) => {
  const rel = String(relativePath || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\\/g, '/')
  if (!rel || rel.includes('..')) return false

  const client = getS3()
  if (client) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: rel }))
      logger.info(`[R2] deleted key=${rel}`)
      return true
    } catch (err) {
      logger.warn(`[R2] delete failed key=${rel}: ${err?.message || err}`)
      return false
    }
  }

  const abs = path.resolve(path.join(UPLOADS_ROOT, rel))
  const root = path.resolve(UPLOADS_ROOT)
  if (!abs.startsWith(root + path.sep) && abs !== root) return false
  try {
    await fsp.unlink(abs)
    return true
  } catch (e) {
    if (e && e.code === 'ENOENT') return true
    logger.warn(`[mediaStorage] local unlink failed: ${abs}`, e)
    return false
  }
}

module.exports = {
  persistLocalUpload,
  deleteStoredMedia,
  isR2Configured,
  localPathToKey,
}
