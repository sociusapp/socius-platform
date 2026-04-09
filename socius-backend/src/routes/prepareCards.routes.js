const router = require('express').Router()
const prepareCardsController = require('../controllers/prepareCards.controller')
const prepareLearnController = require('../controllers/prepareLearn.controller')

router.get('/', prepareCardsController.listPublic)
/** Public “Learn more” block (must be before /:id). */
router.get('/learn-more', prepareLearnController.getPublic)
// Numeric prepareId or 24-char hex Mongo id only — never matches "learn-more"
router.get('/:id((?:\\d+|[0-9a-fA-F]{24}))', prepareCardsController.getByPrepareId)

module.exports = router
