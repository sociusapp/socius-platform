const { processExpiredSubscriptions } = require('../services/subscription.service')
const logger = require('../utils/logger')

const runSubscriptionCheck = async () => {
  try {
    const expiredCount = await processExpiredSubscriptions()
    logger.info(`Subscription check job completed — expired: ${expiredCount}`)
    return { expiredCount }
  } catch (err) {
    logger.error('Subscription check job failed:', err)
    throw err
  }
}

module.exports = { runSubscriptionCheck }

