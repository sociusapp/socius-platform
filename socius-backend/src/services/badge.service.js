const Badge = require('../models/Badge')
const HelpMatch = require('../models/HelpMatch')
const { BADGE_TYPE } = require('../utils/constants')
const logger = require('../utils/logger')

/**
 * User ke badges get karo
 */
const getUserBadges = async (userId) => {
  return Badge.find({ userId, isActive: true }).select('-__v')
}

/**
 * Badge already hai check karo
 */
const hasBadge = async (userId, type) => {
  const badge = await Badge.findOne({ userId, type, isActive: true })
  return !!badge
}

/**
 * Badge award karo
 */
const awardBadge = async (userId, type, awardedBy = 'system', adminId = null) => {
  const existing = await hasBadge(userId, type)
  if (existing) return null // already hai

  const badge = await Badge.create({
    userId,
    type,
    awardedBy,
    awardedByAdminId: adminId,
    earnedAt: new Date(),
  })

  logger.info(`Badge awarded: ${type} to ${userId}`)
  return badge
}

/**
 * Admin badge award karo
 */
const adminAwardBadge = async (userId, type, adminId) => {
  return awardBadge(userId, type, 'admin', adminId)
}

/**
 * Admin badge revoke karo
 */
const revokeBadge = async (userId, type, reason = null) => {
  await Badge.findOneAndUpdate(
    { userId, type, isActive: true },
    { isActive: false, revokedAt: new Date(), revokedReason: reason }
  )
}

/**
 * Closure ke baad automatically badge check karo
 * System behavior pe based
 */
const awardBadgeIfEarned = async (helperId, { wasResolved, accountability }) => {
  try {
    // "Closes Properly" badge — properly close kiya
    if (wasResolved && accountability === 'arrived_completed') {
      const closedCount = await HelpMatch.countDocuments({
        helperId,
        'helperClosure.wasResolved': true,
        'helperClosure.accountability': 'arrived_completed',
      })

      // 3 baar properly close kiya toh badge
      if (closedCount >= 3) {
        await awardBadge(helperId, BADGE_TYPE.CLOSES_PROPERLY)
      }
    }

    // "Also Helps Others" badge — multiple help diye
    const helpCount = await HelpMatch.countDocuments({
      helperId,
      status: 'completed',
    })

    if (helpCount >= 5) {
      await awardBadge(helperId, BADGE_TYPE.ALSO_HELPS_OTHERS)
    }
  } catch (err) {
    logger.error('awardBadgeIfEarned error:', err)
  }
}

module.exports = {
  getUserBadges,
  hasBadge,
  awardBadge,
  adminAwardBadge,
  revokeBadge,
  awardBadgeIfEarned,
}
