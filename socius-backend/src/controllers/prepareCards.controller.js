const mongoose = require('mongoose')
const PrepareCard = require('../models/PrepareCard')
const { success, created } = require('../utils/response')
const { persistLocalUpload } = require('../services/mediaStorage.service')

const getRequestBaseUrl = (req) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http'
  const host = req.get('host') || ''
  return host ? `${proto}://${host}` : ''
}

const toImageUrl = (req, imagePath) => {
  const p = String(imagePath || '').trim()
  if (!p) return ''
  if (/^https?:\/\//i.test(p)) return p
  const rel = p.startsWith('/') ? p : `/${p}`
  return `${getRequestBaseUrl(req)}${rel}`
}

const toPublic = (doc, req) => ({
  id: doc.prepareId,
  title: doc.title,
  description: doc.description,
  image_url: toImageUrl(req, doc.image),
  position: doc.position,
  is_active: !!doc.isActive,
  content: doc.content || '',
})

const toAdmin = (doc, req) => ({
  _id: doc._id,
  id: doc.prepareId,
  prepareId: doc.prepareId,
  title: doc.title,
  description: doc.description,
  image: doc.image || '',
  image_url: toImageUrl(req, doc.image),
  position: doc.position,
  is_active: !!doc.isActive,
  content: doc.content || '',
  updatedAt: doc.updatedAt,
  createdAt: doc.createdAt,
})

const LEGACY_SEED = [
  { prepareId: 1, title: 'When to ask for presence', description: "Early signs that it's okay to share awareness.", position: 0 },
  { prepareId: 2, title: 'When not to use Socius', description: 'Situations better handled by authorities or trusted contacts.', position: 1 },
  { prepareId: 3, title: 'Staying safe while helping', description: 'Boundaries, distance, and personal safety.', position: 2 },
  { prepareId: 4, title: 'De-escalation basics', description: 'How calm presence can reduce tension.', position: 3 },
  { prepareId: 5, title: 'Emergency first steps', description: 'What to do before professional help arrives.', position: 4 },
]

async function ensureSeeded() {
  const count = await PrepareCard.countDocuments()
  if (count > 0) return
  await PrepareCard.insertMany(
    LEGACY_SEED.map((r) => ({
      ...r,
      image: '',
      isActive: true,
      content: '',
    }))
  )
}

/** Migrate old numericId / sortOrder / icon schema (raw Mongo docs) */
async function migrateLegacyIfNeeded() {
  const coll = PrepareCard.collection
  const n = await coll.countDocuments({ numericId: { $exists: true } })
  if (!n) return
  const docs = await coll.find({ numericId: { $exists: true } }).toArray()
  for (const raw of docs) {
    const $set = {}
    if (raw.prepareId == null && raw.numericId != null) $set.prepareId = raw.numericId
    if (raw.position == null && raw.sortOrder != null) $set.position = raw.sortOrder
    else if (raw.position == null && raw.numericId != null) $set.position = Math.max(0, raw.numericId - 1)
    if (!raw.image && raw.icon && String(raw.icon).startsWith('/')) $set.image = String(raw.icon)
    const $unset = { numericId: '', sortOrder: '', icon: '' }
    await coll.updateOne({ _id: raw._id }, { $set, $unset })
  }
}

async function nextPrepareId() {
  const max = await PrepareCard.findOne().sort({ prepareId: -1 }).select('prepareId').lean()
  return (max?.prepareId || 0) + 1
}

async function nextPosition() {
  const max = await PrepareCard.findOne().sort({ position: -1 }).select('position').lean()
  return (max?.position ?? -1) + 1
}

async function normalizePositionsSequential() {
  const docs = await PrepareCard.find().sort({ position: 1, prepareId: 1 }).select('_id').lean()
  for (let i = 0; i < docs.length; i++) {
    await PrepareCard.updateOne({ _id: docs[i]._id }, { $set: { position: i } })
  }
}

const listPublic = async (req, res, next) => {
  try {
    await ensureSeeded()
    await migrateLegacyIfNeeded()
    const docs = await PrepareCard.find({ isActive: true }).sort({ position: 1, prepareId: 1 }).lean()
    res.json(docs.map((d) => toPublic(d, req)))
  } catch (err) {
    next(err)
  }
}

const getByPrepareId = async (req, res, next) => {
  try {
    await ensureSeeded()
    await migrateLegacyIfNeeded()
    const raw = String(req.params.id || '').trim()
    let doc = null
    if (mongoose.Types.ObjectId.isValid(raw) && String(new mongoose.Types.ObjectId(raw)) === raw) {
      doc = await PrepareCard.findOne({ _id: raw, isActive: true }).lean()
    }
    if (!doc) {
      const id = Number(raw)
      if (!Number.isFinite(id)) {
        const err = new Error('Invalid id')
        err.statusCode = 400
        throw err
      }
      doc = await PrepareCard.findOne({ prepareId: id, isActive: true }).lean()
    }
    if (!doc) {
      const err = new Error('Not found')
      err.statusCode = 404
      throw err
    }
    res.json(toPublic(doc, req))
  } catch (err) {
    next(err)
  }
}

const listAdmin = async (req, res, next) => {
  try {
    await ensureSeeded()
    await migrateLegacyIfNeeded()
    const items = await PrepareCard.find().sort({ position: 1, prepareId: 1 }).lean()
    return success(res, { items: items.map((d) => toAdmin(d, req)) })
  } catch (err) {
    next(err)
  }
}

const getAdminById = async (req, res, next) => {
  try {
    await ensureSeeded()
    await migrateLegacyIfNeeded()
    const id = String(req.params.id || '').trim()
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid card id')
      err.statusCode = 400
      throw err
    }
    const doc = await PrepareCard.findById(id).lean()
    if (!doc) {
      const err = new Error('Not found')
      err.statusCode = 404
      throw err
    }
    return success(res, { item: toAdmin(doc, req) })
  } catch (err) {
    next(err)
  }
}

const createAdmin = async (req, res, next) => {
  try {
    await ensureSeeded()
    await migrateLegacyIfNeeded()
    const title = String(req.body?.title || '').trim()
    const description = String(req.body?.description || '').trim()
    if (!title) {
      const err = new Error('title is required')
      err.statusCode = 400
      throw err
    }
    if (!description) {
      const err = new Error('description is required')
      err.statusCode = 400
      throw err
    }
    if (!req.file?.path) {
      const ct = String(req.headers['content-type'] || '')
      const hint =
        ct.includes('application/json') && !ct.includes('multipart')
          ? ' Send the request as multipart/form-data with field name "image" (JPG, PNG, WebP).'
          : ' Use field name "image" with a JPG, PNG, or WebP file (max 3MB).'
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[prepare-cards create] missing file', {
          contentType: ct || '(none)',
          bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
        })
      }
      const err = new Error(`image is required.${hint}`)
      err.statusCode = 400
      throw err
    }
    const prepareId = await nextPrepareId()
    const position = await nextPosition()
    const image = await persistLocalUpload(req.file.path, { contentType: req.file.mimetype })
    const doc = await PrepareCard.create({
      prepareId,
      title,
      description,
      image,
      position,
      isActive: req.body?.is_active === undefined ? true : String(req.body.is_active) === 'true',
      content: String(req.body?.content || ''),
    })
    const lean = await PrepareCard.findById(doc._id).lean()
    return created(res, { item: toAdmin(lean, req) }, 'Prepare card created')
  } catch (err) {
    next(err)
  }
}

const updateAdmin = async (req, res, next) => {
  try {
    await migrateLegacyIfNeeded()
    const id = String(req.params.id || '').trim()
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid card id')
      err.statusCode = 400
      throw err
    }
    const doc = await PrepareCard.findById(id)
    if (!doc) {
      const err = new Error('Not found')
      err.statusCode = 404
      throw err
    }
    if (req.body?.title !== undefined) {
      const t = String(req.body.title || '').trim()
      if (!t) {
        const err = new Error('title is required')
        err.statusCode = 400
        throw err
      }
      doc.title = t
    }
    if (req.body?.description !== undefined) {
      const d = String(req.body.description || '').trim()
      if (!d) {
        const err = new Error('description is required')
        err.statusCode = 400
        throw err
      }
      doc.description = d
    }
    if (req.body?.is_active !== undefined) {
      doc.isActive = String(req.body.is_active) === 'true' || req.body.is_active === true
    }
    if (req.body?.content !== undefined) doc.content = String(req.body.content || '')
    if (req.file?.path) {
      doc.image = await persistLocalUpload(req.file.path, { contentType: req.file.mimetype })
    }
    await doc.save()
    const lean = await PrepareCard.findById(doc._id).lean()
    return success(res, { item: toAdmin(lean, req) }, 'Prepare card updated')
  } catch (err) {
    next(err)
  }
}

const deleteAdmin = async (req, res, next) => {
  try {
    await migrateLegacyIfNeeded()
    const id = String(req.params.id || '').trim()
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid card id')
      err.statusCode = 400
      throw err
    }
    const deleted = await PrepareCard.findByIdAndDelete(id)
    if (!deleted) {
      const err = new Error('Not found')
      err.statusCode = 404
      throw err
    }
    await normalizePositionsSequential()
    return success(res, { ok: true }, 'Prepare card deleted')
  } catch (err) {
    next(err)
  }
}

const reorderAdmin = async (req, res, next) => {
  try {
    await migrateLegacyIfNeeded()
    const ids = req.body?.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('ids must be a non-empty array of prepare card ids')
      err.statusCode = 400
      throw err
    }
    for (let i = 0; i < ids.length; i++) {
      const pid = Number(ids[i])
      if (!Number.isFinite(pid)) {
        const err = new Error(`Invalid id at index ${i}`)
        err.statusCode = 400
        throw err
      }
      await PrepareCard.updateOne({ prepareId: pid }, { $set: { position: i } })
    }
    const items = await PrepareCard.find().sort({ position: 1, prepareId: 1 }).lean()
    return success(res, { items: items.map((d) => toAdmin(d, req)) })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listPublic,
  getByPrepareId,
  listAdmin,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  reorderAdmin,
}
