const HelpCategory = require('../models/HelpCategory')
const HelpRequest = require('../models/HelpRequest')

const DEFAULT_CATEGORIES = [
  { slug: 'print_document', name: 'Print / Document', sortOrder: 1, isActive: true },
  { slug: 'tool_repair', name: 'Tool / Repair', sortOrder: 2, isActive: true },
  { slug: 'carry_lift', name: 'Carry / Lift', sortOrder: 3, isActive: true },
  { slug: 'transport_help', name: 'Transport Help', sortOrder: 4, isActive: true },
  { slug: 'household_help', name: 'Small Household Help', sortOrder: 5, isActive: true },
  { slug: 'study_office_help', name: 'Study / Office Help', sortOrder: 6, isActive: true },
  { slug: 'language_support', name: 'Language / Translation', sortOrder: 7, isActive: true },
  { slug: 'elder_assistance', name: 'Elder / Accessibility Help', sortOrder: 8, isActive: true },
  { slug: 'tech_help', name: 'Tech Help (Quick Fix)', sortOrder: 9, isActive: true },
  { slug: 'general_help', name: 'General Help (Last Resort)', sortOrder: 10, isActive: true },
]

const normalizeUploadPath = (path) => {
  if (!path) return null
  if (path.startsWith('http') || path.startsWith('https')) return path
  const idx = path.indexOf('uploads/')
  if (idx !== -1) return '/' + path.substring(idx).replace(/\\/g, '/')
  return path.startsWith('/') ? path : `/${path}`
}

const ensureSeeded = async () => {
  const count = await HelpCategory.countDocuments({})
  if (count > 0) return
  await HelpCategory.insertMany(DEFAULT_CATEGORIES, { ordered: false }).catch(() => {})
}

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const listPublic = async () => {
  await ensureSeeded()
  const items = await HelpCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean()
  return items.map((c) => ({ ...c, iconUrl: c.iconPath ? normalizeUploadPath(c.iconPath) : null }))
}

const listAdmin = async () => {
  await ensureSeeded()
  const items = await HelpCategory.find({}).sort({ sortOrder: 1, name: 1 }).lean()
  return items.map((c) => ({ ...c, iconUrl: c.iconPath ? normalizeUploadPath(c.iconPath) : null }))
}

const getById = async (id) => {
  await ensureSeeded()
  const doc = await HelpCategory.findById(id).lean()
  if (!doc) {
    const err = new Error('Category not found')
    err.statusCode = 404
    throw err
  }
  return { ...doc, iconUrl: doc.iconPath ? normalizeUploadPath(doc.iconPath) : null }
}

const create = async ({ name, slug, description, color, sortOrder, isActive, iconFile }) => {
  const cleanName = String(name || '').trim()
  if (!cleanName) {
    const err = new Error('Name is required')
    err.statusCode = 400
    throw err
  }
  const cleanSlug = slugify(slug || cleanName)
  if (!cleanSlug) {
    const err = new Error('Slug is required')
    err.statusCode = 400
    throw err
  }

  const exists = await HelpCategory.findOne({ slug: cleanSlug }).select('_id').lean()
  if (exists) {
    const err = new Error('Slug already exists')
    err.statusCode = 409
    throw err
  }

  const doc = await HelpCategory.create({
    name: cleanName,
    slug: cleanSlug,
    description: typeof description === 'string' ? description.trim() || null : null,
    color: typeof color === 'string' ? color.trim() || null : null,
    sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    isActive: typeof isActive === 'boolean' ? isActive : true,
    iconPath: iconFile?.path || null,
  })

  const obj = doc.toObject()
  return { ...obj, iconUrl: obj.iconPath ? normalizeUploadPath(obj.iconPath) : null }
}

const update = async (id, { name, slug, description, color, sortOrder, isActive, iconFile }) => {
  const doc = await HelpCategory.findById(id)
  if (!doc) {
    const err = new Error('Category not found')
    err.statusCode = 404
    throw err
  }

  if (typeof name === 'string') doc.name = name.trim() || doc.name
  if (typeof description === 'string') doc.description = description.trim() || null
  if (typeof slug === 'string') {
    const nextSlug = slugify(slug)
    if (nextSlug && nextSlug !== doc.slug) {
      const inUse = await HelpRequest.exists({ category: doc.slug })
      if (inUse) {
        const err = new Error('Cannot change slug for a category already used in requests')
        err.statusCode = 409
        throw err
      }
      const exists = await HelpCategory.findOne({ slug: nextSlug }).select('_id').lean()
      if (exists) {
        const err = new Error('Slug already exists')
        err.statusCode = 409
        throw err
      }
      doc.slug = nextSlug
    }
  }
  if (typeof color === 'string') doc.color = color.trim() || null
  if (sortOrder !== undefined) doc.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : doc.sortOrder
  if (typeof isActive === 'boolean') doc.isActive = isActive
  if (iconFile?.path) doc.iconPath = iconFile.path

  await doc.save()
  const obj = doc.toObject()
  return { ...obj, iconUrl: obj.iconPath ? normalizeUploadPath(obj.iconPath) : null }
}

const remove = async (id) => {
  const doc = await HelpCategory.findById(id)
  if (!doc) {
    const err = new Error('Category not found')
    err.statusCode = 404
    throw err
  }
  doc.isActive = false
  await doc.save()
  const obj = doc.toObject()
  return { ...obj, iconUrl: obj.iconPath ? normalizeUploadPath(obj.iconPath) : null }
}

const getBySlug = async (slug) => {
  if (!slug) return null
  const doc = await HelpCategory.findOne({ slug: String(slug).trim().toLowerCase(), isActive: true }).lean()
  if (!doc) return null
  return { ...doc, iconUrl: doc.iconPath ? normalizeUploadPath(doc.iconPath) : null }
}

module.exports = {
  listPublic,
  listAdmin,
  getById,
  create,
  update,
  remove,
  getBySlug,
  normalizeUploadPath,
}
