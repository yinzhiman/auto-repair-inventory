import { Router, Request, Response } from 'express'
import prisma from '../config/database'
import { requireAuth } from '../middlewares/auth'

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const { keyword, category, supplierId, lowStock, page = 1, pageSize = 20 } = req.query

    const where: any = {}

    if (keyword) {
      where.OR = [
        { name: { contains: String(keyword) } },
        { spec: { contains: String(keyword) } },
      ]
    }

    if (category) {
      where.category = String(category)
    }

    if (supplierId) {
      where.supplierId = Number(supplierId)
    }

    const parts = await prisma.part.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
      },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.part.count({ where })

    const list = parts.map((part) => ({
      ...part,
      isLowStock: part.stock < part.minStock,
    }))

    if (lowStock === 'true') {
      const filteredList = list.filter((p) => p.isLowStock)
      res.json({
        success: true,
        data: {
          list: filteredList,
          total: filteredList.length,
          page: Number(page),
          pageSize: Number(pageSize),
        },
      })
      return
    }

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) },
    })
  } catch (error) {
    console.error('Get parts error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.get('/low-stock', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query

    const parts = await prisma.part.findMany({
      where: {
        stock: { lt: prisma.part.fields.minStock },
      },
      select: {
        id: true,
        name: true,
        category: true,
        stock: true,
        minStock: true,
      },
      take: Number(limit),
    })

    const list = parts.map((part) => ({
      ...part,
      shortage: part.minStock - part.stock,
    }))

    res.json({
      success: true,
      data: { list, total: list.length },
    })
  } catch (error) {
    console.error('Get low stock error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const part = await prisma.part.findUnique({
      where: { id: Number(id) },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    })

    if (!part) {
      res.status(404).json({ success: false, message: '配件不存在' })
      return
    }

    res.json({
      success: true,
      data: {
        ...part,
        isLowStock: part.stock < part.minStock,
      },
    })
  } catch (error) {
    console.error('Get part error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, category, spec, unit, costPrice, sellPrice, minStock, supplierId } = req.body

    if (!name || name.trim() === '') {
      res.status(400).json({ success: false, message: '配件名称不能为空' })
      return
    }

    const part = await prisma.part.create({
      data: {
        name: name.trim(),
        category,
        spec,
        unit,
        costPrice: costPrice ?? 0,
        sellPrice: sellPrice ?? 0,
        minStock: minStock ?? 0,
        supplierId,
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    })

    res.json({
      success: true,
      data: {
        ...part,
        isLowStock: part.stock < part.minStock,
      },
    })
  } catch (error) {
    console.error('Create part error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, category, spec, unit, costPrice, sellPrice, minStock, supplierId } = req.body

    const existingPart = await prisma.part.findUnique({
      where: { id: Number(id) },
    })

    if (!existingPart) {
      res.status(404).json({ success: false, message: '配件不存在' })
      return
    }

    const part = await prisma.part.update({
      where: { id: Number(id) },
      data: {
        name,
        category,
        spec,
        unit,
        costPrice,
        sellPrice,
        minStock,
        supplierId,
      },
    })

    res.json({
      success: true,
      data: {
        ...part,
        isLowStock: part.stock < part.minStock,
      },
    })
  } catch (error) {
    console.error('Update part error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const part = await prisma.part.findUnique({
      where: { id: Number(id) },
    })

    if (!part) {
      res.status(404).json({ success: false, message: '配件不存在' })
      return
    }

    const logCount = await prisma.stockLog.count({
      where: { partId: Number(id) },
    })

    if (logCount > 0) {
      res.status(400).json({
        success: false,
        message: '该配件有出入库记录，无法删除',
      })
      return
    }

    await prisma.part.delete({
      where: { id: Number(id) },
    })

    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('Delete part error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.post('/:id/stock-in', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { source, quantity, costPrice, supplierId, reason } = req.body

    if (!quantity || quantity <= 0) {
      res.status(400).json({ success: false, message: '数量必须大于0' })
      return
    }

    const part = await prisma.part.findUnique({
      where: { id: Number(id) },
    })

    if (!part) {
      res.status(404).json({ success: false, message: '配件不存在' })
      return
    }

    const result = await prisma.$transaction([
      prisma.part.update({
        where: { id: Number(id) },
        data: { stock: { increment: quantity } },
      }),
      prisma.stockLog.create({
        data: {
          partId: Number(id),
          type: 'in',
          source,
          quantity,
          costPrice,
          supplierId,
          reason,
        },
      }),
    ])

    res.json({ success: true, data: result[1] })
  } catch (error) {
    console.error('Stock in error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.post('/:id/stock-out', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { outType, quantity, orderId, reason } = req.body

    if (!quantity || quantity <= 0) {
      res.status(400).json({ success: false, message: '数量必须大于0' })
      return
    }

    const part = await prisma.part.findUnique({
      where: { id: Number(id) },
    })

    if (!part) {
      res.status(404).json({ success: false, message: '配件不存在' })
      return
    }

    const result = await prisma.$transaction([
      prisma.part.update({
        where: { id: Number(id) },
        data: { stock: { decrement: quantity } },
      }),
      prisma.stockLog.create({
        data: {
          partId: Number(id),
          type: 'out',
          outType,
          quantity,
          orderId,
          reason,
        },
      }),
    ])

    res.json({ success: true, data: result[1] })
  } catch (error) {
    console.error('Stock out error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.get('/:id/stock-logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { page = 1, pageSize = 20 } = req.query

    const logs = await prisma.stockLog.findMany({
      where: { partId: Number(id) },
      include: {
        supplier: { select: { id: true, name: true } },
        order: { select: { id: true, orderNo: true } },
      },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
      orderBy: { createdAt: 'desc' },
    })

    const total = await prisma.stockLog.count({
      where: { partId: Number(id) },
    })

    res.json({
      success: true,
      data: { list: logs, total, page: Number(page), pageSize: Number(pageSize) },
    })
  } catch (error) {
    console.error('Get stock logs error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

export default router
