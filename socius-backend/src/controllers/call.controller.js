const Call = require('../models/Call')
const CallEvent = require('../models/CallEvent')
const { success } = require('../utils/response')

const listMyCalls = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100)
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null
    const status = req.query.status ? String(req.query.status).toLowerCase() : null

    const q = {
      $or: [{ callerId: req.user._id }, { calleeId: req.user._id }],
    }
    if (status) q.status = status
    if (cursor && !Number.isNaN(cursor.getTime())) {
      q.startedAt = { $lt: cursor }
    }

    const calls = await Call.find(q)
      .sort({ startedAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean()

    const hasMore = calls.length > limit
    const items = hasMore ? calls.slice(0, limit) : calls
    const nextCursor = hasMore ? items[items.length - 1]?.startedAt?.toISOString?.() : null

    return success(res, { items, nextCursor })
  } catch (err) {
    next(err)
  }
}

const getCallByKey = async (req, res, next) => {
  try {
    const callKey = String(req.params.callKey || '')
    const call = await Call.findOne({
      callKey,
      $or: [{ callerId: req.user._id }, { calleeId: req.user._id }],
    }).lean()

    if (!call) {
      const e = new Error('Call not found')
      e.statusCode = 404
      throw e
    }

    return success(res, { call })
  } catch (err) {
    next(err)
  }
}

const listCallEvents = async (req, res, next) => {
  try {
    const callKey = String(req.params.callKey || '')
    const call = await Call.findOne({
      callKey,
      $or: [{ callerId: req.user._id }, { calleeId: req.user._id }],
    }).select('_id callKey').lean()

    if (!call) {
      const e = new Error('Call not found')
      e.statusCode = 404
      throw e
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200)
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null

    const q = { callKey }
    if (cursor && !Number.isNaN(cursor.getTime())) {
      q.occurredAt = { $gt: cursor }
    }

    const events = await CallEvent.find(q)
      .sort({ occurredAt: 1, _id: 1 })
      .limit(limit)
      .lean()

    const nextCursor = events.length ? events[events.length - 1].occurredAt.toISOString() : null
    return success(res, { items: events, nextCursor })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listMyCalls,
  getCallByKey,
  listCallEvents,
}

