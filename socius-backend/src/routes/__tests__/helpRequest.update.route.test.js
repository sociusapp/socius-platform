const express = require('express')
const mongoose = require('mongoose')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.mock('../../config/redis', () => ({
  updateHelpRequestLocation: jest.fn().mockResolvedValue(undefined),
  getNearbyHelpRequestIds: jest.fn().mockResolvedValue([]),
  removeHelpRequestLocation: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: req.headers['x-test-user-id'], accountStatus: 'active' }
    next()
  },
  requireActive: (req, res, next) => next(),
  requireVerified: (req, res, next) => next(),
}))

jest.mock('../../services/notification.service', () => ({
  sendHelpRequestAlert: jest.fn().mockResolvedValue(undefined),
  sendMatchedNotification: jest.fn().mockResolvedValue(undefined),
  sendCancelAlert: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../services/location.service', () => ({
  findHelpersForRequest: jest.fn().mockResolvedValue([]),
}))

jest.mock('../../services/communityBalance.service', () => ({
  updateCommunityBalance: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../services/chat.service', () => ({
  createSessionForRequest: jest.fn().mockResolvedValue(null),
}))

jest.mock('../../config/socket', () => ({
  emitToUser: jest.fn(),
}))

const HelpRequest = require('../../models/HelpRequest')
const helpRequestRoutes = require('../helpRequest.routes')

describe('PATCH /help-request/:id', () => {
  let mongo
  let app

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create()
    await mongoose.connect(mongo.getUri())

    app = express()
    app.use(express.json())
    app.use('/help-request', helpRequestRoutes)
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({ success: false, message: err.message, code: err.code, data: err.data })
    })
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongo.stop()
  })

  beforeEach(async () => {
    await HelpRequest.deleteMany({})
  })

  test('updates existing request in DB and keeps same requestId (no duplicate)', async () => {
    const requesterId = new mongoose.Types.ObjectId()
    const created = await HelpRequest.create({
      requesterId,
      category: 'carry_lift',
      description: 'old desc',
      location: { type: 'Point', coordinates: [85.0, 26.0], address: null, whereToFindText: null },
      status: 'open',
      itemReturnRequired: false,
    })

    const beforeCount = await HelpRequest.countDocuments({ requesterId })

    const res = await request(app)
      .patch(`/help-request/${created._id}`)
      .set('x-test-user-id', String(requesterId))
      .send({ description: 'new desc' })
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(String(res.body.data.request._id)).toBe(String(created._id))

    const afterCount = await HelpRequest.countDocuments({ requesterId })
    expect(beforeCount).toBe(1)
    expect(afterCount).toBe(1)

    const db = await HelpRequest.findById(created._id).lean()
    expect(db.description).toBe('new desc')
  })
})

