const HelpRequest = require('../models/HelpRequest')
const { HELP_REQUEST_STATUS } = require('../utils/constants')
const { sendRequestExpiringWarningNotification } = require('../services/notification.service')
const logger = require('../utils/logger')

/**
 * Warn requesters while request is still unmatched (open/matching) before auto-close.
 * Runs every few minutes; dedupe keys prevent duplicate pushes per phase.
 */
const runHelpRequestExpiryWarnings = async () => {
  const now = Date.now()
  const requests = await HelpRequest.find({
    status: { $in: [HELP_REQUEST_STATUS.OPEN, HELP_REQUEST_STATUS.MATCHING] },
    autoCloseScheduledAt: { $gt: new Date(now) },
  }).select('_id requesterId autoCloseScheduledAt')

  let count = 0
  for (const r of requests) {
    const exp = new Date(r.autoCloseScheduledAt).getTime()
    const remainingMs = exp - now
    if (remainingMs <= 0) continue

    if (remainingMs <= 5 * 60 * 1000) {
      // eslint-disable-next-line no-await-in-loop
      await sendRequestExpiringWarningNotification(String(r.requesterId), {
        requestId: r._id,
        phase: 't5',
        expiresAt: new Date(exp).toISOString(),
      })
      count++
    } else if (remainingMs <= 15 * 60 * 1000) {
      // eslint-disable-next-line no-await-in-loop
      await sendRequestExpiringWarningNotification(String(r.requesterId), {
        requestId: r._id,
        phase: 't15',
        expiresAt: new Date(exp).toISOString(),
      })
      count++
    }
  }

  if (count) logger.info(`[ExpiryWarnings] notifications attempted: ${count}`)
  return count
}

module.exports = { runHelpRequestExpiryWarnings }
