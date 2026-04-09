const PresenceCategory = require('../models/PresenceCategory')
const PresenceItem = require('../models/PresenceItem')
const { success } = require('../utils/response')

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeUploadPath = (filePath) => {
  if (!filePath) return null
  const normalized = String(filePath).replace(/\\/g, '/')
  const idx = normalized.indexOf('uploads/')
  if (idx !== -1) return `/${normalized.substring(idx)}`
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

const listPublicCategories = async (req, res, next) => {
  try {
    const items = await PresenceCategory.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const listPublicItems = async (req, res, next) => {
  try {
    const { categoryId } = req.query
    const query = { isActive: true }
    if (categoryId) query.categoryId = categoryId
    const items = await PresenceItem.find(query)
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const listAdminCategories = async (req, res, next) => {
  try {
    const items = await PresenceCategory.find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const createCategory = async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim()
    if (!title) {
      const err = new Error('Title is required')
      err.statusCode = 400
      throw err
    }
    const slug = slugify(req.body?.slug || title)
    const doc = await PresenceCategory.create({
      title,
      slug,
      iconName: req.body?.iconName || null,
      iconPath: req.file?.path ? normalizeUploadPath(req.file.path) : null,
      isActive: req.body?.isActive !== undefined ? String(req.body.isActive) === 'true' : true,
      sortOrder: Number(req.body?.sortOrder || 0),
    })
    return success(res, doc, 'Presence category created')
  } catch (err) {
    next(err)
  }
}

const updateCategory = async (req, res, next) => {
  try {
    const doc = await PresenceCategory.findById(req.params.id)
    if (!doc) {
      const err = new Error('Category not found')
      err.statusCode = 404
      throw err
    }
    if (req.body?.title !== undefined) doc.title = String(req.body.title || '').trim()
    if (req.body?.slug !== undefined) doc.slug = slugify(req.body.slug || doc.title)
    if (req.body?.iconName !== undefined) doc.iconName = req.body.iconName || null
    if (req.body?.sortOrder !== undefined) doc.sortOrder = Number(req.body.sortOrder || 0)
    if (req.body?.isActive !== undefined) doc.isActive = String(req.body.isActive) === 'true'
    if (req.file?.path) doc.iconPath = normalizeUploadPath(req.file.path)
    await doc.save()
    return success(res, doc, 'Presence category updated')
  } catch (err) {
    next(err)
  }
}

const deleteCategory = async (req, res, next) => {
  try {
    await PresenceItem.deleteMany({ categoryId: req.params.id })
    await PresenceCategory.findByIdAndDelete(req.params.id)
    return success(res, null, 'Presence category deleted')
  } catch (err) {
    next(err)
  }
}

const listAdminItems = async (req, res, next) => {
  try {
    const query = {}
    if (req.query?.categoryId) query.categoryId = req.query.categoryId
    const items = await PresenceItem.find(query)
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate('categoryId', 'title slug')
      .lean()
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const createItem = async (req, res, next) => {
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
    const doc = await PresenceItem.create({
      categoryId,
      title,
      description: req.body?.description || '',
      tags: tagsRaw,
      iconName: req.body?.iconName || null,
      iconPath: req.file?.path ? normalizeUploadPath(req.file.path) : null,
      isActive: req.body?.isActive !== undefined ? String(req.body.isActive) === 'true' : true,
      sortOrder: Number(req.body?.sortOrder || 0),
    })
    return success(res, doc, 'Presence item created')
  } catch (err) {
    next(err)
  }
}

const updateItem = async (req, res, next) => {
  try {
    const doc = await PresenceItem.findById(req.params.id)
    if (!doc) {
      const err = new Error('Item not found')
      err.statusCode = 404
      throw err
    }
    if (req.body?.categoryId !== undefined) doc.categoryId = req.body.categoryId
    if (req.body?.title !== undefined) doc.title = String(req.body.title || '').trim()
    if (req.body?.description !== undefined) doc.description = req.body.description || ''
    if (req.body?.iconName !== undefined) doc.iconName = req.body.iconName || null
    if (req.body?.sortOrder !== undefined) doc.sortOrder = Number(req.body.sortOrder || 0)
    if (req.body?.isActive !== undefined) doc.isActive = String(req.body.isActive) === 'true'
    if (req.file?.path) doc.iconPath = normalizeUploadPath(req.file.path)
    if (req.body?.tags !== undefined) {
      doc.tags = Array.isArray(req.body.tags)
        ? req.body.tags
        : String(req.body.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
    }
    await doc.save()
    return success(res, doc, 'Presence item updated')
  } catch (err) {
    next(err)
  }
}

const deleteItem = async (req, res, next) => {
  try {
    await PresenceItem.findByIdAndDelete(req.params.id)
    return success(res, null, 'Presence item deleted')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listPublicCategories,
  listPublicItems,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listAdminItems,
  createItem,
  updateItem,
  deleteItem,
}

