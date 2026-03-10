const badgeService = require('../services/badge.service')
const { success } = require('../utils/response')

const getMyBadges = async (req, res, next) => {
  try {
    const badges = await badgeService.getUserBadges(req.user._id)
    return success(res, badges)
  } catch (err) {
    next(err)
  }
}

const getUserBadges = async (req, res, next) => {
  try {
    const badges = await badgeService.getUserBadges(req.params.userId)
    return success(res, badges)
  } catch (err) {
    next(err)
  }
}

module.exports = { getMyBadges, getUserBadges }
