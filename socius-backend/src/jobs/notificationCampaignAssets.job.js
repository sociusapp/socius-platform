const path = require('path')
const NotificationCampaignAsset = require('../models/NotificationCampaignAsset')
const { UPLOADS_ROOT } = require('../config/uploads')
const { deleteStoredMedia } = require('../services/mediaStorage.service')
const logger = require('../utils/logger')

/**
 * Deletes expired admin broadcast images (filesystem + DB row).
 * TTL is set per-upload; cron should run at least daily.
 */
const cleanupExpiredNotificationCampaignAssets = async () => {
  const now = new Date()
  const docs = await NotificationCampaignAsset.find({
    expiresAt: { $lte: now },
  }).lean()

  let removedFiles = 0
  let missingFiles = 0

  const root = path.resolve(UPLOADS_ROOT)

  for (const doc of docs) {
    const rel = String(doc.relativePath || '').trim().replace(/^\/+/, '')
    if (!rel || rel.includes('..')) {
      logger.warn(`[NotificationCampaignAssets] invalid relativePath, dropping row: ${rel}`)
      await NotificationCampaignAsset.deleteOne({ _id: doc._id })
      continue
    }
    const abs = path.resolve(path.join(UPLOADS_ROOT, rel))
    if (!abs.startsWith(root + path.sep)) {
      logger.warn(`[NotificationCampaignAssets] skip path outside uploads: ${rel}`)
      await NotificationCampaignAsset.deleteOne({ _id: doc._id })
      continue
    }
    try {
      const ok = await deleteStoredMedia(rel)
      if (ok) removedFiles += 1
      else missingFiles += 1
    } catch (e) {
      logger.warn(`[NotificationCampaignAssets] delete failed: ${rel}`, e)
    }
    await NotificationCampaignAsset.deleteOne({ _id: doc._id })
  }

  if (docs.length) {
    logger.info(
      `[NotificationCampaignAssets] cleaned ${docs.length} record(s), files removed: ${removedFiles}, missing: ${missingFiles}`
    )
  }

  return { records: docs.length, removedFiles, missingFiles }
}

module.exports = { cleanupExpiredNotificationCampaignAssets }
