const router = require('express').Router()
const controller = require('../controllers/helpCategory.controller')
const helpCatalogController = require('../controllers/helpCatalog.controller')
const helpSubcategoryController = require('../controllers/helpSubcategory.controller')
const { authenticate } = require('../middlewares/auth')

router.get('/items', authenticate, helpCatalogController.listPublicHelpItems)
router.get('/subcategories', helpSubcategoryController.listPublic)
router.get('/', controller.listPublic)
router.get('/:slug', controller.getPublicBySlug)

module.exports = router
