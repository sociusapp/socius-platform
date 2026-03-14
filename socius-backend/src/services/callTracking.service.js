const mongoose = require('mongoose')
const Call = require('../models/Call')
const CallEvent = require('../models/CallEvent')

const coerceDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}

const computeQualitySummary = (snapshots) => {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return {
      avgRttMs: null,
      maxRttMs: null,
      avgJitterMs: null,
      maxJitterMs: null,
      totalPacketsLost: null,
    }
  }

  const nums = (arr) => arr.filter((n) => typeof n === 'number' && Number.isFinite(n))
  const avg = (arr) => {
    const v = nums(arr)
    if (v.length === 0) return null
    return Math.round(v.reduce((a, b) => a + b, 0) / v.length)
  }
  const max = (arr) => {
    const v = nums(arr)
    if (v.length === 0) return null
    return Math.max(...v)
  }

  const rtts = snapshots.map((s) => s.rttMs)
  const jitters = snapshots.map((s) => s.jitterMs)
  const losses = snapshots.map((s) => s.packetsLost)

  const totalPacketsLost = nums(losses).length ? Math.max(...nums(losses)) : null

  return {
    avgRttMs: avg(rtts),
    maxRttMs: max(rtts),
    avgJitterMs: avg(jitters),
    maxJitterMs: max(jitters),
    totalPacketsLost,
  }
}

const upsertCall = async ({
  callKey,
  callerId,
  calleeId,
  callType = 'p2p_audio',
  status,
  startedAt,
  answeredAt,
  endedAt,
  failureReason,
  meta,
}) => {
  const setOnInsert = {
    callKey,
    callerId,
    calleeId,
    callType,
    startedAt: startedAt || new Date(),
    status: status || 'initiated',
    meta: meta || {},
  }

  const set = {}
  if (status) set.status = status
  if (startedAt) set.startedAt = startedAt
  if (answeredAt) set.answeredAt = answeredAt
  if (endedAt) set.endedAt = endedAt
  if (typeof failureReason === 'string') set.failureReason = failureReason
  if (meta && typeof meta === 'object') set['meta'] = { ...(meta || {}) }

  const call = await Call.findOneAndUpdate(
    { callKey },
    { $setOnInsert: setOnInsert, ...(Object.keys(set).length ? { $set: set } : {}) },
    { new: true, upsert: true }
  )

  return call
}

const touchParticipant = async (callKey, userId, patch) => {
  const call = await Call.findOne({ callKey }).select('_id participants callerId calleeId').lean()
  if (!call) return null

  const exists = (call.participants || []).some((p) => String(p.userId) === String(userId))
  if (!exists) {
    const role =
      String(call.callerId) === String(userId)
        ? 'caller'
        : String(call.calleeId) === String(userId)
          ? 'callee'
          : 'participant'

    await Call.updateOne(
      { callKey },
      {
        $push: {
          participants: {
            userId: new mongoose.Types.ObjectId(String(userId)),
            role,
            joinedAt: patch?.joinedAt || null,
            device: patch?.device || {},
            network: patch?.network || {},
            location: patch?.location || {},
          },
        },
      }
    )
    return call._id
  }

  const set = {}
  if (patch?.joinedAt) set['participants.$.joinedAt'] = patch.joinedAt
  if (patch?.leftAt) set['participants.$.leftAt'] = patch.leftAt
  if (patch?.device) set['participants.$.device'] = patch.device
  if (patch?.network) set['participants.$.network'] = patch.network
  if (patch?.location) set['participants.$.location'] = patch.location

  if (Object.keys(set).length) {
    await Call.updateOne({ callKey, 'participants.userId': userId }, { $set: set })
  }

  return call._id
}

const appendEvent = async ({
  callKey,
  callId,
  eventType,
  fromUserId,
  toUserId,
  occurredAt,
  device,
  network,
  location,
  metrics,
  payload,
}) => {
  const doc = await CallEvent.create({
    callKey,
    callId: callId || null,
    eventType,
    fromUserId: fromUserId || null,
    toUserId: toUserId || null,
    occurredAt: occurredAt || new Date(),
    device: device || {},
    network: network || {},
    location: location || {},
    metrics: metrics || {},
    payload: payload || null,
  })
  return doc
}

const trackFromSocket = async (socketUserId, payload, meta = {}) => {
  const callKey = String(payload?.callId || payload?.callKey || '').trim()
  const peerUserId = payload?.peerUserId ? String(payload.peerUserId) : null
  const direction = String(payload?.direction || '').toLowerCase()
  const eventType = String(payload?.eventType || '').toLowerCase()
  const callType = payload?.callType ? String(payload.callType) : 'p2p_audio'
  const occurredAt = coerceDate(payload?.occurredAt) || new Date()

  if (!callKey || !peerUserId || !eventType) {
    const err = new Error('Invalid tracking payload')
    err.statusCode = 400
    throw err
  }

  const callerId = direction === 'outgoing' ? socketUserId : peerUserId
  const calleeId = direction === 'outgoing' ? peerUserId : socketUserId

  const statusMap = {
    attempt: 'initiated',
    ringing: 'ringing',
    answered: 'answered',
    missed: 'missed',
    rejected: 'rejected',
    ended: 'ended',
    failed: 'failed',
  }

  const normalizedStatus = statusMap[eventType] || null
  const startedAt = normalizedStatus === 'initiated' ? occurredAt : null
  const answeredAt = normalizedStatus === 'answered' ? occurredAt : null
  const endedAt = ['ended', 'missed', 'rejected', 'failed'].includes(normalizedStatus || '') ? occurredAt : null

  const call = await upsertCall({
    callKey,
    callerId,
    calleeId,
    callType,
    status: normalizedStatus || undefined,
    startedAt,
    answeredAt,
    endedAt,
    failureReason: payload?.failureReason ? String(payload.failureReason) : undefined,
    meta: {
      ...(meta || {}),
      requestId: payload?.requestId || null,
      requestType: payload?.requestType || null,
      chatSessionId: payload?.chatSessionId || null,
    },
  })

  await touchParticipant(callKey, socketUserId, {
    joinedAt: startedAt || null,
    device: payload?.device || {},
    network: payload?.network || {},
    location: payload?.location || {},
  })

  if (endedAt) {
    await touchParticipant(callKey, socketUserId, { leftAt: endedAt })
  }

  const event = await appendEvent({
    callKey,
    callId: call._id,
    eventType:
      eventType === 'answered'
        ? 'connected'
        : eventType === 'ringing'
          ? 'info'
          : eventType === 'attempt'
            ? 'attempt'
            : eventType === 'missed'
              ? 'missed'
              : eventType === 'rejected'
                ? 'rejected'
                : eventType === 'ended'
                  ? 'ended'
                  : eventType === 'failed'
                    ? 'failed'
                    : eventType === 'quality'
                      ? 'quality'
                      : 'info',
    fromUserId: socketUserId,
    toUserId: peerUserId,
    occurredAt,
    device: payload?.device || {},
    network: payload?.network || {},
    location: payload?.location || {},
    metrics: payload?.metrics || {},
    payload: payload?.payload || null,
  })

  if (event.eventType === 'quality' && payload?.metrics) {
    const snapshot = {
      at: occurredAt,
      userId: socketUserId,
      rttMs: typeof payload.metrics.rttMs === 'number' ? payload.metrics.rttMs : null,
      jitterMs: typeof payload.metrics.jitterMs === 'number' ? payload.metrics.jitterMs : null,
      packetsLost: typeof payload.metrics.packetsLost === 'number' ? payload.metrics.packetsLost : null,
      bitrateKbps: typeof payload.metrics.bitrateKbps === 'number' ? payload.metrics.bitrateKbps : null,
    }

    await Call.updateOne({ callKey }, { $push: { 'quality.snapshots': snapshot } })
    const updated = await Call.findOne({ callKey }).select('quality.snapshots').lean()
    const summary = computeQualitySummary(updated?.quality?.snapshots || [])
    await Call.updateOne({ callKey }, { $set: { 'quality.summary': summary } })
  }

  if (endedAt) {
    const updated = await Call.findOne({ callKey }).select('startedAt endedAt answeredAt').lean()
    const start = updated?.answeredAt || updated?.startedAt
    const end = updated?.endedAt
    if (start && end) {
      const durationSec = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000))
      await Call.updateOne({ callKey }, { $set: { durationSec } })
    }
  }

  return { call, event }
}

const logSignalRelay = async ({ callKey, fromUserId, toUserId, type, data, occurredAt }) => {
  if (!callKey || !fromUserId || !toUserId) return
  const mapped =
    type === 'offer'
      ? { from: 'offer_sent', to: 'offer_received' }
      : type === 'answer'
        ? { from: 'answer_sent', to: 'answer_received' }
        : type === 'ice'
          ? { from: 'ice_sent', to: 'ice_received' }
          : type === 'end'
            ? { from: 'ended', to: 'ended' }
            : null

  if (!mapped) return

  const call = await upsertCall({
    callKey,
    callerId: fromUserId,
    calleeId: toUserId,
    callType: 'p2p_audio',
    status: type === 'end' ? 'ended' : undefined,
    endedAt: type === 'end' ? occurredAt || new Date() : undefined,
  })

  await appendEvent({
    callKey,
    callId: call._id,
    eventType: mapped.from,
    fromUserId,
    toUserId,
    occurredAt: occurredAt || new Date(),
    payload: data || null,
  })
  await appendEvent({
    callKey,
    callId: call._id,
    eventType: mapped.to,
    fromUserId,
    toUserId,
    occurredAt: occurredAt || new Date(),
    payload: data || null,
  })
}

module.exports = {
  upsertCall,
  appendEvent,
  trackFromSocket,
  logSignalRelay,
}

