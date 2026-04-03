import prisma from '../config/database'
import { generateOrderNo } from '../utils/order-no'
import type {
  CreateOrderInput,
  UpdateOrderInput,
  CompleteOrderInput,
  CancelOrderInput,
} from '../types/order.types'

export interface CreateOrderResult {
  order: any
  warnings: string[]
}

export async function createOrder(data: CreateOrderInput): Promise<CreateOrderResult> {
  const { customer: customerInput, vehicle: vehicleInput, mileage, items, remark } = data

  if (!customerInput || (!customerInput.id && !customerInput.name)) {
    throw new Error('客户信息不能为空')
  }

  if (!vehicleInput || (!vehicleInput.id && !vehicleInput.plateNumber)) {
    throw new Error('车辆信息不能为空')
  }

  let customer = customerInput.id
    ? await prisma.customer.findUnique({ where: { id: customerInput.id } })
    : null

  if (!customer && customerInput.name) {
    customer = await prisma.customer.create({
      data: {
        name: customerInput.name,
        phone: customerInput.phone,
      },
    })
  }

  if (!customer) {
    throw new Error('客户不存在')
  }

  let vehicle = vehicleInput.id
    ? await prisma.vehicle.findUnique({ where: { id: vehicleInput.id } })
    : null

  if (!vehicle && vehicleInput.plateNumber) {
    vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: vehicleInput.plateNumber,
        brand: vehicleInput.brand,
        model: vehicleInput.model,
        customerId: customer.id,
      },
    })
  }

  if (!vehicle) {
    throw new Error('车辆不存在')
  }

  const orderNo = await generateOrderNo()
  const warnings: string[] = []
  let totalAmount = 0

  const processedItems = items.map((item) => {
    const quantity = item.quantity || 1
    const price = item.price || 0
    const amount = quantity * price
    totalAmount += amount
    return {
      ...item,
      quantity,
      price,
      amount,
    }
  })

  for (const item of processedItems) {
    if (item.partId) {
      const part = await prisma.part.findUnique({ where: { id: item.partId } })
      if (part && part.stock < item.quantity) {
        warnings.push(`配件"${part.name}"库存不足，当前库存${part.stock}个`)
      }
    }
  }

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNo,
        customerId: customer!.id,
        vehicleId: vehicle!.id,
        mileage,
        totalAmount,
        remark,
        items: {
          create: processedItems.map((item) => ({
            partId: item.partId,
            itemName: item.itemName,
            type: item.type,
            quantity: item.quantity,
            price: item.price,
            amount: item.amount,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
        vehicle: true,
      },
    })

    for (const item of processedItems) {
      if (item.partId) {
        await tx.part.update({
          where: { id: item.partId },
          data: { stock: { decrement: item.quantity } },
        })
        await tx.stockLog.create({
          data: {
            partId: item.partId,
            type: 'out',
            outType: 'repair',
            quantity: item.quantity,
            orderId: newOrder.id,
            reason: '维修领用',
          },
        })
      }
    }

    return newOrder
  })

  return { order, warnings }
}

export async function getOrderById(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      vehicle: true,
      items: {
        include: {
          part: {
            select: { id: true, name: true, stock: true },
          },
        },
      },
    },
  })
}

export async function getOrders(params: {
  keyword?: string
  status?: string
  customerId?: number
  vehicleId?: number
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) {
  const {
    keyword,
    status,
    customerId,
    vehicleId,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = params

  const where: any = {}

  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { customer: { name: { contains: keyword } } },
      { vehicle: { plateNumber: { contains: keyword } } },
    ]
  }

  if (status) {
    where.status = status
  }

  if (customerId) {
    where.customerId = customerId
  }

  if (vehicleId) {
    where.vehicleId = vehicleId
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      where.createdAt.gte = new Date(startDate)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  const [list, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
        items: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where }),
  ])

  return { list, total, page, pageSize }
}

export async function updateOrder(id: number, data: UpdateOrderInput) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { where: { partId: { not: null } } } },
  })

  if (!order) {
    throw new Error('工单不存在')
  }

  const { items, mileage, remark } = data

  if (items) {
    const oldPartItems = order.items.filter((item) => item.partId)
    const newPartItems = items.filter((item) => item.partId)

    const stockChanges: Map<number, number> = new Map()

    for (const oldItem of oldPartItems) {
      if (oldItem.partId) {
        stockChanges.set(oldItem.partId, (stockChanges.get(oldItem.partId) || 0) + oldItem.quantity)
      }
    }

    for (const newItem of newPartItems) {
      if (newItem.partId) {
        stockChanges.set(newItem.partId, (stockChanges.get(newItem.partId) || 0) - (newItem.quantity || 1))
      }
    }

    let totalAmount = 0
    const processedItems = items.map((item) => {
      const quantity = item.quantity || 1
      const price = item.price || 0
      const amount = quantity * price
      totalAmount += amount
      return { ...item, quantity, price, amount }
    })

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: id } })

      await tx.order.update({
        where: { id },
        data: {
          totalAmount,
          mileage,
          remark,
        },
      })

      for (const item of processedItems) {
        await tx.orderItem.create({
          data: {
            orderId: id,
            partId: item.partId,
            itemName: item.itemName,
            type: item.type,
            quantity: item.quantity,
            price: item.price,
            amount: item.amount,
          },
        })
      }

      for (const [partId, change] of stockChanges) {
        if (change !== 0) {
          await tx.part.update({
            where: { id: partId },
            data: { stock: { increment: change } },
          })

          if (change > 0) {
            await tx.stockLog.create({
              data: {
                partId,
                type: 'in',
                source: 'other',
                quantity: change,
                orderId: id,
                reason: '修改工单退回',
              },
            })
          } else {
            await tx.stockLog.create({
              data: {
                partId,
                type: 'out',
                outType: 'repair',
                quantity: -change,
                orderId: id,
                reason: '修改工单领用',
              },
            })
          }
        }
      }
    })
  } else {
    await prisma.order.update({
      where: { id },
      data: { mileage, remark },
    })
  }

  return getOrderById(id)
}

export async function completeOrder(id: number, data: CompleteOrderInput) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true },
  })

  if (!order) {
    throw new Error('工单不存在')
  }

  if (order.status === 'cancelled') {
    throw new Error('工单已取消，无法结算')
  }

  if (order.status === 'completed') {
    throw new Error('工单已完成，无法重复结算')
  }

  const { paymentType, paidAmount } = data
  let dueDate: Date | null = null

  if (paymentType === 'member') {
    if (!order.customer) {
      throw new Error('客户信息不存在')
    }
    if (order.customer.balance < order.totalAmount) {
      throw new Error(`会员余额不足，当前余额${order.customer.balance}元`)
    }
    await prisma.customer.update({
      where: { id: order.customerId },
      data: { balance: { decrement: order.totalAmount } },
    })
  } else if (paymentType === 'monthly') {
    dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
  }

  return prisma.order.update({
    where: { id },
    data: {
      status: 'completed',
      paymentType,
      paidAmount: paidAmount ?? order.totalAmount,
      completedAt: new Date(),
      dueDate,
    },
    include: {
      customer: true,
      vehicle: true,
      items: true,
    },
  })
}

export async function cancelOrder(id: number, data: CancelOrderInput) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { where: { partId: { not: null } } } },
  })

  if (!order) {
    throw new Error('工单不存在')
  }

  if (order.status === 'completed') {
    throw new Error('工单已完成，无法取消')
  }

  if (order.status === 'cancelled') {
    throw new Error('工单已取消')
  }

  const returnedStock: { partId: number; partName: string; quantity: number }[] = []

  if (data.returnStock) {
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.partId) {
          await tx.part.update({
            where: { id: item.partId },
            data: { stock: { increment: item.quantity } },
          })
          await tx.stockLog.create({
            data: {
              partId: item.partId,
              type: 'in',
              source: 'other',
              quantity: item.quantity,
              orderId: order.id,
              reason: '取消工单退回',
            },
          })
          returnedStock.push({
            partId: item.partId,
            partName: item.itemName,
            quantity: item.quantity,
          })
        }
      }
    })
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { status: 'cancelled' },
    include: {
      customer: true,
      vehicle: true,
      items: true,
    },
  })

  return { order: updatedOrder, returnedStock }
}

export async function getMonthlyDueOrders(date?: Date) {
  const targetDate = date || new Date()
  const today = new Date(targetDate)
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return prisma.order.findMany({
    where: {
      paymentType: 'monthly',
      dueDate: { gte: today, lt: tomorrow },
      paidAmount: { lt: prisma.order.fields.totalAmount },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { dueDate: 'asc' },
  })
}
