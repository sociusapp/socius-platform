const userService = require('../services/user.service')
const { success, created } = require('../utils/response')

const getProfile = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user._id)
    return success(res, user)
  } catch (err) {
    next(err)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user._id, req.body)
    return success(res, user, 'Profile updated')
  } catch (err) {
    next(err)
  }
}

const getHomeData = async (req, res, next) => {
  try {
    const data = await userService.getHomeData(req.user._id)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

const markFirstTimeFlag = async (req, res, next) => {
  try {
    const { flag } = req.params
    const result = await userService.markFirstTimeFlag(req.user._id, flag)
    return success(res, result)
  } catch (err) {
    next(err)
  }
}

const deleteAccount = async (req, res, next) => {
  try {
    const result = await userService.deleteAccount(req.user._id)
    return success(res, result, 'Account deleted')
  } catch (err) {
    next(err)
  }
}

const getHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query
    const history = await userService.getHistory(req.user._id, { page, limit })
    return success(res, history)
  } catch (err) {
    next(err)
  }
}

module.exports = { getProfile, updateProfile, getHomeData, markFirstTimeFlag, deleteAccount, getHistory }
