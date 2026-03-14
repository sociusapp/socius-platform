const mongoose = require('mongoose')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Call = require('../../models/Call')
const CallEvent = require('../../models/CallEvent')
const { trackFromSocket, logSignalRelay } = require('../callTracking.service')

describe('callTracking', () => {
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
    await Call.deleteMany({})
    await CallEvent.deleteMany({})
  })

  test('trackFromSocket upserts a single Call per callKey and appends events', async () => {
    const callerId = String(new mongoose.Types.ObjectId())
    const calleeId = String(new mongoose.Types.ObjectId())
    const callId = 'call_123'

    await trackFromSocket(callerId, {
      callId,
      peerUserId: calleeId,
      direction: 'outgoing',
      eventType: 'attempt',
      occurredAt: new Date('2026-03-14T00:00:00.000Z').toISOString(),
    })

    await trackFromSocket(calleeId, {
      callId,
      peerUserId: callerId,
      direction: 'incoming',
      eventType: 'ringing',
      occurredAt: new Date('2026-03-14T00:00:02.000Z').toISOString(),
    })

    const calls = await Call.find({ callKey: callId }).lean()
    expect(calls.length).toBe(1)
    expect(String(calls[0].callerId)).toBe(String(callerId))
    expect(String(calls[0].calleeId)).toBe(String(calleeId))

    const events = await CallEvent.find({ callKey: callId }).lean()
    expect(events.length).toBeGreaterThanOrEqual(2)
  })

  test('logSignalRelay does not create duplicate Call documents for same callKey', async () => {
    const callerId = String(new mongoose.Types.ObjectId())
    const calleeId = String(new mongoose.Types.ObjectId())
    const callKey = 'call_abc'

    await logSignalRelay({ callKey, fromUserId: callerId, toUserId: calleeId, type: 'offer', data: { sdp: 'x' }, occurredAt: new Date() })
    await logSignalRelay({ callKey, fromUserId: callerId, toUserId: calleeId, type: 'ice', data: { candidate: 'y' }, occurredAt: new Date() })

    const calls = await Call.find({ callKey }).lean()
    expect(calls.length).toBe(1)
  })

  test('durationSec is computed when ended and startedAt/answeredAt exist', async () => {
    const callerId = String(new mongoose.Types.ObjectId())
    const calleeId = String(new mongoose.Types.ObjectId())
    const callId = 'call_dur'

    await trackFromSocket(callerId, {
      callId,
      peerUserId: calleeId,
      direction: 'outgoing',
      eventType: 'attempt',
      occurredAt: new Date('2026-03-14T00:00:00.000Z').toISOString(),
    })

    await trackFromSocket(callerId, {
      callId,
      peerUserId: calleeId,
      direction: 'outgoing',
      eventType: 'ended',
      occurredAt: new Date('2026-03-14T00:00:10.500Z').toISOString(),
    })

    const call = await Call.findOne({ callKey: callId }).lean()
    expect(call.durationSec).toBe(10)
  })
})

