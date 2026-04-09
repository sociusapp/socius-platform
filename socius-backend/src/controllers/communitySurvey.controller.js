const mongoose = require('mongoose')
const CommunitySurveyQuestion = require('../models/CommunitySurveyQuestion')
const CommunitySurveyVote = require('../models/CommunitySurveyVote')
const { success, created } = require('../utils/response')

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Admin: list all questions with like/dislike totals */
const listAdmin = async (req, res, next) => {
  try {
    const items = await CommunitySurveyQuestion.find()
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()

    const tallies = await CommunitySurveyVote.aggregate([
      {
        $group: {
          _id: '$questionId',
          likes: { $sum: { $cond: [{ $eq: ['$value', 'like'] }, 1, 0] } },
          dislikes: { $sum: { $cond: [{ $eq: ['$value', 'dislike'] }, 1, 0] } },
        },
      },
    ])
    const tallyMap = new Map(
      tallies.map((t) => [String(t._id), { likes: t.likes || 0, dislikes: t.dislikes || 0 }])
    )

    const merged = items.map((q) => {
      const t = tallyMap.get(String(q._id)) || { likes: 0, dislikes: 0 }
      return { ...q, likeCount: t.likes, dislikeCount: t.dislikes }
    })

    return success(res, { items: merged })
  } catch (e) {
    next(e)
  }
}

/**
 * Admin: paginated vote log with user + location (filter / sort)
 * query: questionId, value (like|dislike), locationSearch, sort, limit
 * sort: date_desc | location_asc | location_desc | vote_asc | vote_desc
 */
const listVotesAdmin = async (req, res, next) => {
  try {
    const match = {}
    const qid = req.query?.questionId
    if (qid && mongoose.isValidObjectId(qid)) {
      match.questionId = new mongoose.Types.ObjectId(String(qid))
    }
    const v = String(req.query?.value || '').toLowerCase()
    if (v === 'like' || v === 'dislike') match.value = v

    const locQ = String(req.query?.locationSearch || '').trim()
    if (locQ) {
      match.locationLabel = new RegExp(escapeRegex(locQ), 'i')
    }

    const sortKey = String(req.query?.sort || 'date_desc').toLowerCase()
    let sortSpec = { updatedAt: -1 }
    if (sortKey === 'location_asc') sortSpec = { locationLabel: 1, updatedAt: -1 }
    else if (sortKey === 'location_desc') sortSpec = { locationLabel: -1, updatedAt: -1 }
    else if (sortKey === 'vote_asc') sortSpec = { value: 1, updatedAt: -1 }
    else if (sortKey === 'vote_desc') sortSpec = { value: -1, updatedAt: -1 }

    const limit = Math.min(500, Math.max(1, parseInt(req.query?.limit, 10) || 200))

    const votes = await CommunitySurveyVote.find(match)
      .sort(sortSpec)
      .limit(limit)
      .populate({
        path: 'userId',
        select: 'fullName phone email cityArea location',
      })
      .populate({
        path: 'questionId',
        select: 'text sortOrder',
      })
      .lean()

    const rows = votes.map((vdoc) => {
      const u = vdoc.userId
      const qu = vdoc.questionId
      const coords = u?.location?.coordinates
      return {
        _id: vdoc._id,
        value: vdoc.value,
        createdAt: vdoc.createdAt,
        updatedAt: vdoc.updatedAt,
        locationLabel: vdoc.locationLabel || null,
        latitude: vdoc.latitude != null ? vdoc.latitude : null,
        longitude: vdoc.longitude != null ? vdoc.longitude : null,
        question: qu
          ? { _id: qu._id, text: qu.text, sortOrder: qu.sortOrder }
          : null,
        user: u
          ? {
              _id: u._id,
              fullName: u.fullName || null,
              phone: u.phone || null,
              email: u.email || null,
              cityArea: u.cityArea || null,
              coordinates:
                Array.isArray(coords) && coords.length >= 2
                  ? { longitude: coords[0], latitude: coords[1] }
                  : null,
            }
          : null,
      }
    })

    return success(res, { items: rows, limit })
  } catch (e) {
    next(e)
  }
}

/** Admin: create */
const createAdmin = async (req, res, next) => {
  try {
    const text = String(req.body?.text || '').trim()
    if (!text) {
      const err = new Error('Question text is required')
      err.statusCode = 400
      throw err
    }
    const sortOrder = Number.isFinite(Number(req.body?.sortOrder))
      ? Number(req.body.sortOrder)
      : (await CommunitySurveyQuestion.countDocuments())
    const isActive =
      typeof req.body?.isActive === 'boolean' ? req.body.isActive : true

    const q = await CommunitySurveyQuestion.create({ text, sortOrder, isActive })
    return created(res, { item: q.toObject() }, 'Question created')
  } catch (e) {
    next(e)
  }
}

/** Admin: update */
const updateAdmin = async (req, res, next) => {
  try {
    const id = req.params.id
    if (!mongoose.isValidObjectId(id)) {
      const err = new Error('Invalid id')
      err.statusCode = 400
      throw err
    }
    const q = await CommunitySurveyQuestion.findById(id)
    if (!q) {
      const err = new Error('Question not found')
      err.statusCode = 404
      throw err
    }
    if (typeof req.body?.text === 'string') {
      const t = req.body.text.trim()
      if (!t) {
        const err = new Error('Question text cannot be empty')
        err.statusCode = 400
        throw err
      }
      q.text = t.slice(0, 500)
    }
    if (req.body?.sortOrder !== undefined) {
      q.sortOrder = Number.isFinite(Number(req.body.sortOrder))
        ? Number(req.body.sortOrder)
        : q.sortOrder
    }
    if (typeof req.body?.isActive === 'boolean') q.isActive = req.body.isActive
    await q.save()
    return success(res, { item: q.toObject() }, 'Updated')
  } catch (e) {
    next(e)
  }
}

/** Admin: delete + votes */
const deleteAdmin = async (req, res, next) => {
  try {
    const id = req.params.id
    if (!mongoose.isValidObjectId(id)) {
      const err = new Error('Invalid id')
      err.statusCode = 400
      throw err
    }
    const q = await CommunitySurveyQuestion.findById(id)
    if (!q) {
      const err = new Error('Question not found')
      err.statusCode = 404
      throw err
    }
    await CommunitySurveyVote.deleteMany({ questionId: q._id })
    await CommunitySurveyQuestion.deleteOne({ _id: q._id })
    return success(res, { deleted: true })
  } catch (e) {
    next(e)
  }
}

/** Mobile: active questions + tallies + current user's vote */
const listForUser = async (req, res, next) => {
  try {
    const userId = req.user._id
    const questions = await CommunitySurveyQuestion.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()

    if (questions.length === 0) {
      return success(res, { items: [] })
    }

    const qIds = questions.map((q) => q._id)

    const tallies = await CommunitySurveyVote.aggregate([
      { $match: { questionId: { $in: qIds } } },
      {
        $group: {
          _id: '$questionId',
          likes: { $sum: { $cond: [{ $eq: ['$value', 'like'] }, 1, 0] } },
          dislikes: { $sum: { $cond: [{ $eq: ['$value', 'dislike'] }, 1, 0] } },
        },
      },
    ])
    const tallyMap = new Map(tallies.map((t) => [String(t._id), { likes: t.likes, dislikes: t.dislikes }]))

    const myVotes = await CommunitySurveyVote.find({
      userId,
      questionId: { $in: qIds },
    })
      .select('questionId value')
      .lean()
    const myMap = new Map(myVotes.map((v) => [String(v.questionId), v.value]))

    const items = questions.map((q) => {
      const key = String(q._id)
      const t = tallyMap.get(key) || { likes: 0, dislikes: 0 }
      return {
        _id: q._id,
        text: q.text,
        sortOrder: q.sortOrder,
        likeCount: t.likes,
        dislikeCount: t.dislikes,
        myVote: myMap.get(key) || null,
      }
    })

    return success(res, { items })
  } catch (e) {
    next(e)
  }
}

/** Mobile: cast / change vote */
const vote = async (req, res, next) => {
  try {
    const userId = req.user._id
    const questionId = req.body?.questionId
    const value = String(req.body?.value || '').toLowerCase()

    if (!mongoose.isValidObjectId(questionId)) {
      const err = new Error('Invalid questionId')
      err.statusCode = 400
      throw err
    }
    if (!['like', 'dislike'].includes(value)) {
      const err = new Error('value must be like or dislike')
      err.statusCode = 400
      throw err
    }

    const question = await CommunitySurveyQuestion.findOne({
      _id: questionId,
      isActive: true,
    }).select('_id')
    if (!question) {
      const err = new Error('Question not found')
      err.statusCode = 404
      throw err
    }

    let locationLabel = null
    if (typeof req.body?.locationLabel === 'string' && req.body.locationLabel.trim()) {
      locationLabel = req.body.locationLabel.trim().slice(0, 280)
    }
    let latitude = null
    let longitude = null
    if (req.body?.latitude != null && req.body?.longitude != null) {
      const lat = Number(req.body.latitude)
      const lng = Number(req.body.longitude)
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        latitude = lat
        longitude = lng
      }
    }

    const setDoc = { value }
    if (locationLabel) setDoc.locationLabel = locationLabel
    if (latitude != null) {
      setDoc.latitude = latitude
      setDoc.longitude = longitude
    }

    await CommunitySurveyVote.findOneAndUpdate(
      { userId, questionId },
      { $set: setDoc },
      { upsert: true, new: true }
    )

    const [agg] = await CommunitySurveyVote.aggregate([
      { $match: { questionId: new mongoose.Types.ObjectId(String(questionId)) } },
      {
        $group: {
          _id: null,
          likes: { $sum: { $cond: [{ $eq: ['$value', 'like'] }, 1, 0] } },
          dislikes: { $sum: { $cond: [{ $eq: ['$value', 'dislike'] }, 1, 0] } },
        },
      },
    ])

    const likes = agg?.likes || 0
    const dislikes = agg?.dislikes || 0

    return success(res, {
      questionId,
      myVote: value,
      likeCount: likes,
      dislikeCount: dislikes,
    })
  } catch (e) {
    next(e)
  }
}

module.exports = {
  listAdmin,
  listVotesAdmin,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  listForUser,
  vote,
}
