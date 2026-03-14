const router = require('express').Router()
const { authenticate, requireActive } = require('../middlewares/auth')
const { listMyCalls, getCallByKey, listCallEvents } = require('../controllers/call.controller')

router.get('/', authenticate, requireActive, listMyCalls)
router.get('/:callKey', authenticate, requireActive, getCallByKey)
router.get('/:callKey/events', authenticate, requireActive, listCallEvents)

module.exports = router

