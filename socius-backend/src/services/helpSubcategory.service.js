const mongoose = require('mongoose')
const HelpCategory = require('../models/HelpCategory')
const HelpSubcategory = require('../models/HelpSubcategory')
const { ensureHelpSubcategoryDefaults } = require('./helpSubcategoryDefaults')

const ensureParentCategory = async (parentCategoryId) => {
  const id = String(parentCategoryId || '').trim()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid parent category id')
    err.statusCode = 400
    throw err
  }
  const parent = await HelpCategory.findById(id).select('_id name slug isActive').lean()
  if (!parent) {
    const err = new Error('Parent category not found')
    err.statusCode = 404
    throw err
  }
  return parent
}

const toPublic = (row) => ({
  _id: String(row._id),
  parent_category_id: String(row.parentCategoryId),
  title: row.title,
  description: row.description,
})

const toAdmin = (row) => ({
  _id: String(row._id),
  parentCategoryId: String(row.parentCategoryId?._id || row.parentCategoryId),
  parentCategory: row.parentCategoryId?._id
    ? {
        _id: String(row.parentCategoryId._id),
        name: row.parentCategoryId.name,
        slug: row.parentCategoryId.slug,
      }
    : null,
  title: row.title,
  description: row.description,
  isActive: !!row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
})

const listPublic = async ({ categoryId, categorySlug }) => {
  await ensureHelpSubcategoryDefaults()
  const query = { isActive: true }
  if (categoryId) {
    const parent = await ensureParentCategory(categoryId)
    query.parentCategoryId = parent._id
  } else if (categorySlug) {
    const cat = await HelpCategory.findOne({ slug: String(categorySlug).trim().toLowerCase(), isActive: true })
      .select('_id')
      .lean()
    if (!cat?._id) return []
    query.parentCategoryId = cat._id
  }

  const rows = await HelpSubcategory.find(query).sort({ createdAt: 1, _id: 1 }).lean()
  return rows.map(toPublic)
}

const listAdmin = async ({ parentCategoryId }) => {
  await ensureHelpSubcategoryDefaults()
  const query = {}
  if (parentCategoryId) {
    const parent = await ensureParentCategory(parentCategoryId)
    query.parentCategoryId = parent._id
  }
  const rows = await HelpSubcategory.find(query)
    .populate('parentCategoryId', 'name slug isActive')
    .sort({ createdAt: 1, _id: 1 })
    .lean()
  return rows.map(toAdmin)
}

const create = async ({ parentCategoryId, title, description }) => {
  const parent = await ensureParentCategory(parentCategoryId)
  const cleanTitle = String(title || '').trim()
  const cleanDescription = String(description || '').trim()
  if (!cleanTitle) {
    const err = new Error('title is required')
    err.statusCode = 400
    throw err
  }
  if (!cleanDescription) {
    const err = new Error('description is required')
    err.statusCode = 400
    throw err
  }
  const doc = await HelpSubcategory.create({
    parentCategoryId: parent._id,
    title: cleanTitle,
    description: cleanDescription,
    isActive: true,
  })
  const row = await HelpSubcategory.findById(doc._id).populate('parentCategoryId', 'name slug').lean()
  return toAdmin(row)
}

const update = async (id, { parentCategoryId, title, description, isActive }) => {
  const rawId = String(id || '').trim()
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    const err = new Error('Invalid subcategory id')
    err.statusCode = 400
    throw err
  }
  const doc = await HelpSubcategory.findById(rawId)
  if (!doc) {
    const err = new Error('Subcategory not found')
    err.statusCode = 404
    throw err
  }

  if (parentCategoryId !== undefined) {
    const parent = await ensureParentCategory(parentCategoryId)
    doc.parentCategoryId = parent._id
  }
  if (title !== undefined) {
    const cleanTitle = String(title || '').trim()
    if (!cleanTitle) {
      const err = new Error('title cannot be empty')
      err.statusCode = 400
      throw err
    }
    doc.title = cleanTitle
  }
  if (description !== undefined) {
    const cleanDescription = String(description || '').trim()
    if (!cleanDescription) {
      const err = new Error('description cannot be empty')
      err.statusCode = 400
      throw err
    }
    doc.description = cleanDescription
  }
  if (isActive !== undefined) {
    doc.isActive = !!isActive
  }
  await doc.save()
  const row = await HelpSubcategory.findById(doc._id).populate('parentCategoryId', 'name slug').lean()
  return toAdmin(row)
}

const remove = async (id) => {
  const rawId = String(id || '').trim()
  if (!mongoose.Types.ObjectId.isValid(rawId)) {
    const err = new Error('Invalid subcategory id')
    err.statusCode = 400
    throw err
  }
  const deleted = await HelpSubcategory.findByIdAndDelete(rawId).lean()
  if (!deleted) {
    const err = new Error('Subcategory not found')
    err.statusCode = 404
    throw err
  }
  return { deleted: true }
}

module.exports = {
  listPublic,
  listAdmin,
  create,
  update,
  remove,
}
