import prisma from '../config/database'

export async function generateOrderNo(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `WO-${dateStr}-`

  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNo: { startsWith: prefix },
    },
    orderBy: { orderNo: 'desc' },
  })

  let seq = 1
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNo.slice(-3), 10)
    seq = lastSeq + 1
  }

  return `${prefix}${seq.toString().padStart(3, '0')}`
}
