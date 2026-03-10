const CommunityBalance = require('../models/CommunityBalance')
const { COMMUNITY_BALANCE } = require('../utils/constants')
const logger = require('../utils/logger')

/**
 * Balance update karo
 * @param {string} userId
 * @param {'request_sent'|'help_given'|'presence_given'} action
 */
const updateCommunityBalance = async (userId, action) => {
  try {
    const updates = { $set: {} }

    if (action === 'request_sent') {
      updates.$inc = { helpRequestsSent: 1 }
      updates.$set.lastRequestAt = new Date()
    } else if (action === 'help_given') {
      updates.$inc = { helpGiven: 1 }
      updates.$set.lastHelpGivenAt = new Date()
    } else if (action === 'presence_given') {
      updates.$inc = { presenceGiven: 1 }
      updates.$set.lastHelpGivenAt = new Date()
    }

    await CommunityBalance.findOneAndUpdate({ userId }, updates, {
      upsert: true,
      new: true,
    })
  } catch (err) {
    logger.error('updateCommunityBalance error:', err)
  }
}

/**
 * Check karo — nudge dikhana chahiye?
 * Sirf agar user zyada request kar raha hai help diye bina
 */
const shouldShowNudge = async (userId) => {
  const balance = await CommunityBalance.findOne({ userId })
  if (!balance) return false

  const diff = balance.helpRequestsSent - balance.helpGiven

  if (diff < COMMUNITY_BALANCE.NUDGE_THRESHOLD) return false

  // Cooldown check
  if (balance.lastNudgeShownAt) {
    const daysSince =
      (Date.now() - new Date(balance.lastNudgeShownAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < COMMUNITY_BALANCE.NUDGE_COOLDOWN_DAYS) return false
  }

  return true
}

/**
 * Nudge dikhaya — record karo
 */
const recordNudgeShown = async (userId) => {
  await CommunityBalance.findOneAndUpdate(
    { userId },
    {
      $inc: { nudgeShownCount: 1 },
      $set: { lastNudgeShownAt: new Date() },
    }
  )
}

/**
 * Balance get karo
 */
const getBalance = async (userId) => {
  return CommunityBalance.findOne({ userId })
}

module.exports = {
  updateCommunityBalance,
  shouldShowNudge,
  recordNudgeShown,
  getBalance,
}
