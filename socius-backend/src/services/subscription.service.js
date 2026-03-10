const Subscription = require('../models/Subscription')
const User = require('../models/User')
const logger = require('../utils/logger')

/**
 * Subscription get karo
 */
const getSubscription = async (userId) => {
  const sub = await Subscription.findOne({ userId })
  return sub
}

/**
 * Subscription create karo (onboarding pe)
 */
const createSubscription = async (userId, { paymentMethod }) => {
  const existing = await Subscription.findOne({ userId })
  if (existing) {
    const err = new Error('Subscription already exists')
    err.statusCode = 409
    throw err
  }

  const now = new Date()
  const nextBilling = new Date(now)
  nextBilling.setMonth(nextBilling.getMonth() + 1)

  const sub = await Subscription.create({
    userId,
    plan: 'community_supporter',
    amount: 15,
    status: 'active',
    paymentMethod: paymentMethod || {},
    startDate: now,
    nextBillingDate: nextBilling,
  })

  await User.findByIdAndUpdate(userId, { subscriptionStatus: 'active' })

  logger.info(`Subscription created: ${userId}`)
  return sub
}

/**
 * Subscription skip karo (onboarding me "Skip" button)
 */
const skipSubscription = async (userId) => {
  const existing = await Subscription.findOne({ userId })
  if (existing) return existing

  const sub = await Subscription.create({
    userId,
    isSkipped: true,
    skippedAt: new Date(),
    status: 'none',
  })

  return sub
}

/**
 * Payment method update karo
 */
const updatePaymentMethod = async (userId, paymentMethod) => {
  const sub = await Subscription.findOneAndUpdate(
    { userId },
    { $set: { paymentMethod } },
    { new: true }
  )

  if (!sub) {
    const err = new Error('Subscription not found')
    err.statusCode = 404
    throw err
  }

  return sub
}

/**
 * Subscription pause karo
 */
const pauseSubscription = async (userId) => {
  const sub = await Subscription.findOne({ userId })

  if (!sub || sub.status !== 'active') {
    const err = new Error('No active subscription to pause')
    err.statusCode = 400
    throw err
  }

  sub.status = 'paused'
  sub.pausedAt = new Date()
  await sub.save()

  await User.findByIdAndUpdate(userId, { subscriptionStatus: 'paused' })

  logger.info(`Subscription paused: ${userId}`)
  return sub
}

/**
 * Subscription cancel karo
 */
const cancelSubscription = async (userId) => {
  const sub = await Subscription.findOne({ userId })

  if (!sub || ['cancelled', 'none'].includes(sub.status)) {
    const err = new Error('No active subscription to cancel')
    err.statusCode = 400
    throw err
  }

  sub.status = 'cancelled'
  sub.cancelledAt = new Date()
  // Access billing period ke end tak chalti hai
  sub.expiresAt = sub.nextBillingDate
  await sub.save()

  await User.findByIdAndUpdate(userId, { subscriptionStatus: 'cancelled' })

  logger.info(`Subscription cancelled: ${userId}`)
  return sub
}

/**
 * Cron job use karta hai — expired subscriptions check
 */
const processExpiredSubscriptions = async () => {
  const now = new Date()
  const expired = await Subscription.find({
    status: { $in: ['active', 'paused'] },
    expiresAt: { $lt: now },
  })

  for (const sub of expired) {
    sub.status = 'expired'
    await sub.save()
    await User.findByIdAndUpdate(sub.userId, { subscriptionStatus: 'expired' })
    logger.info(`Subscription expired: ${sub.userId}`)
  }

  return expired.length
}

module.exports = {
  getSubscription,
  createSubscription,
  skipSubscription,
  updatePaymentMethod,
  pauseSubscription,
  cancelSubscription,
  processExpiredSubscriptions,
}
