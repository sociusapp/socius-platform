const crypto = require('crypto')
const OtpLog = require('../models/OtpLog')
const { OTP } = require('./constants')
const logger = require('./logger')

/**
 * 6-digit OTP generate karo
 * Note: crypto.randomInt(min, max) — max is exclusive, so use 1_000_000 to include 999999
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 1_000_000).toString()
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
const normalizeOtpInput = (inputOtp) => {
  const s = String(inputOtp ?? '').trim()
  if (!/^\d+$/.test(s) || s.length !== OTP.LENGTH) {
    return null
  }
  return s
}

const verifyOtp = async (phone, inputOtp) => {
  try {
    const code = normalizeOtpInput(inputOtp)
    if (!code) {
      logger.warn(`[OTP] Invalid format for phone ${phone}: "${inputOtp}"`)
      return { valid: false, reason: `OTP must be ${OTP.LENGTH} digits` }
    }

    const now = new Date()
    logger.info(`[OTP] Verifying for phone ${phone}, code ${code}, now ${now.toISOString()}`)

    // Debug: Find all matching OTPs
    const allOtps = await OtpLog.find({ phone }).sort({ createdAt: -1 }).limit(3)
    allOtps.forEach((o, i) => {
      logger.info(`[OTP] DB Entry ${i}: otp=${o.otp}, isUsed=${o.isUsed}, expiresAt=${o.expiresAt?.toISOString()}, attempts=${o.attempts}`)
    })

    // Single atomic success path — stops double-redemption / replay if two devices verify at once
    const consumed = await OtpLog.findOneAndUpdate(
      {
        phone,
        isUsed: false,
        expiresAt: { $gt: now },
        attempts: { $lt: OTP.MAX_ATTEMPTS },
        otp: code,
      },
      { $set: { isUsed: true, usedAt: now } },
      { new: true }
    )

    if (consumed) {
      logger.info(`[OTP] Verified successfully for ${phone}`)
      return { valid: true }
    }

    logger.warn(`[OTP] Not consumed for phone ${phone}. Checking why...`)

    const latest = await OtpLog.findOne({
      phone,
      isUsed: false,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 })

    if (!latest) {
      return { valid: false, reason: 'OTP expired or not found' }
    }

    if (latest.attempts >= OTP.MAX_ATTEMPTS) {
      return { valid: false, reason: 'Too many attempts. Please request a new OTP.' }
    }

    // Count a failed guess only if this row can still accept attempts (avoids useless increments when already locked)
    const bumped = await OtpLog.findOneAndUpdate(
      {
        _id: latest._id,
        isUsed: false,
        expiresAt: { $gt: now },
        attempts: { $lt: OTP.MAX_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      { new: true }
    )

    if (!bumped) {
      return { valid: false, reason: 'Too many attempts. Please request a new OTP.' }
    }

    return { valid: false, reason: 'Invalid OTP' }
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
  normalizeOtpInput,
}
