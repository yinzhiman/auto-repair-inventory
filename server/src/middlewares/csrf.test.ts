import { describe, it, expect, beforeEach, vi } from 'vitest'
import express, { Request } from 'express'
import request from 'supertest'
import { csrfMiddleware } from '../middlewares/csrf'

vi.mock('../utils/csrf', () => ({
  generateCsrfToken: () => 'test-csrf-token-12345',
  validateCsrfToken: (token: string, stored: string) => token === stored,
}))

const app = express()
app.use(express.json())

let sessionCsrfToken: string | null = null

app.use((req: Request, _res, next) => {
  ;(req as any).session = { csrfToken: sessionCsrfToken }
  next()
})

app.use(csrfMiddleware)

app.get('/test', (_req, res) => res.json({ ok: true }))
app.post('/test', (_req, res) => res.json({ ok: true }))

describe('csrf middleware', () => {
  beforeEach(() => {
    sessionCsrfToken = 'test-csrf-token-12345'
  })

  it('should allow GET requests without CSRF token', async () => {
    const res = await request(app).get('/test')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('should allow POST requests with valid CSRF token', async () => {
    const res = await request(app)
      .post('/test')
      .send({ csrfToken: 'test-csrf-token-12345' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('should block POST requests without CSRF token', async () => {
    const res = await request(app).post('/test').send({})
    expect(res.status).toBe(403)
  })

  it('should block POST requests with invalid CSRF token', async () => {
    const res = await request(app)
      .post('/test')
      .send({ csrfToken: 'wrong-token' })
    expect(res.status).toBe(403)
  })
})
