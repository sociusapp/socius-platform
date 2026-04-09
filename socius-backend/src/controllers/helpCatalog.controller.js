const mongoose = require('mongoose')
const HelpCategory = require('../models/HelpCategory')
const HelpCatalogItem = require('../models/HelpCatalogItem')
const { success } = require('../utils/response')

const normalizeUploadPath = (filePath) => {
  if (!filePath) return null
  const normalized = String(filePath).replace(/\\/g, '/')
  const idx = normalized.indexOf('uploads/')
  if (idx !== -1) return `/${normalized.substring(idx)}`
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

const resolveHelpCategoryId = async (categoryId, categorySlug) => {
  const raw = String(categoryId || '').trim()
  if (raw && mongoose.Types.ObjectId.isValid(raw)) {
    const exists = await HelpCategory.findById(raw).select('_id').lean()
    if (exists?._id) return String(exists._id)
  }
  const slug = String(categorySlug || '').trim().toLowerCase()
  if (!slug) return null
  const cat = await HelpCategory.findOne({ slug, isActive: true }).select('_id').lean()
  return cat?._id ? String(cat._id) : null
}

const listPublicHelpItems = async (req, res, next) => {
  try {
    const { categoryId, categorySlug } = req.query
    const resolvedId = await resolveHelpCategoryId(categoryId, categorySlug)
    const query = { isActive: true }
    if (resolvedId) query.categoryId = resolvedId
    const items = await HelpCatalogItem.find(query)
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const listAdminHelpItems = async (req, res, next) => {
  try {
    const query = {}
    if (req.query?.categoryId) query.categoryId = req.query.categoryId
    const items = await HelpCatalogItem.find(query)
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate('categoryId', 'name slug')
      .lean()
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const createHelpItem = async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim()
    const categoryId = String(req.body?.categoryId || '').trim()
    if (!title || !categoryId) {
      const err = new Error('categoryId and title are required')
      err.statusCode = 400
      throw err
    }
    const tagsRaw = Array.isArray(req.body?.tags)
      ? req.body.tags
      : String(req.body?.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
    const doc = await HelpCatalogItem.create({
      categoryId,
      title,
      description: req.body?.description || '',
      tags: tagsRaw,
      iconName: req.body?.iconName || null,
      iconPath: req.file?.path ? normalizeUploadPath(req.file.path) : null,
      isActive: req.body?.isActive !== undefined ? String(req.body.isActive) === 'true' : true,
      sortOrder: Number(req.body?.sortOrder || 0),
    })
    return success(res, doc, 'Help catalog item created')
  } catch (err) {
    next(err)
  }
}

const updateHelpItem = async (req, res, next) => {
  try {
    const doc = await HelpCatalogItem.findById(req.params.id)
    if (!doc) {
      const err = new Error('Item not found')
      err.statusCode = 404
      throw err
    }
    if (req.body?.categoryId !== undefined) doc.categoryId = req.body.categoryId
    if (req.body?.title !== undefined) doc.title = String(req.body.title || '').trim()
    if (req.body?.description !== undefined) doc.description = req.body.description || ''
    if (req.body?.sortOrder !== undefined) doc.sortOrder = Number(req.body.sortOrder || 0)
    if (req.body?.isActive !== undefined) doc.isActive = String(req.body.isActive) === 'true'
    if (req.body?.iconName !== undefined) doc.iconName = req.body.iconName || null
    if (req.body?.tags !== undefined) {
      doc.tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : String(req.body.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
    }
    if (req.file?.path) doc.iconPath = normalizeUploadPath(req.file.path)
    await doc.save()
    return success(res, doc, 'Help catalog item updated')
  } catch (err) {
    next(err)
  }
}

const deleteHelpItem = async (req, res, next) => {
  try {
    await HelpCatalogItem.findByIdAndDelete(req.params.id)
    return success(res, null, 'Help catalog item deleted')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listPublicHelpItems,
  listAdminHelpItems,
  createHelpItem,
  updateHelpItem,
  deleteHelpItem,
}
