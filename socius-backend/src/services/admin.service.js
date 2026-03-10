const User = require('../models/User')
const Verification = require('../models/Verification')
const Report = require('../models/Report')
const HelpRequest = require('../models/HelpRequest')
const PresenceRequest = require('../models/PresenceRequest')
const CommunityBalance = require('../models/CommunityBalance')
const {
  REPORT_STATUS,
  REPORT_ACTION,
  HELP_REQUEST_STATUS,
  PRESENCE_STATUS,
} = require('../utils/constants')

const getPendingVerifications = async ({ page = 1, limit = 20, status, rangeDays } = {}) => {
  const skip = (Number(page) - 1) * Number(limit)

  let statusFilter = ['pending', 'review_requested', 'approved', 'failed']
  if (status) {
    const s = String(status).toLowerCase()
    if (s === 'pending') {
      statusFilter = ['pending', 'review_requested']
    } else if (s === 'approved' || s === 'verified') {
      statusFilter = ['approved']
    } else if (s === 'failed' || s === 'rejected') {
      statusFilter = ['failed']
    }
  }

  const since = rangeDays ? new Date(Date.now() - Number(rangeDays) * 24 * 60 * 60 * 1000) : null
  const vQuery = { status: { $in: statusFilter } }
  if (since) {
    vQuery.$or = [{ submittedAt: { $gte: since } }, { createdAt: { $gte: since } }]
  }

  const verifications = await Verification.find(vQuery)
    .sort({ createdAt: 1 })
    .populate('userId', 'fullName phone accountStatus isIdentityVerified role isAvailable createdAt')
    .lean()

  let combined = verifications

  const includeNotSubmitted =
    !status || String(status).toLowerCase() === 'pending'

  if (includeNotSubmitted) {
    const verificationUserIds = new Set(
      verifications.map((v) => String(v.userId?._id || v.userId))
    )

    const pendingUsers = await User.find({
      isDeleted: false,
      isAdmin: { $ne: true },
      accountStatus: 'pending_review',
      _id: { $nin: Array.from(verificationUserIds) },
    })
      .select('fullName phone accountStatus isIdentityVerified role isAvailable createdAt')
      .lean()

    const mappedPending = pendingUsers.map((user) => ({
      userId: user,
      status: 'not_submitted',
      governmentId: null,
      selfie: null,
      submittedAt: null,
      createdAt: user.createdAt,
      reviewedBy: null,
      reviewedAt: null,
      adminNote: null,
      failureReasons: [],
      retryCount: 0,
      reviewHistory: [],
    }))

    combined = [...verifications, ...mappedPending]
  }

  const total = combined.length
  const items = combined.slice(skip, skip + Number(limit))

  return { items, total, page: Number(page), limit: Number(limit) }
}

const getVerificationDetails = async (id) => {
  let user = await User.findOne({
    _id: id,
    isDeleted: false,
  }).select('fullName phone accountStatus isIdentityVerified role isAvailable createdAt isAdmin')

  let verification

  if (user) {
    verification = await Verification.findOne({ userId: user._id })
      .populate('reviewedBy', 'fullName email')
      .populate('reviewHistory.reviewedBy', 'fullName email')
  } else {
    verification = await Verification.findById(id)
      .populate('userId', 'fullName phone accountStatus isIdentityVerified role isAvailable createdAt')
      .populate('reviewedBy', 'fullName email')
      .populate('reviewHistory.reviewedBy', 'fullName email')

    if (verification && verification.userId) {
      user = verification.userId
    }
  }

  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  if (!verification) {
    return {
      userId: user,
      status: 'not_submitted',
      governmentId: null,
      selfie: null,
      submittedAt: null,
      createdAt: user.createdAt,
      reviewedBy: null,
      reviewedAt: null,
      adminNote: null,
      failureReasons: [],
      retryCount: 0,
      reviewHistory: [],
    }
  }

  const v = verification.toObject()
  v.userId = user
  return v
}

const getUsers = async ({ page = 1, limit = 20, search, accountStatus, verification } = {}) => {
  const skip = (Number(page) - 1) * Number(limit)

  const query = { isDeleted: false, isAdmin: { $ne: true } }
  if (search) {
    query.$or = [
      { fullName: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ]
  }
  if (accountStatus) {
    const s = String(accountStatus).toLowerCase()
    if (['active', 'limited', 'suspended', 'pending_review'].includes(s)) {
      query.accountStatus = s
    }
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('fullName phone accountStatus isIdentityVerified role isAvailable createdAt')
      .lean(),
    User.countDocuments(query),
  ])

  const userIds = users.map((u) => u._id)
  const verifications = await Verification.find({ userId: { $in: userIds } })
    .select('userId status')
    .lean()
  const vmap = new Map(verifications.map((v) => [String(v.userId), v.status || 'not_submitted']))

  let items = users.map((u) => ({
    ...u,
    verificationStatus: vmap.get(String(u._id)) || 'not_submitted',
  }))

  if (verification) {
    const vf = String(verification).toLowerCase()
    items = items.filter((u) => {
      const s = u.verificationStatus
      if (vf === 'verified' || vf === 'approved') return s === 'approved'
      if (vf === 'rejected' || vf === 'failed') return s === 'failed'
      if (vf === 'pending') return ['pending', 'review_requested', 'not_submitted'].includes(s)
      return true
    })
  }

  return { items, total, page: Number(page), limit: Number(limit) }
}

const getUserDetails = async (userId) => {
  const user = await User.findOne({
    _id: userId,
    isDeleted: false,
    isAdmin: { $ne: true },
  }).select('fullName phone accountStatus isIdentityVerified role isAvailable createdAt')

  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  const balance = await CommunityBalance.findOne({ userId: user._id })

  return {
    user,
    stats: {
      helpRequestsSent: balance?.helpRequestsSent || 0,
      helpRequestsClosed: balance?.helpRequestsClosed || 0,
      helpGiven: balance?.helpGiven || 0,
      presenceGiven: balance?.presenceGiven || 0,
    },
  }
}

const setAccountStatus = async (userId, status, reason = null) => {
  const user = await User.findById(userId)
  if (!user || user.isDeleted) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  user.accountStatus = status
  if (reason) {
    user.adminNotes = reason
  }
  await user.save()

  return user
}

const getReports = async ({ page = 1, limit = 20, status } = {}) => {
  const skip = (Number(page) - 1) * Number(limit)

  const query = {}
  if (status) {
    query.status = status
  }

  const [items, total] = await Promise.all([
    Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('reporterId', 'fullName phone')
      .populate('reportedUserId', 'fullName phone'),
    Report.countDocuments(query),
  ])

  return { items, total, page: Number(page), limit: Number(limit) }
}

const resolveReport = async (reportId, adminId, { actionTaken, adminNote }) => {
  const report = await Report.findById(reportId)
  if (!report) {
    const err = new Error('Report not found')
    err.statusCode = 404
    throw err
  }

  report.status = REPORT_STATUS.RESOLVED
  report.actionTaken = actionTaken || REPORT_ACTION.NO_ACTION
  report.adminNote = adminNote || null
  report.reviewedBy = adminId
  report.reviewedAt = new Date()

  await report.save()
  return report
}

const getDashboardStats = async () => {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [
    activeAwarenessRequests,
    helpResolvedToday,
    presenceResolvedToday,
    volunteersAvailableNow,
    pendingVerifications,
    safetyFlags,
  ] = await Promise.all([
    PresenceRequest.countDocuments({
      status: {
        $in: [
          PRESENCE_STATUS.ACTIVE,
          PRESENCE_STATUS.HELPERS_NOTIFIED,
          PRESENCE_STATUS.HELPERS_ACCEPTED,
        ],
      },
    }),
    HelpRequest.countDocuments({
      status: {
        $in: [HELP_REQUEST_STATUS.CLOSED, HELP_REQUEST_STATUS.CANCELLED],
      },
      $or: [
        { closedAt: { $gte: startOfToday } },
        { cancelledAt: { $gte: startOfToday } },
      ],
    }),
    PresenceRequest.countDocuments({
      status: {
        $in: [PRESENCE_STATUS.CLOSED, PRESENCE_STATUS.CANCELLED],
      },
      $or: [
        { closedAt: { $gte: startOfToday } },
        { cancelledAt: { $gte: startOfToday } },
      ],
    }),
    User.countDocuments({
      isAvailable: true,
      accountStatus: 'active',
      isDeleted: false,
    }),
    User.countDocuments({
      accountStatus: 'pending_review',
      isDeleted: false,
    }),
    Report.countDocuments({
      status: { $in: [REPORT_STATUS.PENDING, REPORT_STATUS.UNDER_REVIEW] },
    }),
  ])

  return {
    activeAwarenessRequests,
    resolvedToday: helpResolvedToday + presenceResolvedToday,
    volunteersAvailableNow,
    pendingVerifications,
    safetyFlags,
  }
}

const getLiveAwareness = async ({ page = 1, limit = 20, rangeHours = 24 } = {}) => {
  const skip = (Number(page) - 1) * Number(limit)
  const hours = Number(rangeHours) || 24
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const query = {
    createdAt: { $gte: since },
    status: {
      $in: [
        PRESENCE_STATUS.ACTIVE,
        PRESENCE_STATUS.HELPERS_NOTIFIED,
        PRESENCE_STATUS.HELPERS_ACCEPTED,
      ],
    },
  }

  const [items, total] = await Promise.all([
    PresenceRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('requesterId', 'fullName phone'),
    PresenceRequest.countDocuments(query),
  ])

  const mappedItems = items.map((r) => ({
    id: r._id,
    situationType: r.situationType,
    status: r.status,
    createdAt: r.createdAt,
    totalNotified: r.totalNotified,
    totalAccepted: r.totalAccepted,
    requester: r.requesterId
      ? {
          id: r.requesterId._id,
          fullName: r.requesterId.fullName,
          phone: r.requesterId.phone,
        }
      : null,
  }))

  return {
    items: mappedItems,
    total,
    page: Number(page),
    limit: Number(limit),
  }
}

const sendAdminNotification = async ({ userIds, title, body, priority = 'normal' }) => {
  const cleanTitle = String(title || '').trim()
  const cleanBody = String(body || '').trim()

  if (!cleanTitle || !cleanBody) {
    const err = new Error('Title and body are required')
    err.statusCode = 400
    throw err
  }

  const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : []
  const uniqueIds = [...new Set(ids.map((id) => String(id)))]

  // Ensure users have at least one active token; attempt to auto-claim if none
  const DeviceToken = require('../models/DeviceToken')
  let autoAttachedCount = 0
  for (const uid of uniqueIds) {
    const activeCount = await DeviceToken.countDocuments({ userId: uid, isActive: true })
    if (activeCount === 0) {
      try {
        // Try to claim a recent unassigned token
        await module.exports.claimLatestUnassignedToken({ userId: uid })
        autoAttachedCount += 1
      } catch (_) {
        // ignore — leave as zero devices for this user
      }
    }
  }

  const payload = {
    title: cleanTitle,
    body: cleanBody,
    data: { type: 'ADMIN_BROADCAST' },
    priority: String(priority).toLowerCase() === 'high' ? 'high' : 'normal',
  }

  if (!uniqueIds.length) {
    const { notifyMultipleUsers } = require('./notification.service')
    const users = await require('../models/User')
      .find({ isDeleted: false, isAdmin: { $ne: true } })
      .select('_id')
      .lean()
    const allIds = users.map((u) => u._id)
    const result = await notifyMultipleUsers(allIds, payload)
    return {
      targetedUserCount: allIds.length,
      tokensFound: result?.tokensFound ?? 0,
      successCount: result?.successCount ?? 0,
      failureCount: result?.failureCount ?? 0,
    }
  }

  const { notifyMultipleUsers } = require('./notification.service')
  const result = await notifyMultipleUsers(uniqueIds, payload)
  return {
    targetedUserCount: uniqueIds.length,
    tokensFound: result?.tokensFound ?? 0,
    successCount: result?.successCount ?? 0,
    failureCount: result?.failureCount ?? 0,
    autoAttachedCount,
    invalidatedCount: result?.invalidatedCount ?? 0,
    errorCode: result?.firstErrorCode || null,
    errorMessage: result?.firstErrorMessage || null,
  }
}

const getDeviceTokenCounts = async (userIds = []) => {
  const DeviceToken = require('../models/DeviceToken')
  const logger = require('../utils/logger')
  try {
    const ids = Array.isArray(userIds) ? userIds.filter(Boolean).map(String) : []
    if (!ids.length) return []

    const docs = await DeviceToken.find({
      userId: { $in: ids },
      isActive: true,
    }).select('userId token')

    const countsMap = {}
    for (const doc of docs) {
      const key = String(doc.userId)
      if (!countsMap[key]) countsMap[key] = new Set()
      countsMap[key].add(doc.token)
    }

    return Object.entries(countsMap).map(([userId, tokenSet]) => ({
      userId,
      count: tokenSet.size,
    }))
  } catch (err) {
    logger.error('getDeviceTokenCounts error:', err)
    return []
  }
}

const getDeviceTokensForUser = async (userId) => {
  const DeviceToken = require('../models/DeviceToken')
  const list = await DeviceToken.find({ userId }).select('token platform isActive lastUsedAt invalidatedAt createdAt')
  return list.map((t) => ({
    token: t.token,
    platform: t.platform,
    isActive: !!t.isActive,
    lastUsedAt: t.lastUsedAt,
    invalidatedAt: t.invalidatedAt,
    createdAt: t.createdAt,
  }))
}

const attachDeviceTokenToUser = async ({ userId, token, platform = 'android' }) => {
  const DeviceToken = require('../models/DeviceToken')
  if (!token) {
    const err = new Error('FCM token is required')
    err.statusCode = 400
    throw err
  }
  const updated = await DeviceToken.findOneAndUpdate(
    { token },
    {
      userId,
      token,
      platform,
      isActive: true,
      invalidatedAt: null,
      lastUsedAt: new Date(),
    },
    { upsert: true, new: true }
  )
  return { token: updated.token, platform: updated.platform, isActive: updated.isActive }
}

const claimLatestUnassignedToken = async ({ userId, platform = 'android' }) => {
  const DeviceToken = require('../models/DeviceToken')
  const unassigned = await DeviceToken.findOne({
    isActive: true,
    $or: [{ userId: { $exists: false } }, { userId: null }],
  })
    .sort({ createdAt: -1 })
    .select('token')

  if (!unassigned) {
    const err = new Error('No unassigned active tokens found')
    err.statusCode = 404
    throw err
  }

  const updated = await DeviceToken.findOneAndUpdate(
    { token: unassigned.token },
    {
      userId,
      platform,
      isActive: true,
      invalidatedAt: null,
      lastUsedAt: new Date(),
    },
    { new: true }
  )

  return { token: updated.token, platform: updated.platform, isActive: updated.isActive }
}

module.exports = {
  getPendingVerifications,
  getVerificationDetails,
  getUsers,
  getUserDetails,
  setAccountStatus,
  getReports,
  resolveReport,
  getDashboardStats,
  getLiveAwareness,
  sendAdminNotification,
  getDeviceTokenCounts,
  getDeviceTokensForUser,
  attachDeviceTokenToUser,
  claimLatestUnassignedToken,
}
