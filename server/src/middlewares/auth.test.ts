import { describe, it, expect, beforeEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { authMiddleware, requireAuth } from './auth'
import prisma from '../config/database'
import { generateToken } from '../utils/jwt'
import crypto from 'crypto'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

vi.mock('../config/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

const createApp = () => {
  const app = express()
  app.use(express.json())

  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie
    if (cookieHeader) {
      const cookies: Record<string, string> = {}
      cookieHeader.split(';').forEach((cookie) => {
        const [name, value] = cookie.trim().split('=')
        cookies[name] = value
      })
      ;(req as any).cookies = cookies
    } else {
      (req as any).cookies = {}
    }
    next()
  })

  app.use(authMiddleware)

  app.get('/protected', requireAuth, (req, res) => {
    res.json({ success: true, user: (req as any).user })
  })

  return app
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should pass for valid token with matching tokenHash', async () => {
    const token = generateToken({ userId: 1, role: 'boss' })
    const tokenHash = hashToken(token)

    ;(prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'boss',
      status: 'active',
      tokenHash,
    })

    const app = createApp()
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `token=${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.user.id).toBe(1)
  })

  it('should return 401 for missing token', async () => {
    const app = createApp()
    const res = await request(app).get('/protected')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('未登录')
  })

  it('should return 401 for invalid JWT', async () => {
    const app = createApp()
    const res = await request(app)
      .get('/protected')
      .set('Cookie', 'token=invalid-token')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('登录已失效')
  })

  it('should return 401 for tokenHash mismatch', async () => {
    const token = generateToken({ userId: 1, role: 'boss' })

    ;(prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'boss',
      status: 'active',
      tokenHash: 'different-hash',
    })

    const app = createApp()
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `token=${token}`)

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('登录已失效')
  })

  it('should return 401 for disabled user', async () => {
    const token = generateToken({ userId: 1, role: 'boss' })
    const tokenHash = hashToken(token)

    ;(prisma.user.findUnique as any).mockResolvedValue({
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'boss',
      status: 'disabled',
      tokenHash,
    })

    const app = createApp()
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `token=${token}`)

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('该账号已被禁用')
  })
})
