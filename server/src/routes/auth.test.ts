import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import prisma from '../config/database'
import { hashPassword } from '../utils/password'

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await prisma.user.create({
      data: {
        username: 'testuser',
        password: await hashPassword('123456'),
        name: '测试用户',
        role: 'employee',
        status: 'active',
      },
    })
    await prisma.user.create({
      data: {
        username: 'testboss',
        password: await hashPassword('123456'),
        phone: '13800138001',
        name: '测试管理员',
        role: 'boss',
        status: 'active',
      },
    })
    await prisma.user.create({
      data: {
        username: 'disableduser',
        password: await hashPassword('123456'),
        name: '禁用用户',
        role: 'employee',
        status: 'disabled',
      },
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        username: {
          in: ['testuser', 'testboss', 'disableduser'],
        },
      },
    })
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.user.update({
      where: { username: 'testuser' },
      data: { loginErrorCount: 0, lockedUntil: null },
    })
  })

  it('AC-001: 用户名登录成功', async () => {
    const res = await request(app).post('/api/auth/login').send({
      account: 'testuser',
      password: '123456',
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.username).toBe('testuser')
    expect(res.body.data.role).toBe('employee')
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('AC-002: 手机号登录成功', async () => {
    const res = await request(app).post('/api/auth/login').send({
      account: '13800138001',
      password: '123456',
    })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.username).toBe('testboss')
  })

  it('AC-006: 用户名不存在', async () => {
    const res = await request(app).post('/api/auth/login').send({
      account: 'notexist',
      password: '123456',
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe('用户名不存在')
  })

  it('AC-007: 手机号未注册', async () => {
    const res = await request(app).post('/api/auth/login').send({
      account: '19999999999',
      password: '123456',
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe('该手机号未注册')
  })

  it('AC-008: 密码错误', async () => {
    const res = await request(app).post('/api/auth/login').send({
      account: 'testuser',
      password: 'wrongpwd',
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toContain('密码错误')
  })

  it('AC-009: 密码错误次数提示', async () => {
    await request(app).post('/api/auth/login').send({
      account: 'testuser',
      password: 'wrong1',
    })
    const res = await request(app).post('/api/auth/login').send({
      account: 'testuser',
      password: 'wrong2',
    })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('还可以尝试')
  })

  it('AC-013: 账号被禁用', async () => {
    const res = await request(app).post('/api/auth/login').send({
      account: 'disableduser',
      password: '123456',
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe('该账号已被禁用，请联系管理员')
  })

  it('AC-011: 手机号格式错误', async () => {
    const res = await request(app).post('/api/auth/login').send({
      account: '12345',
      password: '123456',
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe('请输入正确的手机号格式')
  })

  it('AC-012: 密码长度不足', async () => {
    const res = await request(app).post('/api/auth/login').send({
      account: 'testuser',
      password: '123',
    })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toBe('密码至少需要6位')
  })

  it('AC-003: 登出成功', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      account: 'testuser',
      password: '123456',
    })
    const cookies = loginRes.headers['set-cookie']
    expect(cookies).toBeDefined()

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toBe('登出成功')
  })
})
