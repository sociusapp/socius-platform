const { success } = require('../utils/response')
const service = require('../services/requestClosure.service')

const postClose = async (req, res, next) => {
  try {
    const { requestId, rating, feedback } = req.body
    const data = await service.initiateClosure(req.user._id, { requestId, rating, feedback })
    return success(res, data, 'Closure initiated')
  } catch (err) {
    next(err)
  }
}

const getClosureFeedback = async (req, res, next) => {
  try {
    const data = await service.getClosure(req.user._id, req.params.requestId)
    return success(res, data)
  } catch (err) {
    next(err)
  }
}

const putFinalize = async (req, res, next) => {
  try {
    const { requestId } = req.body
    const data = await service.finalizeClosure(req.user._id, { requestId })
    return success(res, data, 'Closure finalized')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  postClose,
  getClosureFeedback,
  putFinalize,
}
