import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app'
import prisma from '../config/database'
import { hashPassword } from '../utils/password'

describe('Parts API', () => {
  let cookies: string[]

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { username: 'parts_test_user' },
      update: {},
      create: {
        username: 'parts_test_user',
        password: await hashPassword('123456'),
        name: '配件测试用户',
        role: 'boss',
        status: 'active',
      },
    })

    const loginRes = await request(app).post('/api/auth/login').send({
      account: 'parts_test_user',
      password: '123456',
    })
    cookies = loginRes.headers['set-cookie'] as unknown as string[]
  })

  afterAll(async () => {
    await prisma.stockLog.deleteMany({})
    await prisma.part.deleteMany({
      where: { name: { contains: '测试' } },
    })
    await prisma.user.delete({
      where: { username: 'parts_test_user' },
    })
    await prisma.$disconnect()
  })

  describe('POST /api/parts', () => {
    it('AC-001: 新增配件成功', async () => {
      const res = await request(app)
        .post('/api/parts')
        .set('Cookie', cookies)
        .send({
          name: '测试机油滤芯',
          category: '滤芯类',
          costPrice: 15,
          sellPrice: 25,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBeDefined()
      expect(res.body.data.name).toBe('测试机油滤芯')
      expect(res.body.data.category).toBe('滤芯类')
      expect(res.body.data.costPrice).toBe(15)
      expect(res.body.data.sellPrice).toBe(25)
      expect(res.body.data.stock).toBe(0)
    })

    it('AC-002: 新增配件时仅填写名称', async () => {
      const res = await request(app)
        .post('/api/parts')
        .set('Cookie', cookies)
        .send({
          name: '测试刹车片',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe('测试刹车片')
      expect(res.body.data.costPrice).toBe(0)
      expect(res.body.data.sellPrice).toBe(0)
      expect(res.body.data.stock).toBe(0)
    })

    it('AC-002: 名称未填写时返回错误', async () => {
      const res = await request(app)
        .post('/api/parts')
        .set('Cookie', cookies)
        .send({})

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('配件名称不能为空')
    })
  })

  describe('PUT /api/parts/:id', () => {
    let partId: number

    beforeAll(async () => {
      const part = await prisma.part.create({
        data: {
          name: '测试修改配件',
          costPrice: 15,
          sellPrice: 25,
        },
      })
      partId = part.id
    })

    it('AC-003: 修改配件信息成功', async () => {
      const res = await request(app)
        .put(`/api/parts/${partId}`)
        .set('Cookie', cookies)
        .send({
          costPrice: 18,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.costPrice).toBe(18)
    })

    it('修改不存在的配件返回404', async () => {
      const res = await request(app)
        .put('/api/parts/999999')
        .set('Cookie', cookies)
        .send({ name: 'test' })

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('配件不存在')
    })
  })

  describe('DELETE /api/parts/:id', () => {
    let partWithoutLogs: number
    let partWithLogs: number

    beforeAll(async () => {
      const part1 = await prisma.part.create({
        data: { name: '测试删除配件-无流水' },
      })
      partWithoutLogs = part1.id

      const part2 = await prisma.part.create({
        data: { name: '测试删除配件-有流水', stock: 10 },
      })
      partWithLogs = part2.id

      await prisma.stockLog.create({
        data: {
          partId: part2.id,
          type: 'in',
          quantity: 10,
        },
      })
    })

    it('AC-004: 删除配件成功', async () => {
      const res = await request(app)
        .delete(`/api/parts/${partWithoutLogs}`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('AC-017: 有流水记录的配件无法删除', async () => {
      const res = await request(app)
        .delete(`/api/parts/${partWithLogs}`)
        .set('Cookie', cookies)

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('该配件有出入库记录，无法删除')
    })

    it('删除不存在的配件返回404', async () => {
      const res = await request(app)
        .delete('/api/parts/999999')
        .set('Cookie', cookies)

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toContain('配件不存在')
    })
  })

  describe('GET /api/parts', () => {
    beforeAll(async () => {
      await prisma.part.createMany({
        data: [
          { name: '测试滤芯-机油', category: '滤芯类', stock: 10, minStock: 5 },
          { name: '测试滤芯-空气', category: '滤芯类', stock: 3, minStock: 5 },
          { name: '测试刹车片', category: '刹车系统', stock: 2, minStock: 10 },
        ],
      })
    })

    it('AC-005: 按分类筛选配件', async () => {
      const res = await request(app)
        .get('/api/parts')
        .query({ category: '滤芯类' })
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.list.every((p: any) => p.category === '滤芯类')).toBe(true)
    })

    it('AC-006: 关键词搜索配件', async () => {
      const res = await request(app)
        .get('/api/parts')
        .query({ keyword: '滤芯' })
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.list.length).toBeGreaterThan(0)
      expect(
        res.body.data.list.every((p: any) => p.name.includes('滤芯'))
      ).toBe(true)
    })

    it('AC-014: 列表返回 isLowStock 字段', async () => {
      const res = await request(app)
        .get('/api/parts')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.list[0].isLowStock).toBeDefined()
    })

    it('AC-014: 库存预警筛选', async () => {
      const res = await request(app)
        .get('/api/parts')
        .query({ lowStock: 'true' })
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.list.every((p: any) => p.isLowStock === true)).toBe(true)
    })

    it('分页查询', async () => {
      const res = await request(app)
        .get('/api/parts')
        .query({ page: '1', pageSize: '10' })
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.page).toBe(1)
      expect(res.body.data.pageSize).toBe(10)
      expect(res.body.data.total).toBeDefined()
    })
  })

  describe('GET /api/parts/:id', () => {
    let partId: number

    beforeAll(async () => {
      const part = await prisma.part.create({
        data: { name: '测试详情配件', stock: 3, minStock: 5 },
      })
      partId = part.id
    })

    it('AC-015: 获取配件详情成功', async () => {
      const res = await request(app)
        .get(`/api/parts/${partId}`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe('测试详情配件')
      expect(res.body.data.isLowStock).toBe(true)
    })

    it('获取不存在的配件返回404', async () => {
      const res = await request(app)
        .get('/api/parts/999999')
        .set('Cookie', cookies)

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/parts/:id/stock-in', () => {
    let partId: number

    beforeAll(async () => {
      const part = await prisma.part.create({
        data: { name: '测试入库配件', stock: 10 },
      })
      partId = part.id
    })

    it('AC-007: 采购入库成功', async () => {
      const res = await request(app)
        .post(`/api/parts/${partId}/stock-in`)
        .set('Cookie', cookies)
        .send({
          source: 'purchase',
          quantity: 5,
          costPrice: 15,
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.source).toBe('purchase')
      expect(res.body.data.quantity).toBe(5)

      const part = await prisma.part.findUnique({ where: { id: partId } })
      expect(part?.stock).toBe(15)
    })

    it('AC-008: 客户自带入库成功', async () => {
      const res = await request(app)
        .post(`/api/parts/${partId}/stock-in`)
        .set('Cookie', cookies)
        .send({
          source: 'customer',
          quantity: 1,
        })

      expect(res.status).toBe(200)
      expect(res.body.data.source).toBe('customer')
    })

    it('AC-009: 二手再利用入库成功', async () => {
      const res = await request(app)
        .post(`/api/parts/${partId}/stock-in`)
        .set('Cookie', cookies)
        .send({
          source: 'used',
          quantity: 1,
        })

      expect(res.status).toBe(200)
      expect(res.body.data.source).toBe('used')
    })

    it('AC-019: 入库数量为0时返回错误', async () => {
      const res = await request(app)
        .post(`/api/parts/${partId}/stock-in`)
        .set('Cookie', cookies)
        .send({
          source: 'purchase',
          quantity: 0,
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('数量必须大于0')
    })

    it('AC-019: 入库数量为负数时返回错误', async () => {
      const res = await request(app)
        .post(`/api/parts/${partId}/stock-in`)
        .set('Cookie', cookies)
        .send({
          source: 'purchase',
          quantity: -1,
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('数量必须大于0')
    })

    it('入库不存在的配件返回404', async () => {
      const res = await request(app)
        .post('/api/parts/999999/stock-in')
        .set('Cookie', cookies)
        .send({
          source: 'purchase',
          quantity: 1,
        })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/parts/:id/stock-out', () => {
    let partId: number

    beforeAll(async () => {
      const part = await prisma.part.create({
        data: { name: '测试出库配件', stock: 10 },
      })
      partId = part.id
    })

    it('AC-010: 维修领用出库成功（不关联工单）', async () => {
      const res = await request(app)
        .post(`/api/parts/${partId}/stock-out`)
        .set('Cookie', cookies)
        .send({
          outType: 'repair',
          quantity: 2,
        })

      expect(res.status).toBe(200)
      expect(res.body.data.outType).toBe('repair')
      expect(res.body.data.quantity).toBe(2)

      const part = await prisma.part.findUnique({ where: { id: partId } })
      expect(part?.stock).toBe(8)
    })

    it('AC-011: 维修领用出库成功（不关联工单）', async () => {
      const res = await request(app)
        .post(`/api/parts/${partId}/stock-out`)
        .set('Cookie', cookies)
        .send({
          outType: 'repair',
          quantity: 1,
        })

      expect(res.status).toBe(200)
      expect(res.body.data.orderId).toBeNull()
    })

    it('AC-012: 报损出库成功', async () => {
      const res = await request(app)
        .post(`/api/parts/${partId}/stock-out`)
        .set('Cookie', cookies)
        .send({
          outType: 'damage',
          quantity: 1,
          reason: '配件损坏',
        })

      expect(res.status).toBe(200)
      expect(res.body.data.outType).toBe('damage')
      expect(res.body.data.reason).toBe('配件损坏')
    })

    it('AC-018/AC-023: 出库数量超过库存允许负数', async () => {
      const part = await prisma.part.create({
        data: { name: '测试负库存配件', stock: 5 },
      })

      const res = await request(app)
        .post(`/api/parts/${part.id}/stock-out`)
        .set('Cookie', cookies)
        .send({
          outType: 'repair',
          quantity: 10,
        })

      expect(res.status).toBe(200)
      const updatedPart = await prisma.part.findUnique({ where: { id: part.id } })
      expect(updatedPart?.stock).toBe(-5)
    })

    it('出库数量为0时返回错误', async () => {
      const res = await request(app)
        .post(`/api/parts/${partId}/stock-out`)
        .set('Cookie', cookies)
        .send({
          outType: 'repair',
          quantity: 0,
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('数量必须大于0')
    })
  })

  describe('GET /api/parts/low-stock', () => {
    beforeAll(async () => {
      await prisma.part.createMany({
        data: [
          { name: '测试预警配件1', stock: 2, minStock: 10 },
          { name: '测试预警配件2', stock: 5, minStock: 10 },
        ],
      })
    })

    it('AC-013: 获取库存预警列表', async () => {
      const res = await request(app)
        .get('/api/parts/low-stock')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.list.length).toBeGreaterThan(0)
      expect(res.body.data.list[0].shortage).toBeDefined()
    })

    it('限制返回条数', async () => {
      const res = await request(app)
        .get('/api/parts/low-stock')
        .query({ limit: '1' })
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.list.length).toBeLessThanOrEqual(1)
    })
  })

  describe('GET /api/parts/:id/stock-logs', () => {
    let partId: number

    beforeAll(async () => {
      const part = await prisma.part.create({
        data: { name: '测试流水配件', stock: 10 },
      })
      partId = part.id

      await prisma.stockLog.createMany({
        data: [
          { partId: part.id, type: 'in', source: 'purchase', quantity: 10 },
          { partId: part.id, type: 'out', outType: 'repair', quantity: 2 },
        ],
      })
    })

    it('AC-016: 获取库存流水成功', async () => {
      const res = await request(app)
        .get(`/api/parts/${partId}/stock-logs`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.list.length).toBe(2)
      expect(res.body.data.list[0].type).toBeDefined()
    })

    it('流水按时间倒序排列', async () => {
      const res = await request(app)
        .get(`/api/parts/${partId}/stock-logs`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      const dates = res.body.data.list.map((l: any) => new Date(l.createdAt).getTime())
      expect(dates).toEqual([...dates].sort((a, b) => b - a))
    })

    it('流水分页查询', async () => {
      const res = await request(app)
        .get(`/api/parts/${partId}/stock-logs`)
        .query({ page: '1', pageSize: '10' })
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.data.page).toBe(1)
      expect(res.body.data.pageSize).toBe(10)
    })
  })
})
