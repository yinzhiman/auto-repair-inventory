import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app'
import prisma from '../config/database'
import { hashPassword } from '../utils/password'

describe('Orders API', () => {
  let cookies: string[]
  let customerId: number
  let vehicleId: number
  let partId: number

  beforeAll(async () => {
    await prisma.stockLog.deleteMany({})
    await prisma.orderItem.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.part.deleteMany({})
    await prisma.vehicle.deleteMany({})
    await prisma.customer.deleteMany({})

    await prisma.user.upsert({
      where: { username: 'testorderuser' },
      update: {},
      create: {
        username: 'testorderuser',
        password: await hashPassword('123456'),
        name: '测试用户',
        role: 'employee',
        status: 'active',
      },
    })

    const loginRes = await request(app).post('/api/auth/login').send({
      account: 'testorderuser',
      password: '123456',
    })
    cookies = loginRes.headers['set-cookie'] as unknown as string[]

    const customer = await prisma.customer.create({
      data: { name: '测试客户', phone: '13800138000' },
    })
    customerId = customer.id

    const vehicle = await prisma.vehicle.create({
      data: { plateNumber: '京A12345', brand: '大众', model: '朗逸', customerId },
    })
    vehicleId = vehicle.id

    const part = await prisma.part.create({
      data: { name: '机油', stock: 100, sellPrice: 50 },
    })
    partId = part.id
  })

  afterAll(async () => {
    await prisma.stockLog.deleteMany({})
    await prisma.orderItem.deleteMany({})
    await prisma.order.deleteMany({})
    await prisma.part.deleteMany({})
    await prisma.vehicle.deleteMany({})
    await prisma.customer.deleteMany({})
    await prisma.user.deleteMany({ where: { username: 'testorderuser' } })
    await prisma.$disconnect()
  })

  describe('POST /api/orders', () => {
    it('should create order with existing customer', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', cookies)
        .send({
          customer: { id: customerId },
          vehicle: { id: vehicleId },
          items: [{ itemName: '检查费', type: 'labor', quantity: 1, price: 100 }],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.customerId).toBe(customerId)
      expect(res.body.data.vehicleId).toBe(vehicleId)
    })

    it('should create order with new customer and vehicle', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', cookies)
        .send({
          customer: { name: '新客户', phone: '13900139000' },
          vehicle: { plateNumber: '京B88888', brand: '丰田', model: '卡罗拉' },
          items: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 200 }],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.customer.name).toBe('新客户')
      expect(res.body.data.vehicle.plateNumber).toBe('京B88888')
    })

    it('should deduct stock when adding part item', async () => {
      const partBefore = await prisma.part.findUnique({ where: { id: partId } })
      const stockBefore = partBefore!.stock

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', cookies)
        .send({
          customer: { id: customerId },
          vehicle: { id: vehicleId },
          items: [{ partId, itemName: '机油', type: 'part', quantity: 2, price: 50 }],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const part = await prisma.part.findUnique({ where: { id: partId } })
      expect(part?.stock).toBe(stockBefore - 2)
    })

    it('should return warning when stock is insufficient', async () => {
      const partBefore = await prisma.part.findUnique({ where: { id: partId } })
      const hugeQuantity = partBefore!.stock + 100

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', cookies)
        .send({
          customer: { id: customerId },
          vehicle: { id: vehicleId },
          items: [{ partId, itemName: '机油', type: 'part', quantity: hugeQuantity, price: 50 }],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.warnings).toBeDefined()
      expect(res.body.warnings.length).toBeGreaterThan(0)
    })

    it('should return 400 when customer info is missing', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', cookies)
        .send({
          vehicle: { id: vehicleId },
          items: [{ itemName: '检查费', type: 'labor', quantity: 1, price: 100 }],
        })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('客户信息不能为空')
    })

    it('should set price to 0 when not provided', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', cookies)
        .send({
          customer: { id: customerId },
          vehicle: { id: vehicleId },
          items: [{ itemName: '免费检查', type: 'labor', quantity: 1 }],
        })

      expect(res.status).toBe(200)
      expect(res.body.data.items[0].price).toBe(0)
    })
  })

  describe('GET /api/orders', () => {
    it('should return order list', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.list)).toBe(true)
    })

    it('should filter by keyword', async () => {
      const res = await request(app)
        .get('/api/orders?keyword=测试')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/orders?status=pending')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('GET /api/orders/:id', () => {
    it('should return order detail', async () => {
      const orders = await prisma.order.findMany({ take: 1 })
      expect(orders.length).toBeGreaterThan(0)
      const orderId = orders[0].id

      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBe(orderId)
    })

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .get('/api/orders/99999')
        .set('Cookie', cookies)

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('工单不存在')
    })
  })

  describe('PUT /api/orders/:id', () => {
    it('should update order items and recalculate total', async () => {
      const orders = await prisma.order.findMany({ where: { status: 'pending' }, take: 1 })
      expect(orders.length).toBeGreaterThan(0)
      const orderId = orders[0].id

      const res = await request(app)
        .put(`/api/orders/${orderId}`)
        .set('Cookie', cookies)
        .send({
          items: [
            { itemName: '工时费', type: 'labor', quantity: 2, price: 150 },
            { itemName: '材料费', type: 'labor', quantity: 1, price: 80 },
          ],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.totalAmount).toBe(380)
    })

    it('should handle stock changes when updating part items', async () => {
      const partBefore = await prisma.part.findUnique({ where: { id: partId } })
      const stockBefore = partBefore!.stock

      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-TEST-STOCK',
          customerId,
          vehicleId,
          items: {
            create: [{ partId, itemName: '机油', type: 'part', quantity: 2, price: 50, amount: 100 }],
          },
        },
      })

      const res = await request(app)
        .put(`/api/orders/${order.id}`)
        .set('Cookie', cookies)
        .send({
          items: [{ partId, itemName: '机油', type: 'part', quantity: 4, price: 50 }],
        })

      expect(res.status).toBe(200)

      const partAfter = await prisma.part.findUnique({ where: { id: partId } })
      expect(partAfter?.stock).toBe(stockBefore - 2)
    })

    it('should return stock when removing part item', async () => {
      const partBefore = await prisma.part.findUnique({ where: { id: partId } })
      const stockBefore = partBefore!.stock

      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-TEST-REMOVE',
          customerId,
          vehicleId,
          items: {
            create: [{ partId, itemName: '机油', type: 'part', quantity: 3, price: 50, amount: 150 }],
          },
        },
      })

      const res = await request(app)
        .put(`/api/orders/${order.id}`)
        .set('Cookie', cookies)
        .send({
          items: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 100 }],
        })

      expect(res.status).toBe(200)

      const partAfter = await prisma.part.findUnique({ where: { id: partId } })
      expect(partAfter?.stock).toBe(stockBefore + 3)
    })

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .put('/api/orders/99999')
        .set('Cookie', cookies)
        .send({ items: [] })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/orders/:id/complete', () => {
    it('should complete order with cash payment', async () => {
      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-COMPLETE-CASH',
          customerId,
          vehicleId,
          totalAmount: 100,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 100, amount: 100 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/complete`)
        .set('Cookie', cookies)
        .send({ paymentType: 'cash' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('completed')
      expect(res.body.data.paymentType).toBe('cash')
      expect(res.body.data.completedAt).toBeDefined()
    })

    it('should complete order with wechat payment', async () => {
      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-COMPLETE-WECHAT',
          customerId,
          vehicleId,
          totalAmount: 200,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 200, amount: 200 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/complete`)
        .set('Cookie', cookies)
        .send({ paymentType: 'wechat' })

      expect(res.status).toBe(200)
      expect(res.body.data.paymentType).toBe('wechat')
    })

    it('should complete order with alipay payment', async () => {
      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-COMPLETE-ALIPAY',
          customerId,
          vehicleId,
          totalAmount: 150,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 150, amount: 150 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/complete`)
        .set('Cookie', cookies)
        .send({ paymentType: 'alipay' })

      expect(res.status).toBe(200)
      expect(res.body.data.paymentType).toBe('alipay')
    })

    it('should complete order with member balance', async () => {
      const customer = await prisma.customer.create({
        data: { name: '会员客户', phone: '13800000001', balance: 500 },
      })

      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-COMPLETE-MEMBER',
          customerId: customer.id,
          vehicleId,
          totalAmount: 300,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 300, amount: 300 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/complete`)
        .set('Cookie', cookies)
        .send({ paymentType: 'member' })

      expect(res.status).toBe(200)
      expect(res.body.data.paymentType).toBe('member')

      const updatedCustomer = await prisma.customer.findUnique({ where: { id: customer.id } })
      expect(updatedCustomer?.balance).toBe(200)
    })

    it('should reject member payment when balance insufficient', async () => {
      const customer = await prisma.customer.create({
        data: { name: '余额不足客户', phone: '13800000002', balance: 50 },
      })

      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-COMPLETE-INSUFF',
          customerId: customer.id,
          vehicleId,
          totalAmount: 300,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 300, amount: 300 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/complete`)
        .set('Cookie', cookies)
        .send({ paymentType: 'member' })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('会员余额不足')
    })

    it('should complete order with monthly payment and set due date', async () => {
      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-COMPLETE-MONTHLY',
          customerId,
          vehicleId,
          totalAmount: 500,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 500, amount: 500 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/complete`)
        .set('Cookie', cookies)
        .send({ paymentType: 'monthly' })

      expect(res.status).toBe(200)
      expect(res.body.data.paymentType).toBe('monthly')
      expect(res.body.data.dueDate).toBeDefined()

      const dueDate = new Date(res.body.data.dueDate)
      const expectedDueDate = new Date()
      expectedDueDate.setDate(expectedDueDate.getDate() + 30)
      expect(dueDate.toDateString()).toBe(expectedDueDate.toDateString())
    })

    it('should reject complete for cancelled order', async () => {
      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-COMPLETE-CANCELLED',
          customerId,
          vehicleId,
          status: 'cancelled',
          totalAmount: 100,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 100, amount: 100 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/complete`)
        .set('Cookie', cookies)
        .send({ paymentType: 'cash' })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('已取消')
    })
  })

  describe('POST /api/orders/:id/cancel', () => {
    it('should cancel order and return stock', async () => {
      const partBefore = await prisma.part.findUnique({ where: { id: partId } })
      const stockBefore = partBefore!.stock

      const createRes = await request(app)
        .post('/api/orders')
        .set('Cookie', cookies)
        .send({
          customer: { id: customerId },
          vehicle: { id: vehicleId },
          items: [{ partId, itemName: '机油', type: 'part', quantity: 3, price: 50 }],
        })

      expect(createRes.status).toBe(200)

      const partAfterCreate = await prisma.part.findUnique({ where: { id: partId } })
      expect(partAfterCreate?.stock).toBe(stockBefore - 3)

      const res = await request(app)
        .post(`/api/orders/${createRes.body.data.id}/cancel`)
        .set('Cookie', cookies)
        .send({ returnStock: true })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.order.status).toBe('cancelled')
      expect(res.body.data.returnedStock).toHaveLength(1)
      expect(res.body.data.returnedStock[0].partId).toBe(partId)
      expect(res.body.data.returnedStock[0].quantity).toBe(3)

      const partAfter = await prisma.part.findUnique({ where: { id: partId } })
      expect(partAfter?.stock).toBe(stockBefore)

      const stockLog = await prisma.stockLog.findFirst({
        where: { orderId: createRes.body.data.id, type: 'in' },
      })
      expect(stockLog?.reason).toBe('取消工单退回')
    })

    it('should cancel order without returning stock', async () => {
      const partBefore = await prisma.part.findUnique({ where: { id: partId } })
      const stockBefore = partBefore!.stock

      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-CANCEL-NORETURN',
          customerId,
          vehicleId,
          totalAmount: 100,
          items: { create: [{ partId, itemName: '机油', type: 'part', quantity: 2, price: 50, amount: 100 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/cancel`)
        .set('Cookie', cookies)
        .send({ returnStock: false })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.order.status).toBe('cancelled')
      expect(res.body.data.returnedStock).toHaveLength(0)

      const partAfter = await prisma.part.findUnique({ where: { id: partId } })
      expect(partAfter?.stock).toBe(stockBefore)
    })

    it('should reject cancel for completed order', async () => {
      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-CANCEL-COMPLETED',
          customerId,
          vehicleId,
          status: 'completed',
          totalAmount: 100,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 100, amount: 100 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/cancel`)
        .set('Cookie', cookies)
        .send({ returnStock: true })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('已完成')
    })

    it('should reject cancel for already cancelled order', async () => {
      const order = await prisma.order.create({
        data: {
          orderNo: 'WO-CANCEL-DUP',
          customerId,
          vehicleId,
          status: 'cancelled',
          totalAmount: 100,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 100, amount: 100 }] },
        },
      })

      const res = await request(app)
        .post(`/api/orders/${order.id}/cancel`)
        .set('Cookie', cookies)
        .send({ returnStock: true })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('已取消')
    })
  })

  describe('GET /api/orders/monthly-due', () => {
    it('should return monthly due orders for today', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const customer = await prisma.customer.create({
        data: { name: '月结客户', phone: '13800000003' },
      })

      await prisma.order.create({
        data: {
          orderNo: 'WO-MONTHLY-TODAY',
          customerId: customer.id,
          vehicleId,
          status: 'completed',
          paymentType: 'monthly',
          totalAmount: 500,
          paidAmount: 0,
          dueDate: today,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 500, amount: 500 }] },
        },
      })

      const res = await request(app)
        .get('/api/orders/monthly-due')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.list)).toBe(true)
      expect(res.body.data.list.length).toBeGreaterThan(0)
      expect(res.body.data.list[0].paymentType).toBe('monthly')
    })

    it('should not return fully paid monthly orders', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const customer = await prisma.customer.create({
        data: { name: '已付清客户', phone: '13800000004' },
      })

      await prisma.order.create({
        data: {
          orderNo: 'WO-MONTHLY-PAID',
          customerId: customer.id,
          vehicleId,
          status: 'completed',
          paymentType: 'monthly',
          totalAmount: 500,
          paidAmount: 500,
          dueDate: today,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 500, amount: 500 }] },
        },
      })

      const res = await request(app)
        .get('/api/orders/monthly-due')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      const paidOrder = res.body.data.list.find((o: any) => o.orderNo === 'WO-MONTHLY-PAID')
      expect(paidOrder).toBeUndefined()
    })

    it('should not return non-monthly orders', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const customer = await prisma.customer.create({
        data: { name: '现金客户', phone: '13800000005' },
      })

      await prisma.order.create({
        data: {
          orderNo: 'WO-CASH-NOTDUE',
          customerId: customer.id,
          vehicleId,
          status: 'completed',
          paymentType: 'cash',
          totalAmount: 300,
          paidAmount: 0,
          dueDate: today,
          items: { create: [{ itemName: '工时费', type: 'labor', quantity: 1, price: 300, amount: 300 }] },
        },
      })

      const res = await request(app)
        .get('/api/orders/monthly-due')
        .set('Cookie', cookies)

      expect(res.status).toBe(200)
      const cashOrder = res.body.data.list.find((o: any) => o.orderNo === 'WO-CASH-NOTDUE')
      expect(cashOrder).toBeUndefined()
    })
  })
})
