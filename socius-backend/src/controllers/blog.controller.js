const Blog = require('../models/Blog')
const BlogType = require('../models/BlogType')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { success, created } = require('../utils/response')
const { persistLocalUpload } = require('../services/mediaStorage.service')

const optimizeImageInPlace = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase()
  const base = sharp(filePath).rotate().resize(800, 600, { fit: 'inside', withoutEnlargement: true })
  const buf =
    ext === '.png'
      ? await base.png({ compressionLevel: 9 }).toBuffer()
      : await base.jpeg({ quality: 85 }).toBuffer()
  await fs.promises.writeFile(filePath, buf)
}

const normalizeUploadPath = (filePath) => {
  if (!filePath) return null
  const s = String(filePath)
  if (/^https?:\/\//i.test(s)) return s
  const idx = s.indexOf('uploads/')
  if (idx !== -1) return '/' + s.substring(idx).replace(/\\/g, '/')
  return s.startsWith('/') ? s : `/${s}`
}

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 100)
}

// Get all published blogs by type (for mobile)
const getBlogsByType = async (req, res, next) => {
  try {
    const { typeId } = req.params
    const { page = 1, limit = 10 } = req.query
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const blogs = await Blog.find({ typeId, isPublished: true })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v -content')
      .populate('typeId', 'name slug iconPath color')
      .lean()
    
    const items = blogs.map(b => ({
      ...b,
      featuredImageUrl: b.featuredImage ? normalizeUploadPath(b.featuredImage) : null,
      typeId: undefined,
      type: b.typeId
    }))
    
    const total = await Blog.countDocuments({ typeId, isPublished: true })
    
    return success(res, {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (err) {
    next(err)
  }
}

// Get single blog by slug (for mobile)
const getBlogBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params
    
    const blog = await Blog.findOne({ slug, isPublished: true })
      .populate('typeId', 'name slug iconPath color')
      .lean()
    
    if (!blog) {
      const err = new Error('Blog not found')
      err.statusCode = 404
      throw err
    }
    
    // Increment view count
    await Blog.updateOne({ _id: blog._id }, { $inc: { viewCount: 1 } })
    
    return success(res, {
      ...blog,
      featuredImageUrl: blog.featuredImage ? normalizeUploadPath(blog.featuredImage) : null,
      type: blog.typeId,
      typeId: undefined
    })
  } catch (err) {
    next(err)
  }
}

// Get all blogs (for admin)
const getAllBlogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, typeId, isPublished } = req.query
    
    const query = {}
    if (typeId) query.typeId = typeId
    if (isPublished !== undefined) query.isPublished = isPublished === 'true'
    
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v -content')
      .populate('typeId', 'name slug')
      .lean()
    
    const items = blogs.map(b => ({
      ...b,
      featuredImageUrl: b.featuredImage ? normalizeUploadPath(b.featuredImage) : null
    }))
    
    const total = await Blog.countDocuments(query)
    
    return success(res, {
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (err) {
    next(err)
  }
}

// Get single blog by ID (for admin)
const getBlogById = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('typeId', 'name slug')
      .lean()
    
    if (!blog) {
      const err = new Error('Blog not found')
      err.statusCode = 404
      throw err
    }
    
    return success(res, {
      ...blog,
      featuredImageUrl: blog.featuredImage ? normalizeUploadPath(blog.featuredImage) : null
    })
  } catch (err) {
    next(err)
  }
}

// Create blog
const createBlog = async (req, res, next) => {
  try {
    if (req.file && !String(req.file.mimetype || '').startsWith('image/')) {
      const err = new Error('Featured image must be an image')
      err.statusCode = 400
      throw err
    }
    let featuredImageStored = null
    if (req.file?.path) {
      await optimizeImageInPlace(req.file.path).catch(() => {})
      featuredImageStored = await persistLocalUpload(req.file.path, { contentType: req.file.mimetype })
    }

    const {
      title,
      slug: customSlug,
      typeId,
      content,
      excerpt,
      author,
      isPublished,
      metaTitle,
      metaDescription
    } = req.body
    
    // Validate type exists
    const blogType = await BlogType.findById(typeId)
    if (!blogType) {
      const err = new Error('Blog type not found')
      err.statusCode = 400
      throw err
    }
    
    const cleanTitle = String(title || '').trim()
    if (!cleanTitle) {
      const err = new Error('Title is required')
      err.statusCode = 400
      throw err
    }
    
    // Generate slug
    let slug = customSlug || generateSlug(cleanTitle)
    
    // Check if slug exists
    let existingBlog = await Blog.findOne({ slug })
    let counter = 1
    const originalSlug = slug
    while (existingBlog) {
      slug = `${originalSlug}-${counter}`
      existingBlog = await Blog.findOne({ slug })
      counter++
    }
    
    const willBePublished = isPublished === 'true' || isPublished === true
    
    const blog = await Blog.create({
      title: cleanTitle,
      slug,
      typeId,
      content: content || '',
      excerpt: typeof excerpt === 'string' ? excerpt.trim() || null : null,
      featuredImage: featuredImageStored,
      author: typeof author === 'string' ? author.trim() || 'Socius Team' : 'Socius Team',
      isPublished: willBePublished,
      publishedAt: willBePublished ? new Date() : null,
      metaTitle: typeof metaTitle === 'string' ? metaTitle.trim() || null : null,
      metaDescription: typeof metaDescription === 'string' ? metaDescription.trim() || null : null,
    })
    
    const populatedBlog = await Blog.findById(blog._id)
      .populate('typeId', 'name slug')
      .lean()
    
    return created(res, {
      blog: {
        ...populatedBlog,
        featuredImageUrl: populatedBlog.featuredImage ? normalizeUploadPath(populatedBlog.featuredImage) : null
      }
    }, 'Blog created')
  } catch (err) {
    next(err)
  }
}

// Update blog
const updateBlog = async (req, res, next) => {
  try {
    if (req.file && !String(req.file.mimetype || '').startsWith('image/')) {
      const err = new Error('Featured image must be an image')
      err.statusCode = 400
      throw err
    }
    let newFeatured = null
    if (req.file?.path) {
      await optimizeImageInPlace(req.file.path).catch(() => {})
      newFeatured = await persistLocalUpload(req.file.path, { contentType: req.file.mimetype })
    }

    const {
      title,
      slug: customSlug,
      typeId,
      content,
      excerpt,
      author,
      isPublished,
      metaTitle,
      metaDescription
    } = req.body
    
    const blog = await Blog.findById(req.params.id)
    if (!blog) {
      const err = new Error('Blog not found')
      err.statusCode = 404
      throw err
    }
    
    // Validate type if provided
    if (typeId && typeId !== blog.typeId.toString()) {
      const blogType = await BlogType.findById(typeId)
      if (!blogType) {
        const err = new Error('Blog type not found')
        err.statusCode = 400
        throw err
      }
    }
    
    // Handle slug change
    if (typeof customSlug === 'string' && customSlug !== blog.slug) {
      const nextSlug = customSlug.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      if (nextSlug) {
        const existing = await Blog.findOne({ slug: nextSlug, _id: { $ne: blog._id } })
        if (existing) {
          const err = new Error('Slug already exists')
          err.statusCode = 409
          throw err
        }
        blog.slug = nextSlug
      }
    }
    
    // Handle publish status change
    const wasPublished = blog.isPublished
    const willBePublished = isPublished === 'true' || isPublished === true
    
    if (!wasPublished && willBePublished) {
      blog.publishedAt = new Date()
    } else if (wasPublished && !willBePublished) {
      blog.publishedAt = null
    }
    
    // Update fields
    if (typeof title === 'string') blog.title = title.trim() || blog.title
    if (typeId) blog.typeId = typeId
    if (typeof content === 'string') blog.content = content
    if (typeof excerpt === 'string') blog.excerpt = excerpt.trim() || null
    if (newFeatured) blog.featuredImage = newFeatured
    if (typeof author === 'string') blog.author = author.trim() || blog.author
    if (isPublished !== undefined) blog.isPublished = willBePublished
    if (typeof metaTitle === 'string') blog.metaTitle = metaTitle.trim() || null
    if (typeof metaDescription === 'string') blog.metaDescription = metaDescription.trim() || null
    
    await blog.save()
    
    const populatedBlog = await Blog.findById(blog._id)
      .populate('typeId', 'name slug')
      .lean()
    
    return success(res, {
      blog: {
        ...populatedBlog,
        featuredImageUrl: populatedBlog.featuredImage ? normalizeUploadPath(populatedBlog.featuredImage) : null
      }
    }, 'Blog updated')
  } catch (err) {
    next(err)
  }
}

// Delete blog
const deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id)
    
    if (!blog) {
      const err = new Error('Blog not found')
      err.statusCode = 404
      throw err
    }
    
    await Blog.deleteOne({ _id: req.params.id })
    
    return success(res, { deleted: true }, 'Blog deleted')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getBlogsByType,
  getBlogBySlug,
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
}
