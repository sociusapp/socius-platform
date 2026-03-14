const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.mock('../../config/redis', () => ({
  updateHelpRequestLocation: jest.fn().mockResolvedValue(undefined),
  getNearbyHelpRequestIds: jest.fn().mockResolvedValue([]),
  removeHelpRequestLocation: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../notification.service', () => ({
  sendHelpRequestAlert: jest.fn().mockResolvedValue(undefined),
  sendMatchedNotification: jest.fn().mockResolvedValue(undefined),
  sendCancelAlert: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../location.service', () => ({
  findHelpersForRequest: jest.fn().mockResolvedValue([]),
}))

jest.mock('../communityBalance.service', () => ({
  updateCommunityBalance: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../chat.service', () => ({
  createSessionForRequest: jest.fn().mockResolvedValue(null),
}))

jest.mock('../../config/socket', () => ({
  emitToUser: jest.fn(),
}))

const HelpRequest = require('../../models/HelpRequest')
const helpRequestService = require('../helpRequest.service')

describe('helpRequestService.updateRequest', () => {
  let mongo

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create()
    await mongoose.connect(mongo.getUri())
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongo.stop()
  })

  beforeEach(async () => {
    await HelpRequest.deleteMany({})
  })

  test('updates the existing request and keeps the same requestId (no duplicate created)', async () => {
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

    const updated = await helpRequestService.updateRequest(requesterId, created._id, {
      description: 'new desc',
    })

    const afterCount = await HelpRequest.countDocuments({ requesterId })
    expect(beforeCount).toBe(1)
    expect(afterCount).toBe(1)
    expect(String(updated._id)).toBe(String(created._id))

    const db = await HelpRequest.findById(created._id).lean()
    expect(db.description).toBe('new desc')
  })

  test('throws 409 when request is not updatable and does not create a new record', async () => {
    const requesterId = new mongoose.Types.ObjectId()
    const created = await HelpRequest.create({
      requesterId,
      category: 'carry_lift',
      description: 'old desc',
      location: { type: 'Point', coordinates: [85.0, 26.0], address: null, whereToFindText: null },
      status: 'matched',
      itemReturnRequired: false,
    })

    const beforeCount = await HelpRequest.countDocuments({ requesterId })

    await expect(
      helpRequestService.updateRequest(requesterId, created._id, { description: 'new desc' })
    ).rejects.toMatchObject({ statusCode: 409, code: 'REQUEST_NOT_UPDATABLE' })

    const afterCount = await HelpRequest.countDocuments({ requesterId })
    expect(beforeCount).toBe(1)
    expect(afterCount).toBe(1)
  })

  test('throws 404 when request does not exist for requester', async () => {
    const requesterId = new mongoose.Types.ObjectId()
    const otherId = new mongoose.Types.ObjectId()
    const created = await HelpRequest.create({
      requesterId: otherId,
      category: 'carry_lift',
      description: 'old desc',
      location: { type: 'Point', coordinates: [85.0, 26.0], address: null, whereToFindText: null },
      status: 'open',
      itemReturnRequired: false,
    })

    const beforeCount = await HelpRequest.countDocuments({})

    await expect(
      helpRequestService.updateRequest(requesterId, created._id, { description: 'new desc' })
    ).rejects.toMatchObject({ statusCode: 404 })

    const afterCount = await HelpRequest.countDocuments({})
    expect(beforeCount).toBe(1)
    expect(afterCount).toBe(1)
  })
})

