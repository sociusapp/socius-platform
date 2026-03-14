const helpCategoryService = require('../services/helpCategory.service')
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

const listPublic = async (req, res, next) => {
  try {
    const items = await helpCategoryService.listPublic()
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const getPublicBySlug = async (req, res, next) => {
  try {
    const category = await helpCategoryService.getBySlug(req.params.slug)
    if (!category) {
      const err = new Error('Category not found')
      err.statusCode = 404
      throw err
    }
    return success(res, { category })
  } catch (err) {
    next(err)
  }
}

const listAdmin = async (req, res, next) => {
  try {
    const items = await helpCategoryService.listAdmin()
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const getAdmin = async (req, res, next) => {
  try {
    const category = await helpCategoryService.getById(req.params.id)
    return success(res, { category })
  } catch (err) {
    next(err)
  }
}

const createAdmin = async (req, res, next) => {
  try {
    if (req.file && !String(req.file.mimetype || '').startsWith('image/')) {
      const err = new Error('Icon must be an image')
      err.statusCode = 400
      throw err
    }
    if (req.file?.path) {
      await optimizeIconInPlace(req.file.path).catch(() => {})
    }
    const doc = await helpCategoryService.create({
      name: req.body?.name,
      slug: req.body?.slug,
      description: req.body?.description,
      color: req.body?.color,
      sortOrder: req.body?.sortOrder,
      isActive: req.body?.isActive,
      iconFile: req.file || null,
    })
    return created(res, { category: doc }, 'Category created')
  } catch (err) {
    next(err)
  }
}

const updateAdmin = async (req, res, next) => {
  try {
    if (req.file && !String(req.file.mimetype || '').startsWith('image/')) {
      const err = new Error('Icon must be an image')
      err.statusCode = 400
      throw err
    }
    if (req.file?.path) {
      await optimizeIconInPlace(req.file.path).catch(() => {})
    }
    const doc = await helpCategoryService.update(req.params.id, {
      name: req.body?.name,
      slug: req.body?.slug,
      description: req.body?.description,
      color: req.body?.color,
      sortOrder: req.body?.sortOrder,
      isActive: req.body?.isActive,
      iconFile: req.file || null,
    })
    return success(res, { category: doc }, 'Category updated')
  } catch (err) {
    next(err)
  }
}

const deleteAdmin = async (req, res, next) => {
  try {
    const category = await helpCategoryService.remove(req.params.id)
    return success(res, { deleted: true, category }, 'Category disabled')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listPublic,
  getPublicBySlug,
  listAdmin,
  getAdmin,
  createAdmin,
  updateAdmin,
  deleteAdmin,
}
