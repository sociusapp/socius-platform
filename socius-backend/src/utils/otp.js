const crypto = require('crypto')
const OtpLog = require('../models/OtpLog')
const { OTP } = require('./constants')
const logger = require('./logger')

/**
 * 6-digit OTP generate karo
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString()
}

/**
 * OTP save karo DB me (purane invalidate kar ke)
 */
const saveOtp = async (phone, ipAddress = null) => {
  try {
    // Purane unused OTPs expire karo us phone ke liye
    await OtpLog.updateMany(
      { phone, isUsed: false },
      { $set: { isUsed: true, usedAt: new Date() } }
    )

    const otp = generateOtp()
    const expiresAt = new Date(Date.now() + OTP.EXPIRY_MINUTES * 60 * 1000)

    const otpLog = await OtpLog.create({
      phone,
      otp,
      expiresAt,
      ipAddress,
    })

    logger.info(`OTP generated for ${phone}`)
    return otp
  } catch (err) {
    logger.error('saveOtp error:', err)
    throw err
  }
}

/**
 * OTP verify karo
 * Returns: { valid: true } ya { valid: false, reason: '...' }
 */
const verifyOtp = async (phone, inputOtp) => {
  try {
    const otpLog = await OtpLog.findOne({
      phone,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 })

    if (!otpLog) {
      return { valid: false, reason: 'OTP expired or not found' }
    }

    // Max attempts check
    if (otpLog.attempts >= OTP.MAX_ATTEMPTS) {
      return { valid: false, reason: 'Too many attempts. Please request a new OTP.' }
    }

    if (otpLog.otp !== inputOtp) {
      // Wrong attempt — increment
      await OtpLog.findByIdAndUpdate(otpLog._id, { $inc: { attempts: 1 } })
      return { valid: false, reason: 'Invalid OTP' }
    }

    // ✅ Correct — mark as used
    await OtpLog.findByIdAndUpdate(otpLog._id, {
      isUsed: true,
      usedAt: new Date(),
    })

    logger.info(`OTP verified for ${phone}`)
    return { valid: true }
  } catch (err) {
    logger.error('verifyOtp error:', err)
    throw err
  }
}

/**
 * Check karo resend allowed hai ya nahi (30 sec cooldown)
 */
const canResendOtp = async (phone) => {
  const lastOtp = await OtpLog.findOne({ phone }).sort({ createdAt: -1 })

  if (!lastOtp) return { allowed: true }

  const secondsSinceLast = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000

  if (secondsSinceLast < OTP.RESEND_AFTER_SECONDS) {
    const waitSeconds = Math.ceil(OTP.RESEND_AFTER_SECONDS - secondsSinceLast)
    return { allowed: false, waitSeconds }
  }

  return { allowed: true }
}

module.exports = {
  generateOtp,
  saveOtp,
  verifyOtp,
  canResendOtp,
}
