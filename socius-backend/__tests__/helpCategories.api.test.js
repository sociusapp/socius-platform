const express = require('express')
const mongoose = require('mongoose')
const request = require('supertest')
const { MongoMemoryServer } = require('mongodb-memory-server')

jest.mock('../src/middlewares/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'test-admin', role: 'admin' }
    next()
  },
  requireActive: (req, res, next) => next(),
}))

jest.mock('../src/middlewares/admin', () => ({
  requireAdmin: (req, res, next) => next(),
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

describe('Help categories API', () => {
  test('GET /api/help-categories returns seeded list', async () => {
    const res = await request(app).get('/api/help-categories')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data.items')
    expect(Array.isArray(res.body.data.items)).toBe(true)
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(10)
  })

  test('GET /api/admin/help-categories returns list', async () => {
    const res = await request(app).get('/api/admin/help-categories')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(Array.isArray(res.body.data.items)).toBe(true)
  })

  test('POST /api/admin/help-categories creates category', async () => {
    const res = await request(app)
      .post('/api/admin/help-categories')
      .field('name', 'New Category')
      .field('slug', 'new_category')
      .field('description', 'Short desc')
      .field('sortOrder', '99')
      .field('isActive', 'true')
      .attach('icon', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'icon.png', contentType: 'image/png' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body).toHaveProperty('data.category.slug', 'new_category')
    expect(res.body).toHaveProperty('data.category.name', 'New Category')
  })

  test('POST /api/admin/help-categories rejects duplicate slug', async () => {
    const first = await request(app)
      .post('/api/admin/help-categories')
      .field('name', 'Dup A')
      .field('slug', 'dup_slug')

    expect(first.status).toBe(201)

    const second = await request(app)
      .post('/api/admin/help-categories')
      .field('name', 'Dup B')
      .field('slug', 'dup_slug')

    expect(second.status).toBe(409)
    expect(second.body).toHaveProperty('success', false)
  })

  test('PUT /api/admin/help-categories/:id updates category', async () => {
    const created = await request(app)
      .post('/api/admin/help-categories')
      .field('name', 'To Update')
      .field('slug', 'to_update')

    expect(created.status).toBe(201)
    const id = created.body.data.category._id

    const updated = await request(app)
      .put(`/api/admin/help-categories/${encodeURIComponent(id)}`)
      .field('name', 'Updated Name')
      .field('sortOrder', '5')
      .field('isActive', 'false')

    expect(updated.status).toBe(200)
    expect(updated.body).toHaveProperty('success', true)
    expect(updated.body.data.category.name).toBe('Updated Name')
    expect(updated.body.data.category.isActive).toBe(false)
  })

  test('GET /api/admin/help-categories/:id returns category', async () => {
    const created = await request(app)
      .post('/api/admin/help-categories')
      .field('name', 'Read One')
      .field('slug', 'read_one')

    const id = created.body.data.category._id
    const res = await request(app).get(`/api/admin/help-categories/${encodeURIComponent(id)}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body.data.category.slug).toBe('read_one')
  })

  test('DELETE /api/admin/help-categories/:id disables category', async () => {
    const created = await request(app)
      .post('/api/admin/help-categories')
      .field('name', 'Disable Me')
      .field('slug', 'disable_me')

    const id = created.body.data.category._id
    const res = await request(app).delete(`/api/admin/help-categories/${encodeURIComponent(id)}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('success', true)
    expect(res.body.data.category.isActive).toBe(false)

    const publicList = await request(app).get('/api/help-categories')
    const slugs = publicList.body.data.items.map((c) => c.slug)
    expect(slugs.includes('disable_me')).toBe(false)
  })
})
