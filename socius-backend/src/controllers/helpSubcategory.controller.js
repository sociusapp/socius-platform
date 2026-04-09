const helpSubcategoryService = require('../services/helpSubcategory.service')
const { success, created } = require('../utils/response')

const listPublic = async (req, res, next) => {
  try {
    const items = await helpSubcategoryService.listPublic({
      categoryId: req.query?.categoryId,
      categorySlug: req.query?.categorySlug,
    })
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const listAdmin = async (req, res, next) => {
  try {
    const items = await helpSubcategoryService.listAdmin({
      parentCategoryId: req.query?.parentCategoryId,
    })
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

const createAdmin = async (req, res, next) => {
  try {
    const item = await helpSubcategoryService.create(req.body || {})
    return created(res, { item }, 'Sub-category created')
  } catch (err) {
    next(err)
  }
}

const updateAdmin = async (req, res, next) => {
  try {
    const item = await helpSubcategoryService.update(req.params.id, req.body || {})
    return success(res, { item }, 'Sub-category updated')
  } catch (err) {
    next(err)
  }
}

const deleteAdmin = async (req, res, next) => {
  try {
    const out = await helpSubcategoryService.remove(req.params.id)
    return success(res, out, 'Sub-category deleted')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listPublic,
  listAdmin,
  createAdmin,
  updateAdmin,
  deleteAdmin,
}
