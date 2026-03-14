const router = require('express').Router()
const controller = require('../controllers/helpCategory.controller')

router.get('/', controller.listPublic)
router.get('/:slug', controller.getPublicBySlug)

module.exports = router
