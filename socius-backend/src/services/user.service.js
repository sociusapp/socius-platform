const User = require('../models/User')
const Verification = require('../models/Verification')
const HelpRequest = require('../models/HelpRequest')
const HelpMatch = require('../models/HelpMatch')
const PresenceRequest = require('../models/PresenceRequest')
const PresenceMatch = require('../models/PresenceMatch')
const redis = require('../config/redis')
const logger = require('../utils/logger')

/**
 * User history fetch karo (requests + helps)
 */
const getHistory = async (userId, { page = 1, limit = 20 } = {}) => {
  // 1. My Help Requests
  const helpRequests = await HelpRequest.find({ requesterId: userId })
    .select('category description status createdAt location')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  // Find matches for my help requests to identify helpers
  const helpRequestIds = helpRequests.map(req => req._id)
  const helpMatchesForMyRequests = await HelpMatch.find({
    requestId: { $in: helpRequestIds },
    status: { $in: ['accepted', 'completed', 'matched', 'active'] }
  })
    .populate('helperId', 'fullName profileImage')
    .lean()

  const helpMatchesMap = {}
  helpMatchesForMyRequests.forEach(match => {
    helpMatchesMap[match.requestId.toString()] = match.helperId
  })

  // 2. Help I Provided
  const helpProvided = await HelpMatch.find({
    helperId: userId,
    status: { $in: ['accepted', 'completed'] }
  })
    .populate({
      path: 'requestId',
      select: 'category description status createdAt location requesterId',
      populate: {
        path: 'requesterId',
        select: 'fullName profileImage'
      }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  // 3. My Presence Requests
  const presenceRequests = await PresenceRequest.find({ requesterId: userId })
    .select('situationType description status createdAt location')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  // Find matches for my presence requests
  const presenceRequestIds = presenceRequests.map(req => req._id)
  const presenceMatchesForMyRequests = await PresenceMatch.find({
    presenceRequestId: { $in: presenceRequestIds },
    status: { $in: ['accepted', 'arrived', 'en_route', 'closed'] }
  })
    .populate('helperId', 'fullName profileImage')
    .lean()

  const presenceMatchesMap = {}
  presenceMatchesForMyRequests.forEach(match => {
    presenceMatchesMap[match.presenceRequestId.toString()] = match.helperId
  })

  // 4. Presence I Provided
  const presenceProvided = await PresenceMatch.find({
    helperId: userId,
    status: { $in: ['accepted', 'en_route', 'arrived', 'closed'] }
  })
    .populate({
      path: 'presenceRequestId',
      select: 'situationType description status createdAt location requesterId',
      populate: {
        path: 'requesterId',
        select: 'fullName profileImage'
      }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  // Normalize and Merge
  const history = []

  helpRequests.forEach(req => {
    history.push({
      _id: req._id,
      type: 'help_request',
      title: req.category ? req.category.replace(/_/g, ' ') : 'Help Request',
      description: req.description,
      status: req.status,
      createdAt: req.createdAt,
      isMyRequest: true,
      otherUser: helpMatchesMap[req._id.toString()] || null, // Helper if matched
      data: req
    })
  })

  helpProvided.forEach(match => {
    if (match.requestId) {
      history.push({
        _id: match.requestId._id,
        type: 'help_provided',
        title: match.requestId.category ? match.requestId.category.replace(/_/g, ' ') : 'Help Provided',
        description: match.requestId.description,
        status: match.requestId.status, // or match.status
        createdAt: match.createdAt, // match time
        isMyRequest: false,
        otherUser: match.requestId.requesterId, // The person I helped
        data: match.requestId
      })
    }
  })

  presenceRequests.forEach(req => {
    history.push({
      _id: req._id,
      type: 'presence_request',
      title: req.situationType ? req.situationType.replace(/_/g, ' ') : 'Presence Request',
      description: req.description,
      status: req.status,
      createdAt: req.createdAt,
      isMyRequest: true,
      otherUser: presenceMatchesMap[req._id.toString()] || null, // Helper if matched
      data: req
    })
  })

  presenceProvided.forEach(match => {
    if (match.presenceRequestId) {
      history.push({
        _id: match.presenceRequestId._id,
        type: 'presence_provided',
        title: match.presenceRequestId.situationType ? match.presenceRequestId.situationType.replace(/_/g, ' ') : 'Presence Provided',
        description: match.presenceRequestId.description,
        status: match.presenceRequestId.status,
        createdAt: match.createdAt,
        isMyRequest: false,
        otherUser: match.presenceRequestId.requesterId, // The person I helped
        data: match.presenceRequestId
      })
    }
  })

  // Sort by createdAt desc
  history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // Pagination slice
  const start = (page - 1) * limit
  return history.slice(start, start + limit)
}

/**
 * User profile get karo
 */
const getProfile = async (userId) => {
  const user = await User.findById(userId).select('-__v -adminNotes').lean()
  if (!user || user.isDeleted) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }
  return user
}

/**
 * Profile update karo
 */
const updateProfile = async (userId, updates) => {
  const allowed = [
    'fullName', 'age', 'gender', 'cityArea',
    'role', 'notificationPreferences', 'openTo',
    'associations', 'isProfileVisible',
  ]

  const filtered = {}
  allowed.forEach((key) => {
    if (updates[key] !== undefined) filtered[key] = updates[key]
  })

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: filtered },
    { new: true, runValidators: true }
  ).select('-__v -adminNotes')

  try {
    await redis.del(`user:profile:${userId}`)
  } catch (e) { }

  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  // Clear caches
  await redis.del(`user:profile:${userId}`)
  await redis.del(`user:home:${userId}`)

  return user
}

/**
 * First time flag update karo
 */
const markFirstTimeFlag = async (userId, flag) => {
  const validFlags = [
    'hasSeenAvailabilityGuide',
    'hasSeenUserGuide',
    'hasGivenLocationPermission',
  ]

  if (!validFlags.includes(flag)) {
    const err = new Error('Invalid flag')
    err.statusCode = 400
    throw err
  }

  await User.findByIdAndUpdate(userId, { $set: { [flag]: true } })

  // Clear home cache
  await redis.del(`user:home:${userId}`)
  await redis.del(`user:profile:${userId}`)

  return { message: `${flag} marked` }
}

/**
 * Account delete karo (soft delete)
 */
const deleteAccount = async (userId) => {
  const user = await User.findById(userId)
  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  user.isDeleted = true
  user.deletedAt = new Date()
  user.isAvailable = false
  user.phone = `deleted_${user.phone}_${Date.now()}` // phone free karo
  await user.save()

  // Clear caches
  await redis.del(`user:profile:${userId}`)
  await redis.del(`user:home:${userId}`)

  logger.info(`Account deleted: ${userId}`)
  return { message: 'Account deleted successfully' }
}

/**
 * Home screen data — account status + verification check
 */
const getHomeData = async (userId) => {
  const cacheKey = `user:home:${userId}`
  const cached = await redis.get(cacheKey)
  if (cached) return cached

  const user = await User.findById(userId).select(
    'fullName accountStatus isAvailable isIdentityVerified hasSeenAvailabilityGuide hasSeenUserGuide hasGivenLocationPermission role'
  )

  const verification = await Verification.findOne({ userId }).select(
    'status failureReasons adminNote'
  )

  const data = {
    user,
    verificationStatus: verification?.status || 'not_submitted',
    verificationFailureReasons: verification?.failureReasons || [],
    verificationAdminNote: verification?.adminNote || null,
  }

  await redis.setEx(cacheKey, 3600, data)
  return data
}

module.exports = {
  getProfile,
  updateProfile,
  markFirstTimeFlag,
  deleteAccount,
  getHomeData,
  getHistory,
}




