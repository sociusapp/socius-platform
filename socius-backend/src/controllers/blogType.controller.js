const BlogType = require('../models/BlogType')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { success, created } = require('../utils/response')

const optimizeIconInPlace = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  const base = sharp(filePath).rotate().resize(128, 128, { fit: 'cover' })
  const buf =
    ext === '.png'
      ? await base.png({ compressionLevel: 9 }).toBuffer()
      : await base.jpeg({ quality: 82 }).toBuffer()
  await fs.promises.writeFile(filePath, buf)
}

const normalizeUploadPath = (filePath) => {
  if (!filePath) return null
  if (filePath.startsWith('http') || filePath.startsWith('https')) return filePath
  const idx = filePath.indexOf('uploads/')
  if (idx !== -1) return '/' + filePath.substring(idx).replace(/\\/g, '/')
  return filePath.startsWith('/') ? filePath : `/${filePath}`
}

// Get all active blog types (for mobile)
const getActiveBlogTypes = async (req, res, next) => {
  try {
    const types = await BlogType.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
    
    const items = types.map(t => ({
      ...t,
      iconUrl: t.iconPath ? normalizeUploadPath(t.iconPath) : null
    }))
    
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

// Get all blog types (for admin)
const getAllBlogTypes = async (req, res, next) => {
  try {
    const types = await BlogType.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean()
    
    const items = types.map(t => ({
      ...t,
      iconUrl: t.iconPath ? normalizeUploadPath(t.iconPath) : null
    }))
    
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

// Get single blog type
const getBlogTypeById = async (req, res, next) => {
  try {
    const type = await BlogType.findById(req.params.id).lean()
    
    if (!type) {
      const err = new Error('Blog type not found')
      err.statusCode = 404
      throw err
    }
    
    return success(res, { 
      ...type, 
      iconUrl: type.iconPath ? normalizeUploadPath(type.iconPath) : null 
    })
  } catch (err) {
    next(err)
  }
}

// Create blog type
const createBlogType = async (req, res, next) => {
  try {
    if (req.file && !String(req.file.mimetype || '').startsWith('image/')) {
      const err = new Error('Icon must be an image')
      err.statusCode = 400
      throw err
    }
    if (req.file?.path) {
      await optimizeIconInPlace(req.file.path).catch(() => {})
    }
    
    const { name, slug, description, color, sortOrder, isActive, iconType } = req.body
    
    const cleanName = String(name || '').trim()
    if (!cleanName) {
      const err = new Error('Name is required')
      err.statusCode = 400
      throw err
    }
    
    const cleanSlug = String(slug || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (!cleanSlug) {
      const err = new Error('Slug is required')
      err.statusCode = 400
      throw err
    }
    
    const exists = await BlogType.findOne({ slug: cleanSlug }).select('_id').lean()
    if (exists) {
      const err = new Error('Slug already exists')
      err.statusCode = 409
      throw err
    }
    
    const blogType = await BlogType.create({
      name: cleanName,
      slug: cleanSlug,
      description: typeof description === 'string' ? description.trim() || null : null,
      iconPath: req.file?.path || null,
      iconType: iconType || 'image',
      color: typeof color === 'string' ? color.trim() || '#C84D59' : '#C84D59',
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    })
    
    const obj = blogType.toObject()
    return created(res, { 
      type: { ...obj, iconUrl: obj.iconPath ? normalizeUploadPath(obj.iconPath) : null }
    }, 'Blog type created')
  } catch (err) {
    next(err)
  }
}

// Update blog type
const updateBlogType = async (req, res, next) => {
  try {
    if (req.file && !String(req.file.mimetype || '').startsWith('image/')) {
      const err = new Error('Icon must be an image')
      err.statusCode = 400
      throw err
    }
    if (req.file?.path) {
      await optimizeIconInPlace(req.file.path).catch(() => {})
    }
    
    const { name, slug, description, color, sortOrder, isActive, iconType } = req.body
    
    const blogType = await BlogType.findById(req.params.id)
    if (!blogType) {
      const err = new Error('Blog type not found')
      err.statusCode = 404
      throw err
    }
    
    if (typeof name === 'string') blogType.name = name.trim() || blogType.name
    if (typeof description === 'string') blogType.description = description.trim() || null
    
    if (typeof slug === 'string') {
      const nextSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (nextSlug && nextSlug !== blogType.slug) {
        const exists = await BlogType.findOne({ slug: nextSlug }).select('_id').lean()
        if (exists) {
          const err = new Error('Slug already exists')
          err.statusCode = 409
          throw err
        }
        blogType.slug = nextSlug
      }
    }
    
    if (typeof color === 'string') blogType.color = color.trim() || blogType.color
    if (sortOrder !== undefined) blogType.sortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : blogType.sortOrder
    if (typeof isActive === 'boolean') blogType.isActive = isActive
    if (typeof iconType === 'string') blogType.iconType = iconType
    if (req.file?.path) blogType.iconPath = req.file.path
    
    await blogType.save()
    
    const obj = blogType.toObject()
    return success(res, { 
      type: { ...obj, iconUrl: obj.iconPath ? normalizeUploadPath(obj.iconPath) : null }
    }, 'Blog type updated')
  } catch (err) {
    next(err)
  }
}

// Delete blog type
const deleteBlogType = async (req, res, next) => {
  try {
    const blogType = await BlogType.findById(req.params.id)
    
    if (!blogType) {
      const err = new Error('Blog type not found')
      err.statusCode = 404
      throw err
    }
    
    await BlogType.deleteOne({ _id: req.params.id })
    
    return success(res, { deleted: true }, 'Blog type deleted')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getActiveBlogTypes,
  getAllBlogTypes,
  getBlogTypeById,
  createBlogType,
  updateBlogType,
  deleteBlogType,
}
