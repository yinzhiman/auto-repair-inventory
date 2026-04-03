import { Router, Request, Response } from 'express'
import { requireAuth } from '../middlewares/auth'
import {
  createOrder,
  getOrderById,
  getOrders,
  updateOrder,
  completeOrder,
  cancelOrder,
  getMonthlyDueOrders,
} from '../services/order.service'

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const { keyword, status, customerId, vehicleId, startDate, endDate, page, pageSize } = req.query

    const result = await getOrders({
      keyword: keyword ? String(keyword) : undefined,
      status: status ? String(status) : undefined,
      customerId: customerId ? Number(customerId) : undefined,
      vehicleId: vehicleId ? Number(vehicleId) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Get orders error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.get('/monthly-due', async (req: Request, res: Response) => {
  try {
    const { date } = req.query
    const targetDate = date ? new Date(String(date)) : new Date()

    const list = await getMonthlyDueOrders(targetDate)

    res.json({ success: true, data: { list, total: list.length } })
  } catch (error) {
    console.error('Get monthly due orders error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const order = await getOrderById(Number(id))

    if (!order) {
      res.status(404).json({ success: false, message: '工单不存在' })
      return
    }

    res.json({ success: true, data: order })
  } catch (error) {
    console.error('Get order error:', error)
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await createOrder(req.body)

    res.json({
      success: true,
      data: result.order,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
    })
  } catch (error: any) {
    console.error('Create order error:', error)
    if (error.message === '客户信息不能为空' || error.message === '车辆信息不能为空') {
      res.status(400).json({ success: false, message: error.message })
      return
    }
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const order = await updateOrder(Number(id), req.body)

    res.json({ success: true, data: order })
  } catch (error: any) {
    console.error('Update order error:', error)
    if (error.message === '工单不存在') {
      res.status(404).json({ success: false, message: error.message })
      return
    }
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const order = await completeOrder(Number(id), req.body)

    res.json({ success: true, data: order })
  } catch (error: any) {
    console.error('Complete order error:', error)
    if (
      error.message === '工单不存在' ||
      error.message === '工单已取消，无法结算' ||
      error.message === '工单已完成，无法重复结算' ||
      error.message.includes('会员余额不足')
    ) {
      res.status(400).json({ success: false, message: error.message })
      return
    }
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const result = await cancelOrder(Number(id), req.body)

    res.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Cancel order error:', error)
    if (
      error.message === '工单不存在' ||
      error.message === '工单已完成，无法取消' ||
      error.message === '工单已取消'
    ) {
      res.status(400).json({ success: false, message: error.message })
      return
    }
    res.status(500).json({ success: false, message: '服务器错误' })
  }
})

export default router
