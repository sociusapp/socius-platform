const mongoose = require('mongoose')
const User = require('../models/User')
const Verification = require('../models/Verification')
const Report = require('../models/Report')
const HelpRequest = require('../models/HelpRequest')
const PresenceRequest = require('../models/PresenceRequest')
const CommunityBalance = require('../models/CommunityBalance')
const Badge = require('../models/Badge')
const {
  REPORT_STATUS,
  REPORT_ACTION,
  HELP_REQUEST_STATUS,
  PRESENCE_STATUS,
} = require('../utils/constants')

const isObjectIdLike = (value) => /^[a-f0-9]{24}$/i.test(String(value || '').trim())
/** Same rules as helpRequest.service normalizeUploadPath — keep category icons loadable in admin. */
const normalizeCategoryAssetPath = (path) => {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const idx = path.indexOf('uploads/')
  if (idx !== -1) return '/' + path.substring(idx).replace(/\\/g, '/')
  return path.startsWith('/') ? path : `/${path}`
}

const hydrateHelpRequestCategoryDisplay = async (request) => {
  if (!request) return request
  if (request.categoryIcon && request.categoryName) return request

  const HelpCategory = require('../models/HelpCategory')
  let doc = null
  if (request.categoryId) {
    doc = await HelpCategory.findById(request.categoryId).select('name iconPath').lean()
  }
  if (!doc && request.category) {
    doc = await HelpCategory.findOne({
      slug: String(request.category).trim().toLowerCase(),
      isActive: true,
    })
      .select('name iconPath')
      .lean()
  }
  if (!doc) return request

  return {
    ...request,
    categoryName: request.categoryName || doc.name || null,
    categoryIcon: request.categoryIcon || (doc.iconPath ? normalizeCategoryAssetPath(doc.iconPath) : null),
  }
}

const roundCoord = (n, decimals = 3) => {
  const num = Number(n)
  if (!Number.isFinite(num)) return null
  const p = Math.pow(10, decimals)
  return Math.round(num * p) / p
}

const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const INCIDENT_TERMINAL_PRESENCE = ['closed', 'cancelled', 'auto_closed']
const INCIDENT_TERMINAL_HELP = ['closed', 'cancelled', 'auto_closed']

const situationTypeToLabel = (t) => {
  const k = String(t || '').toLowerCase()
  const map = {
    need_calm_presence: 'Calm presence',
    being_followed: 'Being followed',
    feeling_unsafe: 'Feeling unsafe',
    other: 'Other',
  }
  return map[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '—'
}

const humanizeCategorySlug = (slug) =>
  String(slug || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || '—'

const presenceIncidentOutcome = (doc) => {
  const st = String(doc.status || '').toLowerCase()
  if (st === 'cancelled') return { label: 'Cancelled by user', type: 'negative' }
  if (st === 'auto_closed') return { label: 'Auto closed', type: 'neutral' }
  if (doc.emergencyServicesCalled) return { label: 'Emergency services involved', type: 'warning' }
  const cr = doc.closureReason
  const reasons = {
    calm_mediation: 'Calm resolution',
    no_longer_needed: 'No longer needed',
    situation_changed: 'Situation changed',
    chose_to_step_away: 'Chose to step away',
    emergency_services_called: 'Emergency services',
  }
  if (cr && reasons[cr]) return { label: reasons[cr], type: cr === 'emergency_services_called' ? 'warning' : 'neutral' }
  if (st === 'closed') return { label: 'Closed', type: 'neutral' }
  return { label: humanizeCategorySlug(st) || '—', type: 'neutral' }
}

const helpIncidentOutcome = (doc) => {
  const st = String(doc.status || '').toLowerCase()
  if (st === 'cancelled') return { label: 'Cancelled by user', type: 'negative' }
  if (st === 'auto_closed') return { label: 'Auto closed', type: 'neutral' }
  if (st === 'closed') return { label: 'Closed', type: 'neutral' }
  return { label: humanizeCategorySlug(st) || '—', type: 'neutral' }
}

const mapIncidentReviewDoc = (doc) => {
  if (doc.source === 'presence') {
    const { label: outcomeLabel, type: outcomeType } = presenceIncidentOutcome(doc)
    return {
      id: String(doc._id),
      source: 'presence',
      createdAt: doc.createdAt,
      status: doc.status,
      categoryLabel: 'Need presence',
      scenarioLabel: situationTypeToLabel(doc.situationType),
      outcomeLabel,
      outcomeType,
      description: doc.description || null,
      address: doc.address || null,
      metrics: {
        respondersNotified: Number(doc.totalNotified) || 0,
        respondersAccepted: Number(doc.totalAccepted) || 0,
        maxResponders: doc.maxHelpers ?? null,
      },
    }
  }

  const { label: outcomeLabel, type: outcomeType } = helpIncidentOutcome(doc)
  const cat = doc.categoryName || humanizeCategorySlug(doc.category)
  return {
    id: String(doc._id),
    source: 'help',
    createdAt: doc.createdAt,
    status: doc.status,
    categoryLabel: 'Daily help',
    scenarioLabel: cat,
    outcomeLabel,
    outcomeType,
    description: doc.description || null,
    address: doc.address || null,
    metrics: {
      categorySlug: doc.category || null,
    },
  }
}

const buildIncidentReviewPresenceMatch = ({
  status,
  situationType,
  scenario,
  outcomeTag,
  from,
  to,
  city,
  q,
  terminalOnly,
}) => {
  const query = {}
  const tOnly = terminalOnly !== false && terminalOnly !== 'false'
  if (tOnly && !status) {
    query.status = { $in: INCIDENT_TERMINAL_PRESENCE }
  }
  if (status) query.status = String(status).toLowerCase()

  if (situationType) query.situationType = String(situationType).toLowerCase()

  if (outcomeTag === 'cancelled') query.status = 'cancelled'
  else if (outcomeTag === 'auto_closed') query.status = 'auto_closed'
  else if (outcomeTag === 'closed') query.status = 'closed'
  else if (outcomeTag === 'emergency') {
    query.$or = [{ emergencyServicesCalled: true }, { closureReason: 'emergency_services_called' }]
  } else if (outcomeTag === 'calm_resolution') query.closureReason = 'calm_mediation'

  const cleanFrom = from ? new Date(from) : null
  const cleanTo = to ? new Date(to) : null
  if (cleanFrom && !Number.isNaN(cleanFrom.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $gte: cleanFrom }
  }
  if (cleanTo && !Number.isNaN(cleanTo.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $lte: cleanTo }
  }

  const cityTrim = String(city || '').trim()
  if (cityTrim) {
    query['location.address'] = new RegExp(escapeRegex(cityTrim), 'i')
  }

  const descClauses = []
  const search = String(q || '').trim()
  if (search) {
    if (isObjectIdLike(search) && mongoose.Types.ObjectId.isValid(search)) {
      query._id = new mongoose.Types.ObjectId(search)
    } else {
      descClauses.push({ description: new RegExp(escapeRegex(search), 'i') })
    }
  }
  const scen = String(scenario || '').trim()
  if (scen) {
    descClauses.push({ description: new RegExp(escapeRegex(scen), 'i') })
  }
  if (descClauses.length === 1) Object.assign(query, descClauses[0])
  else if (descClauses.length > 1) query.$and = [...(query.$and || []), ...descClauses]

  return query
}

const buildIncidentReviewHelpMatch = ({
  status,
  category,
  scenario,
  outcomeTag,
  from,
  to,
  city,
  q,
  terminalOnly,
}) => {
  const query = {}
  const tOnly = terminalOnly !== false && terminalOnly !== 'false'
  if (tOnly && !status) {
    query.status = { $in: INCIDENT_TERMINAL_HELP }
  }
  if (status) query.status = String(status).toLowerCase()
  if (category) query.category = String(category).toLowerCase()

  if (outcomeTag === 'cancelled') query.status = 'cancelled'
  else if (outcomeTag === 'auto_closed') query.status = 'auto_closed'
  else if (outcomeTag === 'closed') query.status = 'closed'
  else if (outcomeTag === 'emergency' || outcomeTag === 'calm_resolution') {
    query._id = { $in: [] }
  }

  const cleanFrom = from ? new Date(from) : null
  const cleanTo = to ? new Date(to) : null
  if (cleanFrom && !Number.isNaN(cleanFrom.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $gte: cleanFrom }
  }
  if (cleanTo && !Number.isNaN(cleanTo.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $lte: cleanTo }
  }

  const cityTrim = String(city || '').trim()
  if (cityTrim) {
    query['location.address'] = new RegExp(escapeRegex(cityTrim), 'i')
  }

  const andParts = []
  const search = String(q || '').trim()
  if (search) {
    if (isObjectIdLike(search) && mongoose.Types.ObjectId.isValid(search)) {
      query._id = new mongoose.Types.ObjectId(search)
    } else {
      const re = new RegExp(escapeRegex(search), 'i')
      andParts.push({ $or: [{ description: re }, { category: re }, { categoryName: re }] })
    }
  }
  const scen = String(scenario || '').trim()
  if (scen) {
    andParts.push({ description: new RegExp(escapeRegex(scen), 'i') })
  }
  if (andParts.length) query.$and = [...(query.$and || []), ...andParts]

  return query
}

/**
 * Unified post-event list: presence + help requests (closed / cancelled / auto_closed by default).
 * Uses $unionWith for correct chronological pagination when source=all.
 */
const getIncidentReview = async (queryParams = {}) => {
  const safeLimit = Math.min(100, Math.max(1, Number(queryParams.limit) || 20))
  const safePage = Math.max(1, Number(queryParams.page) || 1)
  const skip = (safePage - 1) * safeLimit

  const source = String(queryParams.source || 'all').toLowerCase()
  const baseOpts = {
    status: queryParams.status,
    situationType: queryParams.situationType,
    category: queryParams.category,
    scenario: queryParams.scenario,
    outcomeTag: queryParams.outcomeTag ? String(queryParams.outcomeTag).toLowerCase() : '',
    from: queryParams.from,
    to: queryParams.to,
    city: queryParams.city,
    q: queryParams.q,
    terminalOnly: queryParams.terminalOnly,
  }

  const presenceMatch = buildIncidentReviewPresenceMatch({
    status: source === 'help' ? null : baseOpts.status,
    situationType: baseOpts.situationType,
    scenario: baseOpts.scenario,
    outcomeTag: baseOpts.outcomeTag,
    from: baseOpts.from,
    to: baseOpts.to,
    city: baseOpts.city,
    q: baseOpts.q,
    terminalOnly: baseOpts.terminalOnly,
  })

  const helpMatch = buildIncidentReviewHelpMatch({
    status: source === 'presence' ? null : baseOpts.status,
    category: baseOpts.category,
    scenario: baseOpts.scenario,
    outcomeTag: baseOpts.outcomeTag,
    from: baseOpts.from,
    to: baseOpts.to,
    city: baseOpts.city,
    q: baseOpts.q,
    terminalOnly: baseOpts.terminalOnly,
  })

  const presenceProject = {
    _id: 1,
    source: { $literal: 'presence' },
    createdAt: 1,
    status: 1,
    situationType: 1,
    description: 1,
    closureReason: 1,
    emergencyServicesCalled: 1,
    totalNotified: 1,
    totalAccepted: 1,
    maxHelpers: 1,
    address: '$location.address',
    category: { $literal: null },
    categoryName: { $literal: null },
  }

  const helpProject = {
    _id: 1,
    source: { $literal: 'help' },
    createdAt: 1,
    status: 1,
    situationType: { $literal: null },
    description: 1,
    closureReason: { $literal: null },
    emergencyServicesCalled: { $literal: false },
    totalNotified: { $literal: null },
    totalAccepted: { $literal: null },
    maxHelpers: { $literal: null },
    address: '$location.address',
    category: 1,
    categoryName: 1,
  }

  const helpColl = HelpRequest.collection.name

  let rawItems = []
  let total = 0

  if (source === 'presence') {
    ;[rawItems, total] = await Promise.all([
      PresenceRequest.find(presenceMatch)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .select(
          '_id createdAt status situationType description closureReason emergencyServicesCalled totalNotified totalAccepted maxHelpers location'
        )
        .lean()
        .then((rows) =>
          rows.map((r) =>
            mapIncidentReviewDoc({
              source: 'presence',
              _id: r._id,
              createdAt: r.createdAt,
              status: r.status,
              situationType: r.situationType,
              description: r.description,
              closureReason: r.closureReason,
              emergencyServicesCalled: r.emergencyServicesCalled,
              totalNotified: r.totalNotified,
              totalAccepted: r.totalAccepted,
              maxHelpers: r.maxHelpers,
              address: r.location?.address || null,
            })
          )
        ),
      PresenceRequest.countDocuments(presenceMatch),
    ])
  } else if (source === 'help') {
    ;[rawItems, total] = await Promise.all([
      HelpRequest.find(helpMatch)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .select('_id createdAt status category categoryName description location')
        .lean()
        .then((rows) =>
          rows.map((r) =>
            mapIncidentReviewDoc({
              source: 'help',
              _id: r._id,
              createdAt: r.createdAt,
              status: r.status,
              category: r.category,
              categoryName: r.categoryName,
              description: r.description,
              address: r.location?.address || null,
            })
          )
        ),
      HelpRequest.countDocuments(helpMatch),
    ])
  } else {
    const listPipeline = [
      { $match: presenceMatch },
      { $project: presenceProject },
      {
        $unionWith: {
          coll: helpColl,
          pipeline: [{ $match: helpMatch }, { $project: helpProject }],
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: safeLimit },
    ]
    const countPipeline = [
      { $match: presenceMatch },
      { $project: { _id: 1 } },
      {
        $unionWith: {
          coll: helpColl,
          pipeline: [{ $match: helpMatch }, { $project: { _id: 1 } }],
        },
      },
      { $count: 'total' },
    ]
    const [listAgg, countAgg] = await Promise.all([
      PresenceRequest.aggregate(listPipeline).allowDiskUse(true),
      PresenceRequest.aggregate(countPipeline).allowDiskUse(true),
    ])
    total = countAgg[0]?.total || 0
    rawItems = listAgg.map((d) => mapIncidentReviewDoc(d))
  }

  return {
    items: rawItems,
    total,
    page: safePage,
    limit: safeLimit,
    filters: {
      source,
      terminalOnly: baseOpts.terminalOnly !== false && baseOpts.terminalOnly !== 'false',
    },
  }
}

const mapUserMini = (u) =>
  u && typeof u === 'object' && u._id
    ? { id: u._id, fullName: u.fullName, phone: u.phone, profileImage: u.profileImage || null }
    : null

/** Chat sessions + messages for admin activity feed (Help or Presence request) */
const loadAdminChatActivity = async (requestId, requestType) => {
  const ChatSession = require('../models/ChatSession')
  const ChatMessage = require('../models/ChatMessage')
  const rid = String(requestId)
  const requestIdQuery =
    mongoose.Types.ObjectId.isValid(rid) ? new mongoose.Types.ObjectId(rid) : rid

  const sessions = await ChatSession.find({ requestId: requestIdQuery, requestType })
    .populate('requesterId', 'fullName phone profileImage')
    .populate('helperId', 'fullName phone profileImage')
    .sort({ openedAt: 1 })
    .lean()

  const sessionIds = sessions.map((s) => s._id)
  const MESSAGE_CAP = 2000
  const messages =
    sessionIds.length === 0
      ? []
      : await ChatMessage.find({
          sessionId: { $in: sessionIds },
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        })
          .populate('senderId', 'fullName phone profileImage')
          .sort({ createdAt: 1 })
          .limit(MESSAGE_CAP)
          .lean()

  const bySession = new Map()
  for (const sid of sessionIds) bySession.set(String(sid), [])
  for (const m of messages) {
    const arr = bySession.get(String(m.sessionId))
    if (arr) arr.push(m)
  }

  const sessionPayload = sessions.map((s) => ({
    id: s._id,
    status: s.status,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
    messageCount: s.messageCount,
    lastMessage: s.lastMessage,
    requester: mapUserMini(s.requesterId),
    helper: mapUserMini(s.helperId),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))

  const messagesBySession = {}
  for (const s of sessions) {
    messagesBySession[String(s._id)] = (bySession.get(String(s._id)) || []).map((m) => ({
      id: m._id,
      sessionId: m.sessionId,
      createdAt: m.createdAt,
      messageType: m.messageType,
      text: m.text,
      sender: mapUserMini(m.senderId),
      isDelivered: m.isDelivered,
      deliveredAt: m.deliveredAt,
      isRead: m.isRead,
      readAt: m.readAt,
      attachment: m.attachment || null,
    }))
  }

  return {
    sessions: sessionPayload,
    messagesBySession,
    messagesTruncated: messages.length >= MESSAGE_CAP,
  }
}

const buildHelpActivityTimeline = ({ request, matches, closures, chat }) => {
  const events = []
  const add = (at, kind, label, detail = {}) => {
    if (at == null) return
    const d = new Date(at)
    if (Number.isNaN(d.getTime())) return
    events.push({ at: d.toISOString(), kind, label, detail })
  }

  add(request.createdAt, 'request', 'Help request created', {
    category: request.category,
    status: request.status,
    description: request.description || null,
  })
  add(request.matchedAt, 'request', 'Matching / matched (matchedAt)', {})
  add(request.activeAt, 'request', 'Active — helper engaged (activeAt)', {})
  add(request.closedAt, 'request', 'Closed', {})
  add(request.cancelledAt, 'request', 'Cancelled by requester', {})
  add(request.autoClosedAt, 'request', 'Auto-closed by system', {})
  add(request.sessionEndsAt, 'request', 'Session window end (scheduled)', {})
  add(request.completionPromptSentAt, 'request', 'Completion check-in sent', {})

  for (const m of matches || []) {
    const helperDoc = m.helperId && typeof m.helperId === 'object' ? m.helperId : null
    const h = helperDoc?.fullName || 'Helper'
    add(m.createdAt, 'match', `Helper pipeline · ${m.status}`, {
      helper: mapUserMini(helperDoc),
      matchStatus: m.status,
      distanceMeters: m.distanceMeters,
    })
    add(m.notifiedAt, 'match', `${h} — notified`, { status: m.status })
    add(m.viewedAt, 'match', `${h} — viewed request in dashboard`, {})
    add(m.respondedAt, 'match', `${h} — responded`, { status: m.status })
    add(m.acceptedAt, 'match', `${h} — accepted`, {})
    add(m.completedAt, 'match', `${h} — marked completed`, {})
    if (m.helperFeltUnsafe) {
      add(m.updatedAt, 'match', `${h} — flagged feeling unsafe`, {})
    }
    if (m.helperClosure?.closedAt) {
      add(m.helperClosure.closedAt, 'match', `${h} — closure feedback submitted`, {
        wasResolved: m.helperClosure.wasResolved,
        accountability: m.helperClosure.accountability,
        rating: m.helperClosure.rating,
      })
    }
  }

  for (const c of closures || []) {
    add(c.createdAt, 'closure', `Closure record · ${c.status || '—'}`, { status: c.status })
    add(c.closedAt, 'closure', 'Closure closed', {})
  }

  if (chat?.sessions?.length) {
    for (const s of chat.sessions) {
      add(s.openedAt, 'chat', 'Chat session opened', {
        helper: s.helper?.fullName,
        sessionId: s.id,
      })
      const msgs = chat.messagesBySession[String(s.id)] || []
      for (const msg of msgs) {
        const label =
          msg.messageType === 'text'
            ? 'Message'
            : `Message · ${msg.messageType}`
        add(msg.createdAt, 'message', label, {
          from: msg.sender?.fullName || 'Unknown',
          text: msg.text,
          messageType: msg.messageType,
        })
      }
      add(s.closedAt, 'chat', 'Chat session closed', { sessionId: s.id })
    }
  }

  events.sort((a, b) => new Date(a.at) - new Date(b.at))
  return events
}

const buildPresenceActivityTimeline = ({ request, presenceMatches, chat }) => {
  const events = []
  const add = (at, kind, label, detail = {}) => {
    if (at == null) return
    const d = new Date(at)
    if (Number.isNaN(d.getTime())) return
    events.push({ at: d.toISOString(), kind, label, detail })
  }

  add(request.createdAt, 'request', 'Presence request created', {
    situationType: request.situationType,
    status: request.status,
    description: request.description || null,
  })
  add(request.helpersNotifiedAt, 'request', 'Helpers notified (alert wave)', {
    totalNotified: request.totalNotified,
    totalAccepted: request.totalAccepted,
    maxHelpers: request.maxHelpers,
  })
  add(request.closedAt, 'request', 'Closed', {
    closureReason: request.closureReason || null,
    emergencyServicesCalled: request.emergencyServicesCalled,
  })
  add(request.cancelledAt, 'request', 'Cancelled', {})
  add(request.autoClosedAt, 'request', 'Auto-closed', {})
  add(request.autoCloseScheduledAt, 'request', 'Auto-close scheduled', {})

  for (const m of presenceMatches || []) {
    const helperDoc = m.helperId && typeof m.helperId === 'object' ? m.helperId : null
    const h = helperDoc?.fullName || 'Helper'
    add(m.createdAt, 'presence_match', `Responder · ${m.status}`, {
      helper: mapUserMini(helperDoc),
      status: m.status,
      distanceMeters: m.distanceMeters,
    })
    add(m.alertedAt, 'presence_match', `${h} — alerted`, {})
    add(m.respondedAt, 'presence_match', `${h} — responded`, { status: m.status })
    add(m.acceptedAt, 'presence_match', `${h} — accepted`, {})
    add(m.arrivedAt, 'presence_match', `${h} — arrived`, {})
    add(m.closedAt, 'presence_match', `${h} — responder row closed`, {})
    if (m.helperFeedback?.closedAt) {
      add(m.helperFeedback.closedAt, 'presence_match', `${h} — feedback`, {
        closureReason: m.helperFeedback.closureReason,
        helpfulNotes: m.helperFeedback.helpfulNotes,
      })
    }
  }

  if (chat?.sessions?.length) {
    for (const s of chat.sessions) {
      add(s.openedAt, 'chat', 'Chat session opened', {
        helper: s.helper?.fullName,
        sessionId: s.id,
      })
      const msgs = chat.messagesBySession[String(s.id)] || []
      for (const msg of msgs) {
        const label =
          msg.messageType === 'text'
            ? 'Message'
            : `Message · ${msg.messageType}`
        add(msg.createdAt, 'message', label, {
          from: msg.sender?.fullName || 'Unknown',
          text: msg.text,
          messageType: msg.messageType,
        })
      }
      add(s.closedAt, 'chat', 'Chat session closed', { sessionId: s.id })
    }
  }

  events.sort((a, b) => new Date(a.at) - new Date(b.at))
  return events
}

const getPendingVerifications = async ({ page = 1, limit = 20, status, rangeDays, order, search } = {}) => {
  const skip = (Number(page) - 1) * Number(limit)
  const sortDir = String(order || '').toLowerCase() === 'desc' ? -1 : 1
  const searchTrim = String(search || '').trim()

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
  const vQuery = { 
    status: { $in: statusFilter },
    userId: { $exists: true, $ne: null } // Filter out null userId
  }
  if (since) {
    vQuery.$or = [{ submittedAt: { $gte: since } }, { createdAt: { $gte: since } }]
  }

  let verifications = []
  try {
    verifications = await Verification.find(vQuery)
      .sort({ createdAt: sortDir })
      .populate('userId', 'fullName phone accountStatus isIdentityVerified role isAvailable createdAt')
      .lean()
  } catch (error) {
    console.error('Error fetching verifications:', error)
    // Fallback without populate
    verifications = await Verification.find(vQuery)
      .sort({ createdAt: sortDir })
      .lean()
  }

  // Filter out any results with null userId
  verifications = verifications.filter(v => v.userId != null)

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

  if (searchTrim) {
    const re = new RegExp(escapeRegex(searchTrim), 'i')
    combined = combined.filter((row) => {
      const u = row.userId && typeof row.userId === 'object' ? row.userId : {}
      const name = u.fullName || ''
      const phone = u.phone || ''
      const id = String(u._id || row.userId || '')
      return re.test(name) || re.test(phone) || re.test(id)
    })
  }

  const rowTime = (row) => {
    const candidates = [
      row.submittedAt,
      row.lastRetryAt,
      row.reviewRequest?.requestedAt,
      row.createdAt,
    ]
    const times = candidates.filter(Boolean).map((t) => new Date(t).getTime())
    return times.length ? Math.max(...times) : 0
  }

  combined.sort((a, b) => {
    const d = rowTime(a) - rowTime(b)
    if (d !== 0) return sortDir * d
    const ida = String(a.userId?._id || a.userId || '')
    const idb = String(b.userId?._id || b.userId || '')
    return sortDir * ida.localeCompare(idb)
  })

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

const getUsers = async ({ page = 1, limit = 20, search, accountStatus, verification, availability } = {}) => {
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
  const av = String(availability || '').toLowerCase()
  if (av === 'volunteer' || av === 'volunteers') query.isAvailable = true
  if (av === 'community') query.isAvailable = false

  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('fullName phone profileImage cityArea accountStatus isIdentityVerified role isAvailable createdAt location updatedAt')
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

  const idsForReports = items.map((u) => u._id)
  const reportAgg =
    idsForReports.length > 0
      ? await Report.aggregate([
          { $match: { reportedUserId: { $in: idsForReports } } },
          { $group: { _id: '$reportedUserId', n: { $sum: 1 } } },
        ])
      : []
  const reportCountMap = new Map(reportAgg.map((x) => [String(x._id), x.n]))
  items = items.map((u) => ({
    ...u,
    reportCount: reportCountMap.get(String(u._id)) || 0,
  }))

  return { items, total, page: Number(page), limit: Number(limit) }
}

const SCENARIO_CONFIG_DRAFT_KEY = 'scenario_config_v1'

const getScenarioConfigDraft = async () => {
  const AdminContentDraft = require('../models/AdminContentDraft')
  const doc = await AdminContentDraft.findOne({ key: SCENARIO_CONFIG_DRAFT_KEY }).lean()
  return {
    data: doc?.data && typeof doc.data === 'object' ? doc.data : null,
    updatedAt: doc?.updatedAt || null,
  }
}

const upsertScenarioConfigDraft = async (adminUserId, body = {}) => {
  const AdminContentDraft = require('../models/AdminContentDraft')
  const data =
    body && typeof body === 'object' && body.formData && typeof body.formData === 'object'
      ? body.formData
      : body && typeof body === 'object'
        ? body
        : {}
  const doc = await AdminContentDraft.findOneAndUpdate(
    { key: SCENARIO_CONFIG_DRAFT_KEY },
    { $set: { data, updatedBy: adminUserId || null } },
    { upsert: true, new: true }
  ).lean()
  return { data: doc.data, updatedAt: doc.updatedAt }
}

const exportUsersCsv = async ({ search, accountStatus, verification, availability } = {}) => {
  const MAX = 5000
  const query = { isDeleted: false, isAdmin: { $ne: true } }
  if (search) {
    query.$or = [
      { fullName: new RegExp(String(search).trim(), 'i') },
      { phone: new RegExp(String(search).trim(), 'i') },
    ]
  }
  if (accountStatus) {
    const s = String(accountStatus).toLowerCase()
    if (['active', 'limited', 'suspended', 'pending_review'].includes(s)) {
      query.accountStatus = s
    }
  }
  const av = String(availability || '').toLowerCase()
  if (av === 'volunteer' || av === 'volunteers') query.isAvailable = true
  if (av === 'community') query.isAvailable = false

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(MAX)
    .select(
      'fullName phone cityArea accountStatus isIdentityVerified role isAvailable createdAt updatedAt'
    )
    .lean()

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

  const ids = items.map((i) => i._id)
  const reportAgg =
    ids.length > 0
      ? await Report.aggregate([
          { $match: { reportedUserId: { $in: ids } } },
          { $group: { _id: '$reportedUserId', n: { $sum: 1 } } },
        ])
      : []
  const rmap = new Map(reportAgg.map((x) => [String(x._id), x.n]))

  const escapeCsv = (v) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const headers = [
    'id',
    'fullName',
    'phone',
    'cityArea',
    'accountStatus',
    'volunteerOnDuty',
    'verificationStatus',
    'reportsAboutUser',
    'createdAt',
  ]
  const lines = [
    headers.join(','),
    ...items.map((u) =>
      [
        u._id,
        u.fullName || '',
        u.phone || '',
        u.cityArea || '',
        u.accountStatus || '',
        u.isAvailable ? 'yes' : 'no',
        u.verificationStatus || '',
        rmap.get(String(u._id)) || 0,
        u.createdAt ? new Date(u.createdAt).toISOString() : '',
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ]
  return lines.join('\n')
}

const adminClosePresenceRequest = async (presenceId, adminUserId, { closureReason } = {}) => {
  const { PRESENCE_CLOSURE_REASON } = require('../utils/constants')
  const closureService = require('./closure.service')
  const allowed = new Set(Object.values(PRESENCE_CLOSURE_REASON))
  const raw = String(closureReason || 'situation_changed').trim().toLowerCase()
  const reason = allowed.has(raw) ? raw : 'situation_changed'
  return closureService.closePresenceRequest(presenceId, adminUserId, { closureReason: reason })
}

const getUserDetails = async (userId) => {
  const idStr = String(userId || '').trim()
  if (!isObjectIdLike(idStr)) {
    const err = new Error('Invalid user id')
    err.statusCode = 400
    throw err
  }

  const user = await User.findOne({
    _id: idStr,
    isDeleted: false,
    isAdmin: { $ne: true },
  })
    .select(
      'fullName phone countryCode email profileImage accountStatus isIdentityVerified isPhoneVerified role isAvailable createdAt updatedAt openTo notificationPreferences cityArea age gender subscriptionStatus accountLimitedReason accountLimitedAt adminNotes availabilityPausedUntil'
    )
    .lean()

  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  const uid = user._id

  const [
    balance,
    verification,
    badges,
    helpAsRequester,
    presenceAsRequester,
    helpCancelled,
    presenceCancelled,
    reportsOpen,
    reportsTotal,
  ] = await Promise.all([
    CommunityBalance.findOne({ userId: uid }).lean(),
    Verification.findOne({ userId: uid })
      .select(
        'status reviewedAt adminNote updatedAt submittedAt governmentId selfie failureReasons reviewHistory reviewRequest retryCount lastRetryAt'
      )
      .lean(),
    Badge.find({ userId: uid, isActive: true }).select('type awardedBy').lean(),
    HelpRequest.countDocuments({ requesterId: uid }),
    PresenceRequest.countDocuments({ requesterId: uid }),
    HelpRequest.countDocuments({ requesterId: uid, status: 'cancelled' }),
    PresenceRequest.countDocuments({ requesterId: uid, status: 'cancelled' }),
    Report.countDocuments({
      reportedUserId: uid,
      status: { $nin: ['resolved', 'dismissed'] },
    }),
    Report.countDocuments({ reportedUserId: uid }),
  ])

  const mapVerificationForAdmin = (v) => {
    if (!v) {
      return {
        status: 'not_submitted',
        reviewedAt: null,
        adminNote: null,
        updatedAt: null,
        submittedAt: null,
        governmentId: null,
        selfie: null,
        failureReasons: [],
        reviewRequest: null,
        reviewHistory: [],
        retryCount: 0,
        lastRetryAt: null,
      }
    }
    const gov = v.governmentId
    const selfie = v.selfie
    const rr = v.reviewRequest
    const hist = Array.isArray(v.reviewHistory) ? v.reviewHistory : []
    return {
      status: v.status,
      reviewedAt: v.reviewedAt,
      adminNote: v.adminNote,
      updatedAt: v.updatedAt,
      submittedAt: v.submittedAt || null,
      failureReasons: v.failureReasons || [],
      retryCount: v.retryCount ?? 0,
      lastRetryAt: v.lastRetryAt || null,
      governmentId: gov?.fileUrl
        ? {
            fileUrl: gov.fileUrl,
            fileName: gov.fileName || null,
            fileType: gov.fileType || null,
            documentType: gov.documentType || null,
            uploadedAt: gov.uploadedAt || null,
          }
        : null,
      selfie: selfie?.fileUrl
        ? {
            fileUrl: selfie.fileUrl,
            fileName: selfie.fileName || null,
            uploadedAt: selfie.uploadedAt || null,
          }
        : null,
      reviewRequest: rr
        ? {
            isRequested: !!rr.isRequested,
            requestedAt: rr.requestedAt || null,
            userExplanation: rr.userExplanation || null,
            updatedDocUrl: rr.updatedDocUrl || null,
            updatedSelfieUrl: rr.updatedSelfieUrl || null,
            status: rr.status || null,
          }
        : null,
      reviewHistory: hist.slice(-15).map((e) => ({
        status: e.status,
        action: e.action,
        reviewedAt: e.reviewedAt,
        failureReasons: e.failureReasons || [],
        adminNote: e.adminNote || null,
      })),
    }
  }

  return {
    user,
    verification: mapVerificationForAdmin(verification),
    badges: (badges || []).map((b) => ({ type: b.type, awardedBy: b.awardedBy })),
    stats: {
      helpRequestsSent: balance?.helpRequestsSent || 0,
      helpRequestsClosed: balance?.helpRequestsClosed || 0,
      helpGiven: balance?.helpGiven || 0,
      presenceGiven: balance?.presenceGiven || 0,
      lastRequestAt: balance?.lastRequestAt || null,
      lastHelpGivenAt: balance?.lastHelpGivenAt || null,
    },
    activity: {
      helpRequestsAsRequester: helpAsRequester,
      presenceRequestsAsRequester: presenceAsRequester,
      cancellationsTotal: (helpCancelled || 0) + (presenceCancelled || 0),
      helpCancelled: helpCancelled || 0,
      presenceCancelled: presenceCancelled || 0,
    },
    safety: {
      reportsTotal: reportsTotal || 0,
      reportsOpen: reportsOpen || 0,
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

const REPORT_SEVERITY_GROUPS = {
  high: ['personal_boundaries_crossed', 'misuse_of_platform'],
  medium: ['felt_uncomfortable', 'something_else'],
  low: ['false_unnecessary_request'],
}

const getReports = async ({
  page = 1,
  limit = 20,
  status,
  category,
  severity,
  q,
  from,
  to,
} = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100)
  const safePage = Math.max(Number(page) || 1, 1)
  const skip = (safePage - 1) * safeLimit

  const query = {}
  if (status) query.status = status

  if (category) {
    query.category = category
  } else {
    const sev = String(severity || '').toLowerCase()
    if (sev === 'high' || sev === 'medium' || sev === 'low') {
      query.category = { $in: REPORT_SEVERITY_GROUPS[sev] }
    }
  }

  if (from || to) {
    query.createdAt = {}
    if (from) query.createdAt.$gte = new Date(from)
    if (to) query.createdAt.$lte = new Date(to)
  }

  const term = q != null ? String(q).trim() : ''
  let findFilter = query
  if (term) {
    const or = [{ details: new RegExp(escapeRegex(term), 'i') }]
    if (isObjectIdLike(term)) {
      or.push({ _id: new mongoose.Types.ObjectId(term) })
    }
    findFilter = Object.keys(query).length ? { $and: [query, { $or: or }] } : { $or: or }
  }

  const [items, total] = await Promise.all([
    Report.find(findFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('reporterId', 'fullName phone')
      .populate('reportedUserId', 'fullName phone')
      .populate({
        path: 'reportedRequestId',
        select: 'status category situationType categoryName description',
      })
      .lean(),
    Report.countDocuments(findFilter),
  ])

  return { items, total, page: safePage, limit: safeLimit }
}

const updateReportReviewStatus = async (reportId, adminId, { status } = {}) => {
  if (!isObjectIdLike(reportId)) {
    const err = new Error('Invalid report id')
    err.statusCode = 400
    throw err
  }
  if (status !== REPORT_STATUS.UNDER_REVIEW) {
    const err = new Error('Only under_review is allowed')
    err.statusCode = 400
    throw err
  }

  const report = await Report.findById(reportId)
  if (!report) {
    const err = new Error('Report not found')
    err.statusCode = 404
    throw err
  }
  if (![REPORT_STATUS.PENDING, REPORT_STATUS.UNDER_REVIEW].includes(report.status)) {
    const err = new Error('Report is already closed')
    err.statusCode = 400
    throw err
  }

  report.status = REPORT_STATUS.UNDER_REVIEW
  report.reviewedBy = adminId
  report.reviewedAt = new Date()
  await report.save()

  return Report.findById(report._id)
    .populate('reporterId', 'fullName phone')
    .populate('reportedUserId', 'fullName phone')
    .populate({
      path: 'reportedRequestId',
      select: 'status category situationType categoryName description',
    })
    .lean()
}

const resolveReport = async (reportId, adminId, { actionTaken, adminNote }) => {
  const report = await Report.findById(reportId)
  if (!report) {
    const err = new Error('Report not found')
    err.statusCode = 404
    throw err
  }

  const action = actionTaken || REPORT_ACTION.NO_ACTION
  report.actionTaken = action
  report.adminNote = adminNote != null ? adminNote : report.adminNote
  report.reviewedBy = adminId
  report.reviewedAt = new Date()
  report.status =
    action === REPORT_ACTION.DISMISSED
      ? REPORT_STATUS.DISMISSED
      : REPORT_STATUS.RESOLVED

  await report.save()
  return report
}

const getDashboardStats = async () => {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const activePresenceStatuses = [
    PRESENCE_STATUS.ACTIVE,
    PRESENCE_STATUS.HELPERS_NOTIFIED,
    PRESENCE_STATUS.HELPERS_ACCEPTED,
  ]
  const activeHelpStatuses = [
    HELP_REQUEST_STATUS.OPEN,
    HELP_REQUEST_STATUS.MATCHING,
    HELP_REQUEST_STATUS.MATCHED,
    HELP_REQUEST_STATUS.ACTIVE,
    HELP_REQUEST_STATUS.CLOSING,
  ]
  const helpFinalizedStatuses = [
    HELP_REQUEST_STATUS.CLOSED,
    HELP_REQUEST_STATUS.CANCELLED,
    HELP_REQUEST_STATUS.AUTO_CLOSED,
  ]
  const presenceFinalizedStatuses = [
    PRESENCE_STATUS.CLOSED,
    PRESENCE_STATUS.CANCELLED,
    PRESENCE_STATUS.AUTO_CLOSED,
  ]

  const [
    activeAwarenessRequests,
    activeHelpRequests,
    helpResolvedToday,
    presenceResolvedToday,
    helpCreatedToday,
    presenceCreatedToday,
    helpCreatedLast24h,
    presenceCreatedLast24h,
    helpResolvedLast24h,
    presenceResolvedLast24h,
    helpCreatedLast7d,
    presenceCreatedLast7d,
    helpResolvedLast7d,
    presenceResolvedLast7d,
    helpMatchedLast24h,
    presenceHelpersAcceptedLast24h,
    helpNoHelpersLast24h,
    presenceNoHelpersLast24h,
    volunteersAvailableNow,
    totalCommunityMembers,
    totalVolunteers,
    limitedAccounts,
    suspendedAccounts,
    pendingVerifications,
    reviewRequestedVerifications,
    safetyFlags,
    reportsToday,
    unresolvedReportsToday,
  ] = await Promise.all([
    PresenceRequest.countDocuments({
      status: { $in: activePresenceStatuses },
    }),
    HelpRequest.countDocuments({
      status: { $in: activeHelpStatuses },
    }),
    HelpRequest.countDocuments({
      status: { $in: helpFinalizedStatuses },
      $or: [
        { closedAt: { $gte: startOfToday } },
        { cancelledAt: { $gte: startOfToday } },
        { autoClosedAt: { $gte: startOfToday } },
      ],
    }),
    PresenceRequest.countDocuments({
      status: { $in: presenceFinalizedStatuses },
      $or: [
        { closedAt: { $gte: startOfToday } },
        { cancelledAt: { $gte: startOfToday } },
        { autoClosedAt: { $gte: startOfToday } },
      ],
    }),
    HelpRequest.countDocuments({ createdAt: { $gte: startOfToday } }),
    PresenceRequest.countDocuments({ createdAt: { $gte: startOfToday } }),
    HelpRequest.countDocuments({ createdAt: { $gte: last24h } }),
    PresenceRequest.countDocuments({ createdAt: { $gte: last24h } }),
    HelpRequest.countDocuments({
      status: { $in: helpFinalizedStatuses },
      $or: [
        { closedAt: { $gte: last24h } },
        { cancelledAt: { $gte: last24h } },
        { autoClosedAt: { $gte: last24h } },
      ],
    }),
    PresenceRequest.countDocuments({
      status: { $in: presenceFinalizedStatuses },
      $or: [
        { closedAt: { $gte: last24h } },
        { cancelledAt: { $gte: last24h } },
        { autoClosedAt: { $gte: last24h } },
      ],
    }),
    HelpRequest.countDocuments({ createdAt: { $gte: last7d } }),
    PresenceRequest.countDocuments({ createdAt: { $gte: last7d } }),
    HelpRequest.countDocuments({
      status: { $in: helpFinalizedStatuses },
      $or: [
        { closedAt: { $gte: last7d } },
        { cancelledAt: { $gte: last7d } },
        { autoClosedAt: { $gte: last7d } },
      ],
    }),
    PresenceRequest.countDocuments({
      status: { $in: presenceFinalizedStatuses },
      $or: [
        { closedAt: { $gte: last7d } },
        { cancelledAt: { $gte: last7d } },
        { autoClosedAt: { $gte: last7d } },
      ],
    }),
    HelpRequest.countDocuments({
      createdAt: { $gte: last24h },
      status: { $in: [HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE, HELP_REQUEST_STATUS.CLOSING, ...helpFinalizedStatuses] },
    }),
    PresenceRequest.countDocuments({
      createdAt: { $gte: last24h },
      totalAccepted: { $gt: 0 },
    }),
    HelpRequest.countDocuments({
      createdAt: { $gte: last24h },
      status: { $in: [HELP_REQUEST_STATUS.CANCELLED, HELP_REQUEST_STATUS.AUTO_CLOSED] },
    }),
    PresenceRequest.countDocuments({
      createdAt: { $gte: last24h },
      totalAccepted: 0,
      status: { $in: [PRESENCE_STATUS.CANCELLED, PRESENCE_STATUS.AUTO_CLOSED] },
    }),
    User.countDocuments({
      isAvailable: true,
      accountStatus: 'active',
      isDeleted: false,
    }),
    User.countDocuments({
      isDeleted: false,
      isAdmin: { $ne: true },
      accountStatus: 'active',
    }),
    User.countDocuments({
      isDeleted: false,
      isAdmin: { $ne: true },
      role: { $in: ['available_to_help', 'both'] },
    }),
    User.countDocuments({
      accountStatus: 'limited',
      isDeleted: false,
    }),
    User.countDocuments({
      accountStatus: 'suspended',
      isDeleted: false,
    }),
    User.countDocuments({
      accountStatus: 'pending_review',
      isDeleted: false,
    }),
    Verification.countDocuments({
      status: 'review_requested',
      userId: { $exists: true, $ne: null },
    }),
    Report.countDocuments({
      status: { $in: [REPORT_STATUS.PENDING, REPORT_STATUS.UNDER_REVIEW] },
    }),
    Report.countDocuments({
      createdAt: { $gte: startOfToday },
    }),
    Report.countDocuments({
      createdAt: { $gte: startOfToday },
      status: { $in: [REPORT_STATUS.PENDING, REPORT_STATUS.UNDER_REVIEW] },
    }),
  ])

  const communityUserMatch = {
    isDeleted: false,
    isAdmin: { $ne: true },
    accountStatus: 'active',
  }

  const genderBucketExpr = {
    $switch: {
      branches: [
        { case: { $eq: ['$gender', 'male'] }, then: 'male' },
        { case: { $eq: ['$gender', 'female'] }, then: 'female' },
        { case: { $eq: ['$gender', 'prefer_not_to_say'] }, then: 'preferNotToSay' },
      ],
      default: 'unspecified',
    },
  }

  const foldGenderAgg = (rows) => {
    const o = { male: 0, female: 0, preferNotToSay: 0, unspecified: 0 }
    for (const r of rows || []) {
      const k = r._id
      if (k != null && Object.prototype.hasOwnProperty.call(o, k)) o[k] = r.count
    }
    return o
  }

  const [communityGenderAgg, volunteersGenderAgg] = await Promise.all([
    User.aggregate([
      { $match: communityUserMatch },
      { $group: { _id: genderBucketExpr, count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { ...communityUserMatch, isAvailable: true } },
      { $group: { _id: genderBucketExpr, count: { $sum: 1 } } },
    ]),
  ])

  const genderCommunity = foldGenderAgg(communityGenderAgg)
  const genderVolunteersOnline = foldGenderAgg(volunteersGenderAgg)

  const resolvedToday = helpResolvedToday + presenceResolvedToday
  const createdToday = helpCreatedToday + presenceCreatedToday
  const resolvedLast24h = helpResolvedLast24h + presenceResolvedLast24h
  const createdLast24h = helpCreatedLast24h + presenceCreatedLast24h
  const resolvedLast7d = helpResolvedLast7d + presenceResolvedLast7d
  const createdLast7d = helpCreatedLast7d + presenceCreatedLast7d
  const matchedLast24h = helpMatchedLast24h + presenceHelpersAcceptedLast24h
  const noHelpersLast24h = helpNoHelpersLast24h + presenceNoHelpersLast24h

  const safePct = (part, total) => {
    if (!total) return 0
    return Math.round((Number(part) / Number(total)) * 100)
  }

  return {
    activeAwarenessRequests,
    activeHelpRequests,
    activeRequestsNow: activeAwarenessRequests + activeHelpRequests,
    resolvedToday,
    createdToday,
    volunteersAvailableNow,
    pendingVerifications,
    reviewRequestedVerifications,
    safetyFlags,
    reportsToday,
    unresolvedReportsToday,
    totalCommunityMembers,
    totalVolunteers,
    limitedAccounts,
    suspendedAccounts,
    flows: {
      dailyHelp: {
        active: activeHelpRequests,
        createdToday: helpCreatedToday,
        resolvedToday: helpResolvedToday,
        createdLast24h: helpCreatedLast24h,
        resolvedLast24h: helpResolvedLast24h,
        createdLast7d: helpCreatedLast7d,
        resolvedLast7d: helpResolvedLast7d,
        matchedLast24h: helpMatchedLast24h,
        noHelperOutcomesLast24h: helpNoHelpersLast24h,
      },
      presence: {
        active: activeAwarenessRequests,
        createdToday: presenceCreatedToday,
        resolvedToday: presenceResolvedToday,
        createdLast24h: presenceCreatedLast24h,
        resolvedLast24h: presenceResolvedLast24h,
        createdLast7d: presenceCreatedLast7d,
        resolvedLast7d: presenceResolvedLast7d,
        matchedLast24h: presenceHelpersAcceptedLast24h,
        noHelperOutcomesLast24h: presenceNoHelpersLast24h,
      },
    },
    performance: {
      matchedRateLast24h: safePct(matchedLast24h, createdLast24h),
      resolutionRateToday: safePct(resolvedToday, createdToday),
      resolutionRateLast24h: safePct(resolvedLast24h, createdLast24h),
      resolutionRateLast7d: safePct(resolvedLast7d, createdLast7d),
      noHelperRateLast24h: safePct(noHelpersLast24h, createdLast24h),
    },
    gender: {
      community: genderCommunity,
      volunteersOnline: genderVolunteersOnline,
      maleFemaleSplitCommunity: safePct(
        genderCommunity.male,
        genderCommunity.male + genderCommunity.female
      ),
      maleFemaleSplitVolunteersOnline: safePct(
        genderVolunteersOnline.male,
        genderVolunteersOnline.male + genderVolunteersOnline.female
      ),
    },
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

const ADMIN_CAMPAIGN_TYPES = [
  'notice',
  'community',
  'product',
  'marketing',
  'promo',
  'volunteer_recruitment',
  'safety_reminder',
]

const normalizeHttpsImageUrl = (raw) => {
  const s = String(raw || '').trim()
  if (!s || s.length > 2048) return null
  try {
    const u = new URL(s)
    if (u.protocol === 'https:') return s
    const host = (u.hostname || '').toLowerCase()
    const isLocal =
      host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2'
    const pathOk = u.pathname.startsWith('/uploads/notification-campaigns/')
    if (isLocal && u.protocol === 'http:' && pathOk) return s
    return null
  } catch {
    return null
  }
}

const sendAdminNotification = async ({
  userIds,
  title,
  body,
  priority = 'normal',
  imageUrl = null,
  campaignType = 'notice',
  deepLink = null,
  audienceSegment = 'all',
  accountStatusFilter = 'active',
  identityVerifiedOnly = false,
} = {}) => {
  const cleanTitle = String(title || '').trim()
  const cleanBody = String(body || '').trim()

  if (!cleanTitle || !cleanBody) {
    const err = new Error('Title and body are required')
    err.statusCode = 400
    throw err
  }

  const ct = String(campaignType || 'notice').toLowerCase()
  if (!ADMIN_CAMPAIGN_TYPES.includes(ct)) {
    const err = new Error(`Invalid campaignType. Use one of: ${ADMIN_CAMPAIGN_TYPES.join(', ')}`)
    err.statusCode = 400
    throw err
  }

  const img = normalizeHttpsImageUrl(imageUrl)
  const link = deepLink != null ? String(deepLink).trim().slice(0, 500) : ''

  const ids = Array.isArray(userIds) ? userIds.filter(Boolean) : []
  const uniqueIds = [...new Set(ids.map((id) => String(id)))]

  const UserModel = require('../models/User')
  const DeviceToken = require('../models/DeviceToken')
  let autoAttachedCount = 0
  for (const uid of uniqueIds) {
    const activeCount = await DeviceToken.countDocuments({ userId: uid, isActive: true })
    if (activeCount === 0) {
      try {
        await module.exports.claimLatestUnassignedToken({ userId: uid })
        autoAttachedCount += 1
      } catch (_) {}
    }
  }

  const data = {
    type: 'ADMIN_BROADCAST',
    campaignType: ct,
    ...(img ? { imageUrl: img } : {}),
    ...(link ? { deepLink: link } : {}),
  }

  const payload = {
    title: cleanTitle,
    body: cleanBody,
    data,
    priority: String(priority).toLowerCase() === 'high' ? 'high' : 'normal',
    imageUrl: img,
  }

  const resolveBroadcastUserQuery = () => {
    const q = { isDeleted: false, isAdmin: { $ne: true } }
    const asf = String(accountStatusFilter || 'active').toLowerCase()
    if (asf === 'active') q.accountStatus = 'active'
    const seg = String(audienceSegment || 'all').toLowerCase()
    if (seg === 'volunteers') q.isAvailable = true
    if (seg === 'community') q.isAvailable = false
    if (identityVerifiedOnly === true) q.isIdentityVerified = true
    return q
  }

  if (!uniqueIds.length) {
    const { notifyMultipleUsers } = require('./notification.service')
    const userQuery = resolveBroadcastUserQuery()
    const users = await UserModel.find(userQuery).select('_id').lean()
    const allIds = users.map((u) => u._id)
    const result = await notifyMultipleUsers(allIds, payload)
    return {
      mode: 'broadcast',
      targetedUserCount: allIds.length,
      tokensFound: result?.tokensFound ?? 0,
      successCount: result?.successCount ?? 0,
      failureCount: result?.failureCount ?? 0,
      invalidatedCount: result?.invalidatedCount ?? 0,
      errorCode: result?.firstErrorCode || null,
      errorMessage: result?.firstErrorMessage || null,
      campaignType: ct,
      audienceSegment: String(audienceSegment || 'all'),
      accountStatusFilter: String(accountStatusFilter || 'active'),
      identityVerifiedOnly: Boolean(identityVerifiedOnly),
    }
  }

  const { notifyMultipleUsers } = require('./notification.service')
  const result = await notifyMultipleUsers(uniqueIds, payload)
  return {
    mode: 'selected_users',
    targetedUserCount: uniqueIds.length,
    tokensFound: result?.tokensFound ?? 0,
    successCount: result?.successCount ?? 0,
    failureCount: result?.failureCount ?? 0,
    autoAttachedCount,
    invalidatedCount: result?.invalidatedCount ?? 0,
    errorCode: result?.firstErrorCode || null,
    errorMessage: result?.firstErrorMessage || null,
    campaignType: ct,
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

const getRequestAttempts = async ({
  page = 1,
  limit = 50,
  requestKind,
  outcome,
  requesterId,
} = {}) => {
  const RequestAttempt = require('../models/RequestAttempt')
  const query = {}
  if (requestKind) query.requestKind = String(requestKind)
  if (outcome) query.outcome = String(outcome)
  if (requesterId) query.requesterId = String(requesterId)

  const skip = (Number(page) - 1) * Number(limit)
  const [items, total] = await Promise.all([
    RequestAttempt.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('requesterId', 'fullName phone'),
    RequestAttempt.countDocuments(query),
  ])

  return {
    items,
    total,
    page: Number(page),
    limit: Number(limit),
  }
}

const getHelpRequests = async ({
  page = 1,
  limit = 20,
  status,
  category,
  from,
  to,
  q,
  requesterId,
  helperId,
} = {}) => {
  const HelpMatch = require('../models/HelpMatch')

  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const safePage = Math.max(1, Number(page) || 1)
  const skip = (safePage - 1) * safeLimit

  const query = {}

  if (status) {
    query.status = String(status).toLowerCase()
  }

  if (category) {
    query.category = String(category).toLowerCase()
  }

  if (requesterId && isObjectIdLike(requesterId)) {
    query.requesterId = String(requesterId)
  }

  const cleanFrom = from ? new Date(from) : null
  const cleanTo = to ? new Date(to) : null
  if (cleanFrom && !Number.isNaN(cleanFrom.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $gte: cleanFrom }
  }
  if (cleanTo && !Number.isNaN(cleanTo.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $lte: cleanTo }
  }

  const search = String(q || '').trim()
  if (search) {
    if (isObjectIdLike(search)) {
      query._id = search
    } else {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(escaped, 'i')
      const or = [{ description: re }]
      const userMatches = await User.find({
        isDeleted: false,
        isAdmin: { $ne: true },
        $or: [
          { fullName: re },
          { phone: re },
        ],
      })
        .select('_id')
        .limit(50)
        .lean()
      if (userMatches.length > 0) {
        or.push({ requesterId: { $in: userMatches.map((u) => u._id) } })
      }
      query.$or = or
    }
  }

  if (helperId && isObjectIdLike(helperId)) {
    const matched = await HelpMatch.find({
      helperId: String(helperId),
    })
      .select('requestId')
      .limit(500)
      .lean()
    const ids = matched.map((m) => m.requestId)
    query._id = query._id ? query._id : { $in: ids.length ? ids : [] }
  }

  const [items, total] = await Promise.all([
    HelpRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('requesterId', 'fullName phone accountStatus')
      .lean(),
    HelpRequest.countDocuments(query),
  ])

  const requestIds = items.map((r) => r._id)
  const acceptedMatches = await HelpMatch.find({
    requestId: { $in: requestIds },
    status: 'accepted',
  })
    .populate('helperId', 'fullName phone accountStatus')
    .select('requestId helperId status acceptedAt respondedAt createdAt')
    .lean()

  const acceptedMap = new Map()
  for (const m of acceptedMatches) {
    acceptedMap.set(String(m.requestId), m)
  }

  const mapped = items.map((r) => {
    const coords = r?.location?.coordinates || []
    const lng = coords[0]
    const lat = coords[1]
    const accepted = acceptedMap.get(String(r._id)) || null
    return {
      id: r._id,
      createdAt: r.createdAt,
      status: r.status,
      category: r.category,
      description: r.description,
      requester: r.requesterId
        ? {
            id: r.requesterId._id,
            fullName: r.requesterId.fullName,
            phone: r.requesterId.phone,
            accountStatus: r.requesterId.accountStatus,
          }
        : null,
      acceptedHelper: accepted?.helperId
        ? {
            id: accepted.helperId._id,
            fullName: accepted.helperId.fullName,
            phone: accepted.helperId.phone,
            accountStatus: accepted.helperId.accountStatus,
          }
        : null,
      location: {
        address: r?.location?.address || null,
        whereToFindText: r?.location?.whereToFindText || null,
        coordinatesApprox: [
          roundCoord(lng, 3),
          roundCoord(lat, 3),
        ],
      },
    }
  })

  return { items: mapped, total, page: safePage, limit: safeLimit }
}

const getHelpRequestDetails = async (id) => {
  const HelpMatch = require('../models/HelpMatch')
  const ClosureStatus = require('../models/ClosureStatus')

  if (!id || !isObjectIdLike(id)) {
    const err = new Error('Invalid request id')
    err.statusCode = 400
    throw err
  }

  const requestRaw = await HelpRequest.findById(id)
    .populate('requesterId', 'fullName phone profileImage accountStatus isAvailable createdAt')
    .lean()

  if (!requestRaw) {
    const err = new Error('Help request not found')
    err.statusCode = 404
    throw err
  }

  const request = await hydrateHelpRequestCategoryDisplay(requestRaw)

  const matches = await HelpMatch.find({ requestId: id })
    .sort({ createdAt: -1 })
    .populate('helperId', 'fullName phone profileImage accountStatus isAvailable createdAt')
    .lean()

  const closure = await ClosureStatus.find({ requestId: id })
    .sort({ createdAt: -1 })
    .populate('requesterId', 'fullName phone accountStatus')
    .populate('helperId', 'fullName phone accountStatus')
    .lean()

  const coords = request?.location?.coordinates || []
  const lng = coords[0]
  const lat = coords[1]

  const reqSafe = {
    ...request,
    location: {
      ...request.location,
      coordinatesApprox: [roundCoord(lng, 3), roundCoord(lat, 3)],
      coordinates: undefined,
    },
  }

  const chatActivity = await loadAdminChatActivity(id, 'HelpRequest')
  const activityTimeline = buildHelpActivityTimeline({
    request: reqSafe,
    matches,
    closures: closure,
    chat: chatActivity,
  })

  const matchSummary = {
    total: matches.length,
    accepted: matches.filter((m) => m.status === 'accepted').length,
    declined: matches.filter((m) => m.status === 'declined').length,
    notAvailable: matches.filter((m) => m.status === 'not_available').length,
    pendingOrNotified: matches.filter((m) =>
      ['pending', 'notified'].includes(m.status)
    ).length,
    viewedCount: matches.filter((m) => m.viewedAt).length,
  }

  return {
    request: reqSafe,
    matches,
    closure,
    chatActivity,
    activityTimeline,
    matchSummary,
  }
}

const getPresenceRequests = async ({
  page = 1,
  limit = 20,
  status,
  situationType,
  from,
  to,
  requesterId,
} = {}) => {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const safePage = Math.max(1, Number(page) || 1)
  const skip = (safePage - 1) * safeLimit

  const query = {}
  if (status) query.status = String(status).toLowerCase()
  if (situationType) query.situationType = String(situationType).toLowerCase()
  if (requesterId && isObjectIdLike(requesterId)) query.requesterId = String(requesterId)

  const cleanFrom = from ? new Date(from) : null
  const cleanTo = to ? new Date(to) : null
  if (cleanFrom && !Number.isNaN(cleanFrom.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $gte: cleanFrom }
  }
  if (cleanTo && !Number.isNaN(cleanTo.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $lte: cleanTo }
  }

  const [items, total] = await Promise.all([
    PresenceRequest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('requesterId', 'fullName phone accountStatus')
      .lean(),
    PresenceRequest.countDocuments(query),
  ])

  const mapped = items.map((r) => {
    const coords = r?.location?.coordinates || []
    const lng = coords[0]
    const lat = coords[1]
    return {
      id: r._id,
      createdAt: r.createdAt,
      status: r.status,
      situationType: r.situationType,
      description: r.description,
      requester: r.requesterId
        ? { id: r.requesterId._id, fullName: r.requesterId.fullName, phone: r.requesterId.phone, accountStatus: r.requesterId.accountStatus }
        : null,
      totals: {
        totalNotified: r.totalNotified || 0,
        totalAccepted: r.totalAccepted || 0,
      },
      location: {
        address: r?.location?.address || null,
        coordinatesApprox: [roundCoord(lng, 3), roundCoord(lat, 3)],
      },
    }
  })

  return { items: mapped, total, page: safePage, limit: safeLimit }
}

const getPresenceRequestDetails = async (id) => {
  const PresenceMatch = require('../models/PresenceMatch')

  if (!id || !isObjectIdLike(id)) {
    const err = new Error('Invalid presence id')
    err.statusCode = 400
    throw err
  }

  const request = await PresenceRequest.findById(id)
    .populate('requesterId', 'fullName phone profileImage accountStatus isAvailable createdAt isIdentityVerified')
    .lean()

  if (!request) {
    const err = new Error('Presence request not found')
    err.statusCode = 404
    throw err
  }

  const presenceMatches = await PresenceMatch.find({ presenceRequestId: id })
    .sort({ createdAt: 1 })
    .populate('helperId', 'fullName phone profileImage accountStatus')
    .lean()

  const coords = request?.location?.coordinates || []
  const lng = coords[0]
  const lat = coords[1]

  const reqSafe = {
    ...request,
    location: {
      ...request.location,
      coordinatesApprox: [roundCoord(lng, 3), roundCoord(lat, 3)],
      coordinates: undefined,
    },
  }

  const chatActivity = await loadAdminChatActivity(id, 'PresenceRequest')
  const activityTimeline = buildPresenceActivityTimeline({
    request: reqSafe,
    presenceMatches,
    chat: chatActivity,
  })

  const responderSummary = {
    total: presenceMatches.length,
    accepted: presenceMatches.filter((m) => m.status === 'accepted').length,
    declined: presenceMatches.filter((m) => m.status === 'declined').length,
    notResponded: presenceMatches.filter((m) => m.status === 'not_responded').length,
    alerted: presenceMatches.filter((m) => m.status === 'alerted').length,
    closed: presenceMatches.filter((m) => m.status === 'closed').length,
  }

  return {
    request: reqSafe,
    presenceMatches,
    chatActivity,
    activityTimeline,
    responderSummary,
  }
}

const getClosures = async ({ page = 1, limit = 20, status, from, to, requesterId, helperId } = {}) => {
  const ClosureStatus = require('../models/ClosureStatus')

  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const safePage = Math.max(1, Number(page) || 1)
  const skip = (safePage - 1) * safeLimit

  const query = {}
  if (status) query.status = String(status).toLowerCase()
  if (requesterId && isObjectIdLike(requesterId)) query.requesterId = String(requesterId)
  if (helperId && isObjectIdLike(helperId)) query.helperId = String(helperId)

  const cleanFrom = from ? new Date(from) : null
  const cleanTo = to ? new Date(to) : null
  if (cleanFrom && !Number.isNaN(cleanFrom.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $gte: cleanFrom }
  }
  if (cleanTo && !Number.isNaN(cleanTo.getTime())) {
    query.createdAt = { ...(query.createdAt || {}), $lte: cleanTo }
  }

  const [items, total] = await Promise.all([
    ClosureStatus.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('requestId', 'category description status createdAt')
      .populate('requesterId', 'fullName phone accountStatus')
      .populate('helperId', 'fullName phone accountStatus')
      .lean(),
    ClosureStatus.countDocuments(query),
  ])

  const mapped = items.map((c) => ({
    id: c._id,
    status: c.status,
    createdAt: c.createdAt,
    request: c.requestId
      ? { id: c.requestId._id, category: c.requestId.category, description: c.requestId.description, status: c.requestId.status, createdAt: c.requestId.createdAt }
      : null,
    requester: c.requesterId ? { id: c.requesterId._id, fullName: c.requesterId.fullName, phone: c.requesterId.phone } : null,
    helper: c.helperId ? { id: c.helperId._id, fullName: c.helperId.fullName, phone: c.helperId.phone } : null,
    flags: c.flags || {},
    ghostingDeadlineAt: c.ghostingDeadlineAt || null,
    closedAt: c.closedAt || null,
  }))

  return { items: mapped, total, page: safePage, limit: safeLimit }
}

const getClosureDetails = async (id) => {
  const ClosureStatus = require('../models/ClosureStatus')

  if (!id || !isObjectIdLike(id)) {
    const err = new Error('Invalid closure id')
    err.statusCode = 400
    throw err
  }

  const closure = await ClosureStatus.findById(id)
    .populate('requestId', 'category description status createdAt')
    .populate('requesterId', 'fullName phone accountStatus')
    .populate('helperId', 'fullName phone accountStatus')
    .lean()

  if (!closure) {
    const err = new Error('Closure not found')
    err.statusCode = 404
    throw err
  }

  return closure
}

const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    planKey: 'free',
    name: 'Basic / Free',
    description: 'Essential safety features for everyone.',
    priceAmount: 0,
    currency: 'INR',
    billingPeriod: 'forever',
    sortOrder: 0,
    features: [
      { key: 'live_awareness', name: 'Live Awareness', enabled: true, limit: null },
      { key: 'emergency_contacts', name: 'Emergency Contacts', enabled: true, limit: '3 contacts' },
      { key: 'incident_history', name: 'Incident History', enabled: true, limit: '7 days' },
      { key: 'realtime_alerts', name: 'Real-time Alerts', enabled: true, limit: null },
      { key: 'offline_mode', name: 'Offline Mode', enabled: false, limit: null },
      { key: 'family_group', name: 'Family Group', enabled: false, limit: null },
    ],
  },
  {
    planKey: 'premium',
    name: 'Socius Premium',
    description: 'Advanced protection and unlimited history.',
    priceAmount: 499,
    currency: 'INR',
    billingPeriod: 'month',
    sortOrder: 1,
    features: [
      { key: 'live_awareness', name: 'Live Awareness', enabled: true, limit: null },
      { key: 'emergency_contacts', name: 'Emergency Contacts', enabled: true, limit: 'Unlimited' },
      { key: 'incident_history', name: 'Incident History', enabled: true, limit: 'Unlimited' },
      { key: 'realtime_alerts', name: 'Real-time Alerts', enabled: true, limit: null },
      { key: 'offline_mode', name: 'Offline Mode', enabled: true, limit: null },
      { key: 'family_group', name: 'Family Group', enabled: false, limit: null },
    ],
  },
  {
    planKey: 'family',
    name: 'Family Plan',
    description: 'Complete safety for the whole family.',
    priceAmount: 1299,
    currency: 'INR',
    billingPeriod: 'month',
    sortOrder: 2,
    features: [
      { key: 'live_awareness', name: 'Live Awareness', enabled: true, limit: null },
      { key: 'emergency_contacts', name: 'Emergency Contacts', enabled: true, limit: 'Unlimited' },
      { key: 'incident_history', name: 'Incident History', enabled: true, limit: 'Unlimited' },
      { key: 'realtime_alerts', name: 'Real-time Alerts', enabled: true, limit: null },
      { key: 'offline_mode', name: 'Offline Mode', enabled: true, limit: null },
      { key: 'family_group', name: 'Family Group', enabled: true, limit: 'Up to 6 members' },
    ],
  },
]

const ensureDefaultSubscriptionPlans = async () => {
  const SubscriptionPlan = require('../models/SubscriptionPlan')
  const count = await SubscriptionPlan.countDocuments()
  if (count === 0) {
    await SubscriptionPlan.insertMany(DEFAULT_SUBSCRIPTION_PLANS)
  }
}

const formatSubscriptionPlan = (doc) => {
  if (!doc) return null
  const p = doc.toObject ? doc.toObject() : doc
  return {
    planKey: p.planKey,
    id: p.planKey,
    name: p.name,
    description: p.description || '',
    priceAmount: typeof p.priceAmount === 'number' ? p.priceAmount : 0,
    price: String(p.priceAmount ?? 0),
    currency: p.currency || 'INR',
    billingPeriod: p.billingPeriod,
    period:
      p.billingPeriod === 'forever'
        ? 'forever'
        : p.billingPeriod === 'year'
          ? 'year'
          : 'month',
    features: Array.isArray(p.features)
      ? p.features.map((f) => ({
          key: f.key || '',
          name: f.name,
          enabled: f.enabled !== false,
          limit: f.limit != null ? String(f.limit) : null,
          included: f.enabled !== false,
        }))
      : [],
    updatedAt: p.updatedAt,
  }
}

const getSubscriptionPlansForAdmin = async () => {
  const SubscriptionPlan = require('../models/SubscriptionPlan')
  await ensureDefaultSubscriptionPlans()
  const list = await SubscriptionPlan.find({}).sort({ sortOrder: 1 }).lean()
  return list.map((p) => formatSubscriptionPlan(p))
}

const updateSubscriptionPlanByKey = async (planKey, body = {}, adminId) => {
  const SubscriptionPlan = require('../models/SubscriptionPlan')
  const key = String(planKey || '').toLowerCase().trim()
  if (!['free', 'premium', 'family'].includes(key)) {
    const err = new Error('Invalid plan key')
    err.statusCode = 400
    throw err
  }

  await ensureDefaultSubscriptionPlans()
  const plan = await SubscriptionPlan.findOne({ planKey: key })
  if (!plan) {
    const err = new Error('Plan not found')
    err.statusCode = 404
    throw err
  }

  const { name, description, priceAmount, billingPeriod, features } = body

  if (name != null) plan.name = String(name).trim().slice(0, 120)
  if (description != null) plan.description = String(description).slice(0, 2000)
  if (priceAmount != null) {
    const n = Number(priceAmount)
    if (!Number.isFinite(n) || n < 0) {
      const err = new Error('priceAmount must be a non-negative number')
      err.statusCode = 400
      throw err
    }
    plan.priceAmount = n
  }
  if (billingPeriod != null) {
    const bp = String(billingPeriod).toLowerCase()
    if (!['forever', 'month', 'year'].includes(bp)) {
      const err = new Error('billingPeriod must be forever, month, or year')
      err.statusCode = 400
      throw err
    }
    plan.billingPeriod = bp
  }

  if (features != null) {
    if (!Array.isArray(features)) {
      const err = new Error('features must be an array')
      err.statusCode = 400
      throw err
    }
    plan.features = features.map((f) => ({
      key: f.key != null ? String(f.key).slice(0, 64) : '',
      name: String(f.name || 'Feature').slice(0, 120),
      enabled: Boolean(f.enabled),
      limit: f.limit != null && String(f.limit).trim() ? String(f.limit).slice(0, 120) : null,
    }))
  }

  plan.updatedBy = adminId || null
  await plan.save()
  return formatSubscriptionPlan(plan)
}

const mapLogLevelLabel = (level) => {
  const l = String(level || '').toLowerCase()
  if (l === 'error') return 'Error'
  if (l === 'warn') return 'Warning'
  if (l === 'debug') return 'Debug'
  return 'Application log'
}

const getAdminAuditLogs = async ({ page = 1, limit = 20, level, search, from, to } = {}) => {
  const Log = require('../models/Log')
  const q = {}
  const lv = String(level || '').toLowerCase()
  if (['info', 'warn', 'error', 'debug'].includes(lv)) q.level = lv

  if (from || to) {
    q.createdAt = {}
    if (from && !Number.isNaN(new Date(from).getTime())) q.createdAt.$gte = new Date(from)
    if (to && !Number.isNaN(new Date(to).getTime())) q.createdAt.$lte = new Date(to)
  }

  if (search && String(search).trim()) {
    const term = escapeRegex(String(search).trim())
    const re = new RegExp(term, 'i')
    q.$or = [{ message: re }, { url: re }, { method: re }]
  }

  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const skip = (safePage - 1) * safeLimit

  const [items, total] = await Promise.all([
    Log.find(q).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    Log.countDocuments(q),
  ])

  const mapped = items.map((row) => {
    const ts = row.createdAt
      ? new Date(row.createdAt).toLocaleString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '—'
    const ref = [row.method, row.url].filter(Boolean).join(' ') || '—'
    const msg = String(row.message || '—')
    return {
      id: String(row._id),
      timestamp: ts,
      logType: mapLogLevelLabel(row.level),
      entity: row.userId ? 'Authenticated request' : 'System / anonymous',
      actionSummary: msg.length > 160 ? `${msg.slice(0, 157)}…` : msg,
      referenceId: ref.length > 100 ? `${ref.slice(0, 97)}…` : ref,
      details: msg,
      relatedId: row.userId ? `user:${String(row.userId)}` : (row.ip || '—'),
      category: mapLogLevelLabel(row.level),
      summary: msg.slice(0, 240),
      level: row.level,
      method: row.method || null,
      url: row.url || null,
      stack: row.stack || null,
      body: row.body != null ? row.body : null,
      ip: row.ip || null,
      userAgent: row.userAgent || null,
      userId: row.userId ? String(row.userId) : null,
    }
  })

  return { items: mapped, total, page: safePage, limit: safeLimit }
}

const listLegalExportRecords = async ({ page = 1, limit = 20 } = {}) => {
  const LegalExportRecord = require('../models/LegalExportRecord')
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20))
  const skip = (safePage - 1) * safeLimit
  const [rows, total] = await Promise.all([
    LegalExportRecord.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('createdBy', 'fullName email')
      .lean(),
    LegalExportRecord.countDocuments({}),
  ])
  const items = rows.map((r) => ({
    id: String(r._id),
    date: r.createdAt
      ? new Date(r.createdAt).toLocaleString(undefined, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—',
    requestedBy: r.createdBy?.fullName || r.createdBy?.email || 'Admin',
    legalBasis: r.legalBasis || '—',
    scope: `${r.rowCount} rows · ${r.anonymized ? 'anonymized' : 'full fields'}`,
    status: r.status === 'completed' ? 'Completed' : 'Failed',
    referenceNumber: r.referenceNumber || '—',
  }))
  return { items, total, page: safePage, limit: safeLimit }
}

const generateLegalExportBundle = async (adminId, body = {}) => {
  const Log = require('../models/Log')
  const LegalExportRecord = require('../models/LegalExportRecord')

  const legalBasis = String(body.legalBasis || '').trim().slice(0, 200)
  const referenceNumber = String(body.referenceNumber || '').trim().slice(0, 200)
  const anonymized = Boolean(body.anonymized)

  const end = body.endDate ? new Date(body.endDate) : new Date()
  const start = body.startDate
    ? new Date(body.startDate)
    : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const err = new Error('Invalid start or end date')
    err.statusCode = 400
    throw err
  }
  if (start > end) {
    const err = new Error('startDate must be before endDate')
    err.statusCode = 400
    throw err
  }

  const maxRangeMs = 31 * 24 * 60 * 60 * 1000
  if (end.getTime() - start.getTime() > maxRangeMs) {
    const err = new Error('Date range cannot exceed 31 days')
    err.statusCode = 400
    throw err
  }

  const MAX_ROWS = 2000
  const logs = await Log.find({
    createdAt: { $gte: start, $lte: end },
  })
    .sort({ createdAt: -1 })
    .limit(MAX_ROWS)
    .lean()

  const payload = logs.map((l) => {
    const base = {
      createdAt: l.createdAt,
      level: l.level,
      message: l.message,
      method: l.method || null,
      url: l.url || null,
    }
    if (anonymized) {
      return {
        ...base,
        userId: l.userId ? '[redacted]' : null,
        ip: l.ip ? '[redacted]' : null,
        userAgent: l.userAgent ? '[redacted]' : null,
        body: null,
        stack: l.stack ? '[redacted]' : null,
      }
    }
    return {
      ...base,
      userId: l.userId || null,
      ip: l.ip || null,
      userAgent: l.userAgent || null,
      body: l.body || null,
      stack: l.stack || null,
    }
  })

  await LegalExportRecord.create({
    createdBy: adminId,
    legalBasis,
    referenceNumber,
    scope: 'application_logs',
    startDate: start,
    endDate: end,
    anonymized,
    rowCount: payload.length,
    status: 'completed',
  })

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      legalBasis,
      referenceNumber,
      anonymized,
      rowCount: payload.length,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      notice:
        'Export contains Socius application logs (errors and captured requests). Mongo TTL deletes log rows after about 7 days.',
    },
    logs: payload,
  }
}

/**
 * Read-only snapshot for admin “System Settings & Safeguards” (constants + safe env hints).
 * Tunables still live in code/env until a persisted PlatformSettings model exists.
 */
const getSystemSafeguardsSnapshot = () => {
  const {
    GEO,
    AUTO_CLOSE,
    OTP,
    COMMUNITY_BALANCE,
    PRESENCE_HELPERS,
  } = require('../utils/constants')

  const fmtMinutesLabel = (m) => {
    const n = Number(m)
    if (!Number.isFinite(n)) return '—'
    if (n >= 60 && n % 60 === 0) {
      const h = n / 60
      return `${h} hr`
    }
    return `${n} min`
  }

  const sameTier = (text) => ({ low: text, medium: text, high: text })

  const presenceHelperSummary = `${PRESENCE_HELPERS.MIN}–${PRESENCE_HELPERS.MAX} per request (default ${PRESENCE_HELPERS.DEFAULT})`

  const riskTierPage = {
    enforcementMode: 'uniform',
    enforcementExplanation:
      'Situations differ by user-facing labels and alarms, but this deployment applies one set of numeric limits (radius, timeouts, helper caps) to every case. There is no separate low/med/high enforcement branch in server code.',
    comparisonRows: [
      { feature: 'Need Presence — helpers notified (cap)', ...sameTier(presenceHelperSummary) },
      { feature: 'Daily Help — default nearby radius', ...sameTier(`${GEO.DEFAULT_RADIUS_METERS} m`) },
      { feature: 'Need Presence — matching radius', ...sameTier(`${GEO.PRESENCE_RADIUS_METERS} m`) },
      { feature: 'Location — maximum search radius cap', ...sameTier(`${GEO.MAX_RADIUS_METERS} m`) },
      {
        feature: 'Daily Help — auto-close while matching',
        ...sameTier(fmtMinutesLabel(AUTO_CLOSE.HELP_REQUEST_MINUTES) + ' idle'),
      },
      {
        feature: 'Daily Help — extension after helper accepts',
        ...sameTier(fmtMinutesLabel(AUTO_CLOSE.HELP_MATCHED_EXTENSION_MINUTES)),
      },
      {
        feature: 'Need Presence — idle auto-close',
        ...sameTier(fmtMinutesLabel(AUTO_CLOSE.PRESENCE_REQUEST_MINUTES)),
      },
      {
        feature: 'Chat — delete window after session ends',
        ...sameTier(`${AUTO_CLOSE.CHAT_DELETE_AFTER_HOURS} hr`),
      },
      { feature: 'OTP — validity', ...sameTier(`${OTP.EXPIRY_MINUTES} min`) },
      { feature: 'OTP — max verify attempts', ...sameTier(String(OTP.MAX_ATTEMPTS)) },
      {
        feature: 'Community balance — nudge threshold (sent − given)',
        ...sameTier(String(COMMUNITY_BALANCE.NUDGE_THRESHOLD)),
      },
      {
        feature: 'Community balance — nudge cooldown',
        ...sameTier(`${COMMUNITY_BALANCE.NUDGE_COOLDOWN_DAYS} days`),
      },
    ],
    nonNegotiableSafeguards: [
      'No assignment of people',
      'No instruction to intervene',
      'No real-time coordination as a service',
      'No public live map of users',
      'Emergency services remain the user’s responsibility to contact when needed.',
    ],
    legalFraming: [
      'Risk-related language exists to limit sharing and nudge safer behaviour.',
      'Socius does not provide emergency response, security services, or enforcement.',
    ],
    changeControl: {
      title: 'Change control',
      lines: [
        'Operational numbers come from socius-backend/src/utils/constants.js (and env for a few flags).',
        'Changes need review, deploy, and where applicable legal sign-off — not edits from this screen.',
      ],
    },
    footerNote: 'Figures above reflect this running deployment. Product copy may still vary by situation type in the apps.',
  }

  return {
    operational: {
      geo: {
        defaultRadiusMeters: GEO.DEFAULT_RADIUS_METERS,
        presenceRadiusMeters: GEO.PRESENCE_RADIUS_METERS,
        maxRadiusMeters: GEO.MAX_RADIUS_METERS,
      },
      autoClose: {
        helpRequestMinutes: AUTO_CLOSE.HELP_REQUEST_MINUTES,
        helpMatchedExtensionMinutes: AUTO_CLOSE.HELP_MATCHED_EXTENSION_MINUTES,
        presenceRequestMinutes: AUTO_CLOSE.PRESENCE_REQUEST_MINUTES,
        chatDeleteAfterHours: AUTO_CLOSE.CHAT_DELETE_AFTER_HOURS,
      },
      otp: {
        expiryMinutes: OTP.EXPIRY_MINUTES,
        length: OTP.LENGTH,
        maxAttempts: OTP.MAX_ATTEMPTS,
        resendAfterSeconds: OTP.RESEND_AFTER_SECONDS,
      },
      communityBalance: {
        nudgeThreshold: COMMUNITY_BALANCE.NUDGE_THRESHOLD,
        nudgeCooldownDays: COMMUNITY_BALANCE.NUDGE_COOLDOWN_DAYS,
      },
      presenceHelpers: {
        min: PRESENCE_HELPERS.MIN,
        max: PRESENCE_HELPERS.MAX,
        default: PRESENCE_HELPERS.DEFAULT,
      },
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      publicOriginConfigured: Boolean(
        String(process.env.PUBLIC_ORIGIN || process.env.SOCIUS_PUBLIC_ORIGIN || '').trim()
      ),
      uploadsRootConfigured: Boolean(String(process.env.UPLOADS_ROOT || '').trim()),
      notificationCampaignImageTtlDays: (() => {
        const n = Number(process.env.NOTIFICATION_CAMPAIGN_IMAGE_TTL_DAYS)
        return Number.isFinite(n) ? Math.min(90, Math.max(1, n)) : 7
      })(),
    },
    productPrinciples: [
      {
        title: 'Awareness and coordination, not dispatch',
        body: 'Socius connects people for calm presence and daily help. It does not dispatch responders or direct interventions.',
      },
      {
        title: 'No enforcement role',
        body: 'The platform does not grant patrol, enforcement, or authority over users. Helpers act only by mutual consent.',
      },
      {
        title: 'Location for matching, not public tracking',
        body: 'Geo is used for nearby matching within configured radii. There is no public live map of users.',
      },
      {
        title: 'Automated lifecycles',
        body: 'Open requests and chats use auto-close and retention rules below so data does not grow without bound.',
      },
    ],
    riskTierPage,
  }
}

module.exports = {
  getPendingVerifications,
  getVerificationDetails,
  getUsers,
  exportUsersCsv,
  getScenarioConfigDraft,
  upsertScenarioConfigDraft,
  adminClosePresenceRequest,
  getUserDetails,
  setAccountStatus,
  getReports,
  updateReportReviewStatus,
  resolveReport,
  getDashboardStats,
  getLiveAwareness,
  getHelpRequests,
  getHelpRequestDetails,
  getPresenceRequests,
  getPresenceRequestDetails,
  getIncidentReview,
  getClosures,
  getClosureDetails,
  sendAdminNotification,
  getDeviceTokenCounts,
  getDeviceTokensForUser,
  attachDeviceTokenToUser,
  claimLatestUnassignedToken,
  getRequestAttempts,
  getSubscriptionPlansForAdmin,
  updateSubscriptionPlanByKey,
  getSystemSafeguardsSnapshot,
  getAdminAuditLogs,
  listLegalExportRecords,
  generateLegalExportBundle,
}
