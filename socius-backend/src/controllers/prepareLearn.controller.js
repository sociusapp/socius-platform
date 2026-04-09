const mongoose = require('mongoose')
const PrepareLearnSettings = require('../models/PrepareLearnSettings')
const PrepareLearnChip = require('../models/PrepareLearnChip')
const { success, created } = require('../utils/response')

const DEFAULT_CHIPS = [
  { label: 'Understanding stress & fear', icon: 'brain', position: 0, navigateTo: 'SafetyTips' },
  { label: 'Cultural sensitivity & respect', icon: 'earth', position: 1, navigateTo: 'SafetyTips' },
  { label: 'Helping without overstepping', icon: 'handshake', position: 2, navigateTo: 'SafetyTips' },
]

async function ensureSettings() {
  let doc = await PrepareLearnSettings.findOne({ key: 'default' }).lean()
  if (!doc) {
    doc = await PrepareLearnSettings.create({
      key: 'default',
      sectionTitle: 'Learn more',
      footerText: 'Preparation reduces harm and misunderstanding.',
    })
    doc = doc.toObject()
  }
  return doc
}

async function ensureChipsSeeded() {
  const n = await PrepareLearnChip.estimatedDocumentCount()
  if (n > 0) return
  const docs = DEFAULT_CHIPS.map((c) => ({
    ...c,
    isActive: true,
  }))
  try {
    await PrepareLearnChip.insertMany(docs)
  } catch {
    for (const c of DEFAULT_CHIPS) {
      const exists = await PrepareLearnChip.findOne({ label: c.label }).select('_id').lean()
      if (exists) continue
      await PrepareLearnChip.create({ ...c, isActive: true })
    }
  }
  if ((await PrepareLearnChip.estimatedDocumentCount()) === 0) {
    const err = new Error('Could not seed default Learn more chips')
    err.statusCode = 500
    throw err
  }
}

const toPublicSettings = (s) => ({
  section_title: s.sectionTitle || 'Learn more',
  footer_text: s.footerText || '',
})

const toPublicChip = (c) => ({
  id: c._id,
  label: c.label,
  icon: c.icon,
  navigate_to: c.navigateTo || 'SafetyTips',
  content: c.content != null ? String(c.content) : '',
})

const toAdminChip = (c) => ({
  _id: c._id != null ? String(c._id) : '',
  label: c.label,
  icon: c.icon,
  position: c.position,
  is_active: !!c.isActive,
  navigate_to: c.navigateTo || 'SafetyTips',
  content: c.content != null ? String(c.content) : '',
  updatedAt: c.updatedAt,
  createdAt: c.createdAt,
})

const getPublic = async (req, res, next) => {
  try {
    await ensureSettings()
    await ensureChipsSeeded()
    const settings = await PrepareLearnSettings.findOne({ key: 'default' }).lean()
    const chips = await PrepareLearnChip.find({ isActive: true }).sort({ position: 1 }).lean()
    res.json({
      ...toPublicSettings(settings),
      items: chips.map(toPublicChip),
    })
  } catch (err) {
    next(err)
  }
}

const getAdmin = async (req, res, next) => {
  try {
    await ensureSettings()
    await ensureChipsSeeded()
    const settings = await PrepareLearnSettings.findOne({ key: 'default' }).lean()
    const chips = await PrepareLearnChip.find().sort({ position: 1 }).lean()
    return success(res, {
      settings: {
        section_title: settings.sectionTitle,
        footer_text: settings.footerText,
      },
      items: chips.map((c) => toAdminChip(c)),
    })
  } catch (err) {
    next(err)
  }
}

const patchSettingsAdmin = async (req, res, next) => {
  try {
    await ensureSettings()
    const updates = {}
    if (req.body?.section_title !== undefined) {
      updates.sectionTitle = String(req.body.section_title || '').trim() || 'Learn more'
    }
    if (req.body?.footer_text !== undefined) {
      updates.footerText = String(req.body.footer_text || '').trim()
    }
    const settings = await PrepareLearnSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: updates },
      { new: true, upsert: true }
    ).lean()
    return success(res, {
      settings: {
        section_title: settings.sectionTitle,
        footer_text: settings.footerText,
      },
    })
  } catch (err) {
    next(err)
  }
}

const createChipAdmin = async (req, res, next) => {
  try {
    await ensureChipsSeeded()
    const label = String(req.body?.label || '').trim()
    if (!label) {
      const err = new Error('label is required')
      err.statusCode = 400
      throw err
    }
    const icon = String(req.body?.icon || 'help-circle-outline').trim() || 'help-circle-outline'
    const navigateTo = String(req.body?.navigate_to || 'SafetyTips').trim() || 'SafetyTips'
    const max = await PrepareLearnChip.findOne().sort({ position: -1 }).select('position').lean()
    const position = (max?.position ?? -1) + 1
    const content =
      req.body?.content !== undefined ? String(req.body.content || '') : ''
    const doc = await PrepareLearnChip.create({
      label,
      icon,
      position,
      isActive: req.body?.is_active === undefined ? true : !!req.body.is_active,
      navigateTo,
      content,
    })
    return created(res, { item: toAdminChip(doc.toObject()) }, 'Chip created')
  } catch (err) {
    next(err)
  }
}

const updateChipAdmin = async (req, res, next) => {
  try {
    const id = String(req.params.chipId || req.params.id || '').trim()
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid chip id')
      err.statusCode = 400
      throw err
    }
    const chip = await PrepareLearnChip.findById(id)
    if (!chip) {
      const err = new Error('Not found')
      err.statusCode = 404
      throw err
    }
    if (req.body?.label !== undefined) {
      const label = String(req.body.label || '').trim()
      if (!label) {
        const err = new Error('label cannot be empty')
        err.statusCode = 400
        throw err
      }
      chip.label = label
    }
    if (req.body?.icon !== undefined) chip.icon = String(req.body.icon || 'help-circle-outline').trim()
    if (req.body?.is_active !== undefined) chip.isActive = !!req.body.is_active
    if (req.body?.navigate_to !== undefined) {
      chip.navigateTo = String(req.body.navigate_to || 'SafetyTips').trim() || 'SafetyTips'
    }
    if (req.body?.content !== undefined) {
      chip.content = String(req.body.content || '')
    }
    await chip.save()
    return success(res, { item: toAdminChip(chip.toObject()) })
  } catch (err) {
    next(err)
  }
}

const deleteChipAdmin = async (req, res, next) => {
  try {
    const id = String(req.params.chipId || req.params.id || '').trim()
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid chip id')
      err.statusCode = 400
      throw err
    }
    await PrepareLearnChip.findByIdAndDelete(id)
    const remaining = await PrepareLearnChip.find().sort({ position: 1 }).select('_id').lean()
    for (let i = 0; i < remaining.length; i++) {
      await PrepareLearnChip.updateOne({ _id: remaining[i]._id }, { $set: { position: i } })
    }
    return success(res, { ok: true })
  } catch (err) {
    next(err)
  }
}

const reorderChipsAdmin = async (req, res, next) => {
  try {
    const ids = req.body?.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      const err = new Error('ids must be a non-empty array of chip ids')
      err.statusCode = 400
      throw err
    }
    for (let i = 0; i < ids.length; i++) {
      const raw = String(ids[i] || '').trim()
      if (!mongoose.Types.ObjectId.isValid(raw)) {
        const err = new Error(`Invalid id at index ${i}`)
        err.statusCode = 400
        throw err
      }
      await PrepareLearnChip.updateOne({ _id: raw }, { $set: { position: i } })
    }
    const chips = await PrepareLearnChip.find().sort({ position: 1 }).lean()
    return success(res, { items: chips.map((c) => toAdminChip(c)) })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getPublic,
  getAdmin,
  patchSettingsAdmin,
  createChipAdmin,
  updateChipAdmin,
  deleteChipAdmin,
  reorderChipsAdmin,
}
