import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import prisma from '../config/database'
import { generateOrderNo } from './order-no'

describe('generateOrderNo', () => {
  let customerId: number
  let vehicleId: number

  beforeAll(async () => {
    await prisma.order.deleteMany({})
    await prisma.vehicle.deleteMany({})
    await prisma.customer.deleteMany({})

    const customer = await prisma.customer.create({
      data: { name: '测试客户', phone: '13800138000' },
    })
    customerId = customer.id

    const vehicle = await prisma.vehicle.create({
      data: { plateNumber: '京A00000', customerId },
    })
    vehicleId = vehicle.id
  })

  afterAll(async () => {
    await prisma.order.deleteMany({})
    await prisma.vehicle.deleteMany({})
    await prisma.customer.deleteMany({})
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.order.deleteMany({})
  })

  it('should return format WO-YYYYMMDD-XXX', async () => {
    const orderNo = await generateOrderNo()
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    expect(orderNo).toBe(`WO-${today}-001`)
  })

  it('should increment sequence for same day', async () => {
    const orderNo1 = await generateOrderNo()
    await prisma.order.create({
      data: {
        orderNo: orderNo1,
        customerId,
        vehicleId,
      },
    })

    const orderNo2 = await generateOrderNo()
    expect(orderNo2.slice(-3)).toBe('002')
  })

  it('should reset sequence for new day', async () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')

    await prisma.order.create({
      data: {
        orderNo: `WO-${yesterday}-999`,
        customerId,
        vehicleId,
      },
    })

    const orderNo = await generateOrderNo()
    expect(orderNo).toBe(`WO-${today}-001`)
  })
})
