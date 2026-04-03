const authService = require('../services/auth.service')
const { success, badRequest } = require('../utils/response')
const logger = require('../utils/logger')

const sendOtp = async (req, res, next) => {
  try {
    const { phone, countryCode } = req.body
    const result = await authService.sendOtp({ phone, ipAddress: req.ip })
    return success(res, result, 'OTP sent successfully')
  } catch (err) {
    next(err)
  }
}

const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp, deviceToken, platform, deviceId, deviceModel, appVersion } = req.body
    const result = await authService.verifyOtpAndLogin({
      phone,
      otp,
      deviceToken,
      platform,
      deviceId,
      deviceModel,
      appVersion,
    })
    return success(res, result, result.isNewUser ? 'Account created' : 'Login successful')
  } catch (err) {
    next(err)
  }
}

const adminPasswordLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await authService.adminPasswordLogin({ email, password })

    await logger.info(`Admin logged in: ${email}`, {
      method: 'POST',
      url: '/api/auth/admin-login',
      userId: result.user._id
    })

    return success(res, result, 'Admin login successful')
  } catch (err) {
    next(err)
  }
}

const developerPasswordLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await authService.developerPasswordLogin({ email, password })

    await logger.info(`Developer logged in: ${email}`, {
      method: 'POST',
      url: '/api/auth/developer-login',
      userId: result.user._id
    })

    return success(res, result, 'Developer login successful')
  } catch (err) {
    next(err)
  }
}

const logout = async (req, res, next) => {
  try {
    const { deviceToken } = req.body
    const result = await authService.logout({ userId: req.user._id, deviceToken })
    return success(res, result, 'Logged out successfully')
  } catch (err) {
    next(err)
  }
}

const getDeviceTokenStatus = async (req, res, next) => {
  try {
    const result = await authService.hasActiveDeviceToken(req.user._id)
    return success(res, result)
  } catch (err) {
    next(err)
  }
}

const updateDeviceToken = async (req, res, next) => {
  try {
    const { deviceToken, platform, deviceId, deviceModel, appVersion } = req.body
    const result = await authService.updateDeviceTokenForUser({
      userId: req.user._id,
      deviceToken,
      platform,
      deviceId,
      deviceModel,
      appVersion,
    })
    return success(res, result, 'Device token updated')
  } catch (err) {
    next(err)
  }
}

module.exports = { sendOtp, verifyOtp, logout, adminPasswordLogin, developerPasswordLogin, getDeviceTokenStatus, updateDeviceToken }
