const {
  autoCloseInactiveHelpRequests,
  autoCloseInactivePresenceRequests,
} = require('../services/closure.service')
const logger = require('../utils/logger')

const runAutoCloseJobs = async () => {
  try {
    const helpClosed = await autoCloseInactiveHelpRequests()
    const presenceClosed = await autoCloseInactivePresenceRequests()

    logger.info(
      `Auto close job completed — help: ${helpClosed}, presence: ${presenceClosed}`
    )

    return { helpClosed, presenceClosed }
  } catch (err) {
    logger.error('Auto close job failed:', err)
    throw err
  }
}

module.exports = { runAutoCloseJobs }