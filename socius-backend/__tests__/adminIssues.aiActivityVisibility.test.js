const express = require('express')
const mongoose = require('mongoose')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.mock('../src/utils/issueSync', () => ({
  syncIssuesToFile: async () => {},
}))

jest.mock('../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    const kind = String(req.headers['x-test-user'] || 'admin').toLowerCase()
    if (kind === 'developer') {
      req.user = { _id: 'test-dev', role: 'developer', isDeveloper: true }
    } else {
      req.user = { _id: 'test-admin', role: 'admin', isDeveloper: false }
    }
    next()
  },
  requireActive: (req, res, next) => next(),
}))

jest.mock('../src/middlewares/admin', () => ({
  requireAdmin: (req, res, next) => next(),
  requireDeveloper: (req, res, next) => {
    if (req.user?.isDeveloper) return next()
    return res.status(403).json({ success: false, message: 'Developer access required' })
  },
  requireAdminOrDeveloper: (req, res, next) => next(),
}))

const routes = require('../src/routes')
const { notFoundHandler, errorHandler } = require('../src/middlewares/errorHandler')

let mongo
let app

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri(), { dbName: 'test' })

  app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use('/api', routes)
  app.use(notFoundHandler)
  app.use(errorHandler)
})

afterAll(async () => {
  await mongoose.disconnect()
  if (mongo) await mongo.stop()
})

describe('Admin issues: AI activity visible to admin but labeled as Developer', () => {
  test('ai-complete creates an activity that admin can see as Developer', async () => {
    const Issue = require('../src/models/Issue')
    const issue = await Issue.create({
      title: 'Test Issue',
      description: 'Test description',
      category: 'Bug',
      priority: 'Medium',
      platform: 'Admin Panel',
      flow: 'General',
      aiEnabled: true,
      status: 'In Progress',
      activity: [
        {
          type: 'status',
          text: 'Issue reported',
          user: 'Admin',
          visibility: 'both',
          time: new Date(),
        },
        {
          type: 'system',
          text: 'Legacy AI message',
          user: 'AI',
          visibility: 'developer',
          time: new Date(),
        },
      ],
    })

    const aiComplete = await request(app)
      .post(`/api/admin-issues/${encodeURIComponent(issue._id)}/ai-complete`)
      .set('x-test-user', 'developer')
      .send({ activityText: 'Fixed by automation' })

    expect(aiComplete.status).toBe(200)
    expect(aiComplete.body).toHaveProperty('success', true)

    const asAdmin = await request(app)
      .get(`/api/admin-issues/${encodeURIComponent(issue._id)}`)
      .set('x-test-user', 'admin')

    expect(asAdmin.status).toBe(200)
    expect(asAdmin.body).toHaveProperty('success', true)
    const adminActivities = asAdmin.body?.data?.activity || []
    expect(
      adminActivities.some((a) => a?.text === 'Fixed by automation' && a?.user === 'Developer')
    ).toBe(true)
    expect(
      adminActivities.some((a) => a?.text === 'Legacy AI message' && a?.user === 'Developer')
    ).toBe(true)

    const asDev = await request(app)
      .get(`/api/admin-issues/${encodeURIComponent(issue._id)}`)
      .set('x-test-user', 'developer')

    expect(asDev.status).toBe(200)
    expect(asDev.body).toHaveProperty('success', true)
    const devActivities = asDev.body?.data?.activity || []
    expect(
      devActivities.some((a) => a?.text === 'Fixed by automation' && a?.user === 'AI')
    ).toBe(true)
    expect(
      devActivities.some((a) => a?.text === 'Legacy AI message' && a?.user === 'AI')
    ).toBe(true)
  })

  test('admin can mark issue as Completed or Pending (but not In Progress)', async () => {
    const Issue = require('../src/models/Issue')
    const issue = await Issue.create({
      title: 'Admin status toggle',
      description: 'Test description',
      category: 'Bug',
      priority: 'Medium',
      platform: 'Admin Panel',
      flow: 'General',
      aiEnabled: false,
      status: 'Pending',
      activity: [],
    })

    const toCompleted = await request(app)
      .patch(`/api/admin-issues/${encodeURIComponent(issue._id)}`)
      .set('x-test-user', 'admin')
      .send({ status: 'Completed' })
    expect(toCompleted.status).toBe(200)
    expect(toCompleted.body).toHaveProperty('success', true)
    expect(toCompleted.body.data.status).toBe('Completed')

    const toPending = await request(app)
      .patch(`/api/admin-issues/${encodeURIComponent(issue._id)}`)
      .set('x-test-user', 'admin')
      .send({ status: 'Pending' })
    expect(toPending.status).toBe(200)
    expect(toPending.body).toHaveProperty('success', true)
    expect(toPending.body.data.status).toBe('Pending')

    const toInProgress = await request(app)
      .patch(`/api/admin-issues/${encodeURIComponent(issue._id)}`)
      .set('x-test-user', 'admin')
      .send({ status: 'In Progress' })
    expect(toInProgress.status).toBe(403)
    expect(toInProgress.body).toHaveProperty('success', false)
  })
})
