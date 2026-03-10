const subscriptionService = require('../services/subscription.service')
const { success, created } = require('../utils/response')

const getSubscription = async (req, res, next) => {
  try {
    const sub = await subscriptionService.getSubscription(req.user._id)
    return success(res, sub)
  } catch (err) {
    next(err)
  }
}

const createSubscription = async (req, res, next) => {
  try {
    const sub = await subscriptionService.createSubscription(req.user._id, req.body)
    return created(res, sub, 'Subscription activated')
  } catch (err) {
    next(err)
  }
}

const skipSubscription = async (req, res, next) => {
  try {
    const sub = await subscriptionService.skipSubscription(req.user._id)
    return success(res, sub, 'Subscription skipped')
  } catch (err) {
    next(err)
  }
}

const updatePaymentMethod = async (req, res, next) => {
  try {
    const sub = await subscriptionService.updatePaymentMethod(req.user._id, req.body.paymentMethod)
    return success(res, sub, 'Payment method updated')
  } catch (err) {
    next(err)
  }
}

const pauseSubscription = async (req, res, next) => {
  try {
    const sub = await subscriptionService.pauseSubscription(req.user._id)
    return success(res, sub, 'Subscription paused')
  } catch (err) {
    next(err)
  }
}

const cancelSubscription = async (req, res, next) => {
  try {
    const sub = await subscriptionService.cancelSubscription(req.user._id)
    return success(res, sub, 'Subscription cancelled')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getSubscription,
  createSubscription,
  skipSubscription,
  updatePaymentMethod,
  pauseSubscription,
  cancelSubscription,
}
