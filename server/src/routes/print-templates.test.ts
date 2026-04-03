import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../app'
import prisma from '../config/database'
import { hashPassword } from '../utils/password'

describe('Print Templates API', () => {
  let cookies: string[]

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { username: 'testprintuser' },
      update: {},
      create: {
        username: 'testprintuser',
        password: await hashPassword('123456'),
        name: '测试用户',
        role: 'employee',
        status: 'active',
      },
    })

    const loginRes = await request(app).post('/api/auth/login').send({
      account: 'testprintuser',
      password: '123456',
    })
    cookies = loginRes.headers['set-cookie'] as unknown as string[]
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.printTemplate.deleteMany()
  })

  describe('GET /api/print-templates', () => {
    it('should return empty list when no templates', async () => {
      const res = await request(app).get('/api/print-templates').set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.list).toEqual([])
      expect(res.body.data.total).toBe(0)
    })

    it('should return template list', async () => {
      await prisma.printTemplate.createMany({
        data: [
          { name: '标准维修单', type: 'repair', content: '{}', isDefault: true },
          { name: '简易维修单', type: 'repair', content: '{}', isDefault: false },
        ],
      })

      const res = await request(app).get('/api/print-templates').set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.list).toHaveLength(2)
      expect(res.body.data.total).toBe(2)
    })

    it('should filter by type', async () => {
      await prisma.printTemplate.createMany({
        data: [
          { name: '维修单模板', type: 'repair', content: '{}', isDefault: true },
          { name: '其他模板', type: 'other', content: '{}', isDefault: false },
        ],
      })

      const res = await request(app)
        .get('/api/print-templates?type=repair')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.list).toHaveLength(1)
      expect(res.body.data.list[0].type).toBe('repair')
    })
  })

  describe('GET /api/print-templates/:id', () => {
    it('should return template by id', async () => {
      const template = await prisma.printTemplate.create({
        data: { name: '测试模板', type: 'repair', content: '{"title":"维修单"}', isDefault: true },
      })

      const res = await request(app)
        .get(`/api/print-templates/${template.id}`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('测试模板')
      expect(res.body.data.content).toBe('{"title":"维修单"}')
    })

    it('should return 404 for non-existent template', async () => {
      const res = await request(app).get('/api/print-templates/999').set('Cookie', cookies)

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('模板不存在')
    })
  })

  describe('POST /api/print-templates', () => {
    it('should create template', async () => {
      const res = await request(app)
        .post('/api/print-templates')
        .set('Cookie', cookies)
        .send({
          name: '新模板',
          type: 'repair',
          content: '{"title":"维修单"}',
        })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('新模板')
      expect(res.body.data.isDefault).toBe(false)
    })

    it('should create default template and unset other defaults', async () => {
      await prisma.printTemplate.create({
        data: { name: '旧默认', type: 'repair', content: '{}', isDefault: true },
      })

      const res = await request(app)
        .post('/api/print-templates')
        .set('Cookie', cookies)
        .send({
          name: '新默认',
          type: 'repair',
          content: '{}',
          isDefault: true,
        })

      expect(res.status).toBe(200)
      expect(res.body.data.isDefault).toBe(true)

      const templates = await prisma.printTemplate.findMany()
      const defaultCount = templates.filter((t) => t.isDefault).length
      expect(defaultCount).toBe(1)
    })

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/print-templates')
        .set('Cookie', cookies)
        .send({
          type: 'repair',
          content: '{}',
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('模板名称不能为空')
    })
  })

  describe('PUT /api/print-templates/:id', () => {
    it('should update template', async () => {
      const template = await prisma.printTemplate.create({
        data: { name: '原名称', type: 'repair', content: '{}', isDefault: false },
      })

      const res = await request(app)
        .put(`/api/print-templates/${template.id}`)
        .set('Cookie', cookies)
        .send({ name: '新名称' })

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('新名称')
    })

    it('should set as default and unset others', async () => {
      const template1 = await prisma.printTemplate.create({
        data: { name: '模板1', type: 'repair', content: '{}', isDefault: true },
      })
      const template2 = await prisma.printTemplate.create({
        data: { name: '模板2', type: 'repair', content: '{}', isDefault: false },
      })

      const res = await request(app)
        .put(`/api/print-templates/${template2.id}`)
        .set('Cookie', cookies)
        .send({ isDefault: true })

      expect(res.status).toBe(200)
      expect(res.body.data.isDefault).toBe(true)

      const oldDefault = await prisma.printTemplate.findUnique({
        where: { id: template1.id },
      })
      expect(oldDefault?.isDefault).toBe(false)
    })

    it('should return 404 for non-existent template', async () => {
      const res = await request(app)
        .put('/api/print-templates/999')
        .set('Cookie', cookies)
        .send({ name: '新名称' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/print-templates/:id', () => {
    it('should delete template', async () => {
      const template = await prisma.printTemplate.create({
        data: { name: '待删除', type: 'repair', content: '{}', isDefault: false },
      })

      const res = await request(app)
        .delete(`/api/print-templates/${template.id}`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('删除成功')

      const deleted = await prisma.printTemplate.findUnique({
        where: { id: template.id },
      })
      expect(deleted).toBeNull()
    })

    it('should return 404 for non-existent template', async () => {
      const res = await request(app).delete('/api/print-templates/999').set('Cookie', cookies)

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/print-templates/default', () => {
    it('should return default template', async () => {
      await prisma.printTemplate.create({
        data: { name: '默认模板', type: 'repair', content: '{"title":"维修单"}', isDefault: true },
      })

      const res = await request(app)
        .get('/api/print-templates/default?type=repair')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('默认模板')
    })

    it('should return 404 when no default template', async () => {
      const res = await request(app)
        .get('/api/print-templates/default?type=repair')
        .set('Cookie', cookies)

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('未设置默认模板')
    })
  })
})
