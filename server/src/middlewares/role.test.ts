import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { requireRole } from './role'

const createApp = () => {
  const app = express()
  app.use(express.json())

  app.get('/admin-only', (req, _res, next) => {
    (req as any).user = { id: 1, username: 'admin', name: '管理员', role: 'boss' }
    next()
  }, requireRole('boss'), (_req, res) => {
    res.json({ success: true })
  })

  app.get('/employee-access', (req, _res, next) => {
    (req as any).user = { id: 2, username: 'employee', name: '员工', role: 'employee' }
    next()
  }, requireRole('employee'), (_req, res) => {
    res.json({ success: true })
  })

  app.get('/admin-required', (req, _res, next) => {
    (req as any).user = { id: 2, username: 'employee', name: '员工', role: 'employee' }
    next()
  }, requireRole('boss'), (_req, res) => {
    res.json({ success: true })
  })

  return app
}

describe('role middleware', () => {
  it('should allow boss to access boss-only route', async () => {
    const app = createApp()
    const res = await request(app).get('/admin-only')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('should allow employee to access employee route', async () => {
    const app = createApp()
    const res = await request(app).get('/employee-access')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('should block employee from boss-only route', async () => {
    const app = createApp()
    const res = await request(app).get('/admin-required')

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('无权限访问')
  })
})
