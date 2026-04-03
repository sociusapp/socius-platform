const userService = require('../services/user.service')
const { success, created } = require('../utils/response')
const { findNearbyAvailableUsers, calculateDistance } = require('../utils/geoQuery')
const { GEO } = require('../utils/constants')
const Verification = require('../models/Verification')
const User = require('../models/User')

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

const getNearbyUsers = async (req, res, next) => {
  try {
    const lng = Number(req.query.longitude ?? req.query.lng)
    const lat = Number(req.query.latitude ?? req.query.lat)
    const radiusMetersRaw = Number(req.query.radiusMeters ?? req.query.radius ?? GEO.DEFAULT_RADIUS_METERS)
    const radiusMeters = Number.isFinite(radiusMetersRaw) ? Math.min(Math.max(radiusMetersRaw, 50), 20000) : GEO.DEFAULT_RADIUS_METERS

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return success(res, { radiusMeters, users: [] })
    }

    const users = await findNearbyAvailableUsers({
      lng,
      lat,
      radiusMeters,
      excludeIds: [req.user._id],
      limit: 250,
      requireAvailability: false,
    })

    const userIds = (users || []).map((u) => u?._id).filter(Boolean)
    const verifications = await Verification.find({
      userId: { $in: userIds },
      status: 'approved',
    })
      .select('userId status selfie')
      .lean()

    const verificationMap = new Map()
    verifications.forEach((v) => {
      verificationMap.set(String(v.userId), { status: v.status, selfie: v.selfie })
    })

    const points = (users || [])
      .map((u) => {
        const coords = u?.location?.coordinates
        if (!Array.isArray(coords) || coords.length < 2) return null
        const userLng = Number(coords[0])
        const userLat = Number(coords[1])
        if (!Number.isFinite(userLng) || !Number.isFinite(userLat)) return null
        const distanceMeters = calculateDistance(lng, lat, userLng, userLat)
        const verification = verificationMap.get(String(u._id)) || null
        return {
          id: u._id,
          fullName: u.fullName || null,
          profileImage: u.profileImage || null,
          verification,
          latitude: userLat,
          longitude: userLng,
          isAvailable: !!u.isAvailable,
          distanceMeters,
        }
      })
      .filter(Boolean)

    return success(res, { radiusMeters, users: points })
  } catch (err) {
    next(err)
  }
}

const getPublicUser = async (req, res, next) => {
  try {
    const id = String(req.params.id || '')
    if (!id) return success(res, null)

    const user = await User.findById(id)
      .select('fullName profileImage isAvailable accountStatus role isIdentityVerified isPhoneVerified')
      .lean()

    if (!user || !['active', 'pending_review'].includes(user.accountStatus)) {
      return success(res, null)
    }

    const verification = await Verification.findOne({ userId: user._id, status: 'approved' })
      .select('status selfie')
      .lean()

    return success(res, {
      id: user._id,
      fullName: user.fullName || null,
      profileImage: user.profileImage || null,
      isAvailable: !!user.isAvailable,
      role: user.role || null,
      isIdentityVerified: !!user.isIdentityVerified,
      verification: verification ? { status: verification.status, selfie: verification.selfie } : null,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getProfile, updateProfile, getHomeData, markFirstTimeFlag, deleteAccount, getHistory, getNearbyUsers, getPublicUser }
