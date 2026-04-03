import { Router, Request, Response } from 'express'
import { requireAuth } from '../middlewares/auth'
import prisma from '../config/database'

const router = Router()

router.use(requireAuth)

router.get('/', async (_req: Request, res: Response) => {
  try {
    const list = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        balance: true,
        createdAt: true,
      },
    })

    res.json({ success: true, data: list })
  } catch (error) {
    console.error('Get customers error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.get('/:id/vehicles', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const vehicles = await prisma.vehicle.findMany({
      where: { customerId: Number(id) },
      select: {
        id: true,
        plateNumber: true,
        brand: true,
        model: true,
      },
    })

    res.json({ success: true, data: vehicles })
  } catch (error) {
    console.error('Get customer vehicles error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, address } = req.body

    if (!name) {
      res.status(400).json({ success: false, message: '客户名称不能为空' })
      return
    }

    const customer = await prisma.customer.create({
      data: { name, phone, address },
    })

    res.json({ success: true, data: customer })
  } catch (error) {
    console.error('Create customer error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

export default router
