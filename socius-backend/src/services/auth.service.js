const User = require('../models/User')
const DeviceToken = require('../models/DeviceToken')
const CommunityBalance = require('../models/CommunityBalance')
const { saveOtp, verifyOtp, canResendOtp } = require('../utils/otp')
const { generateTokens } = require('../utils/jwt')
const logger = require('../utils/logger')

const sendOtp = async ({ phone, ipAddress }) => {
  const resendCheck = await canResendOtp(phone)
  if (!resendCheck.allowed) {
    const err = new Error(`Please wait ${resendCheck.waitSeconds} seconds before resending`)
    err.statusCode = 429
    throw err
  }

  const otp = await saveOtp(phone, ipAddress)

  // TODO: Real SMS gateway (Twilio / MSG91) — send `otp` here; do not return otp in JSON.
  logger.info(`OTP sent (6-digit) for ${phone}`)

  const payload = { message: 'OTP sent successfully' }
  // TEMPORARY (all environments, inc. live production): same OTP as saved in OtpLog — app pre-fills until SMS ships.
  // REMOVE `payload.otp` before Play Store / public hardening — never expose OTP in API in final production.
  payload.otp = otp
  if (process.env.NODE_ENV === 'production') {
    logger.warn('[auth] TEMP: OTP returned in send-otp body — strip before final Play Store release')
  }
  return payload
}

const verifyOtpAndLogin = async ({
  phone,
  otp,
  deviceToken,
  platform,
  deviceId,
  deviceModel,
  appVersion,
}) => {
  const result = await verifyOtp(phone, otp)

  if (!result.valid) {
    const err = new Error(result.reason)
    err.statusCode = 400
    throw err
  }

  // User dhundho ya naya banao
  let user = await User.findOne({ phone, isDeleted: false })
  let isNewUser = false

  if (!user) {
    user = await User.create({
      phone,
      isPhoneVerified: true,
    })

    // Community balance entry bhi banao
    await CommunityBalance.create({ userId: user._id })

    isNewUser = true
    logger.info(`New user created: ${user._id}`)
  } else {
    user.isPhoneVerified = true
    await user.save()
  }

  // Device token save karo (FCM ke liye)
  if (deviceToken && platform) {
    await saveDeviceToken(user._id, deviceToken, platform, {
      deviceId,
      deviceModel,
      appVersion,
    })
  }

  const tokens = generateTokens(user)

  return {
    isNewUser,
    user: sanitizeUser(user),
    ...tokens,
  }
}

const adminPasswordLogin = async ({ email, password }) => {
  const adminEmail = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.replace(/^"(.*)"$/, '$1') : null
  const adminPassword = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.replace(/^"(.*)"$/, '$1') : null
  const adminPhone = process.env.ADMIN_PHONE ? process.env.ADMIN_PHONE.replace(/^"(.*)"$/, '$1') : null

  if (!adminEmail || !adminPassword || !adminPhone) {
    const err = new Error('Admin credentials not configured')
    err.statusCode = 500
    throw err
  }

  if (email.trim() !== adminEmail.trim() || password !== adminPassword) {
    const err = new Error('Invalid admin email or password')
    err.statusCode = 401
    throw err
  }

  let user = await User.findOne({ phone: adminPhone, isDeleted: false })

  if (!user) {
    user = await User.create({
      phone: adminPhone,
      countryCode: '+91',
      email: adminEmail,
      fullName: 'Admin',
      isPhoneVerified: true,
      isIdentityVerified: true,
      accountStatus: 'active',
      isAdmin: true,
    })

    await CommunityBalance.create({ userId: user._id })
    logger.info(`Admin user created from env phone: ${user._id}`)
  } else {
    let updated = false
    if (!user.email) {
      user.email = adminEmail
      updated = true
    }
    if (!user.fullName) {
      user.fullName = 'Admin'
      updated = true
    }
    if (!user.isAdmin) {
      user.isAdmin = true
      updated = true
    }
    if (user.accountStatus !== 'active') {
      user.accountStatus = 'active'
      updated = true
    }
    if (!user.isPhoneVerified) {
      user.isPhoneVerified = true
      updated = true
    }
    if (updated) {
      await user.save()
    }
  }

  const tokens = generateTokens(user)

  return {
    user: sanitizeUser(user),
    ...tokens,
  }
}

const developerPasswordLogin = async ({ email, password }) => {
  const developerEmail = process.env.DEVELOPER_EMAIL ? process.env.DEVELOPER_EMAIL.replace(/^"(.*)"$/, '$1') : null
  const developerPassword = process.env.DEVELOPER_PASSWORD ? process.env.DEVELOPER_PASSWORD.replace(/^"(.*)"$/, '$1') : null
  const developerPhone = process.env.DEVELOPER_PHONE ? process.env.DEVELOPER_PHONE.replace(/^"(.*)"$/, '$1') : null

  if (!developerEmail || !developerPassword || !developerPhone) {
    const err = new Error('Developer credentials not configured')
    err.statusCode = 500
    throw err
  }

  if (email.trim() !== developerEmail.trim() || password !== developerPassword) {
    const err = new Error('Invalid developer email or password')
    err.statusCode = 401
    throw err
  }

  let user = await User.findOne({ phone: developerPhone, isDeleted: false })

  if (!user) {
    user = await User.create({
      phone: developerPhone,
      countryCode: '+91',
      email: developerEmail,
      fullName: 'Developer',
      isPhoneVerified: true,
      isIdentityVerified: true,
      accountStatus: 'active',
      isDeveloper: true,
    })

    await CommunityBalance.create({ userId: user._id })
    logger.info(`Developer user created from env phone: ${user._id}`)
  } else {
    let updated = false
    if (!user.email) {
      user.email = developerEmail
      updated = true
    }
    if (!user.fullName) {
      user.fullName = 'Developer'
      updated = true
    }
    if (!user.isDeveloper) {
      user.isDeveloper = true
      updated = true
    }
    if (user.accountStatus !== 'active') {
      user.accountStatus = 'active'
      updated = true
    }
    if (!user.isPhoneVerified) {
      user.isPhoneVerified = true
      updated = true
    }
    if (updated) {
      await user.save()
    }
  }

  const tokens = generateTokens(user)

  return {
    user: sanitizeUser(user),
    ...tokens,
  }
}

const saveDeviceToken = async (userId, token, platform, meta = {}) => {
  try {
    const update = {
      userId,
      token,
      platform,
      isActive: true,
      lastUsedAt: new Date(),
      invalidatedAt: null,
    }

    if (meta.deviceId) update.deviceId = meta.deviceId
    if (meta.deviceModel) update.deviceModel = meta.deviceModel
    if (meta.appVersion) update.appVersion = meta.appVersion

    await DeviceToken.findOneAndUpdate(
      { token },
      update,
      { upsert: true, new: true }
    )
  } catch (err) {
    logger.error('saveDeviceToken error:', err)
  }
}

const logout = async ({ userId, deviceToken }) => {
  if (deviceToken) {
    await DeviceToken.findOneAndUpdate(
      { token: deviceToken, userId },
      { isActive: false, invalidatedAt: new Date() }
    )
  }
  logger.info(`User logged out: ${userId}`)
  return { message: 'Logged out successfully' }
}

const sanitizeUser = (user) => {
  const obj = user.toObject()
  delete obj.__v
  delete obj.adminNotes
  return obj
}

const hasActiveDeviceToken = async (userId) => {
  const count = await DeviceToken.countDocuments({ userId, isActive: true })
  return { hasActiveToken: count > 0 }
}

const updateDeviceTokenForUser = async ({
  userId,
  deviceToken,
  platform,
  deviceId,
  deviceModel,
  appVersion,
}) => {
  if (deviceToken && platform) {
    await saveDeviceToken(userId, deviceToken, platform, {
      deviceId,
      deviceModel,
      appVersion,
    })
  }
  const hasActiveToken = !!deviceToken && !!platform
  return { hasActiveToken }
}

module.exports = {
  sendOtp,
  verifyOtpAndLogin,
  saveDeviceToken,
  adminPasswordLogin,
  developerPasswordLogin,
  logout,
  hasActiveDeviceToken,
  updateDeviceTokenForUser,
}
