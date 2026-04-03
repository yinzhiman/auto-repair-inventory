import { Router } from 'express'
import {
  getTemplates,
  getTemplateById,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../services/print-template.service'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query
    const result = await getTemplates(type as string)
    res.json({ data: result })
  } catch (error) {
    next(error)
  }
})

router.get('/default', async (req, res, next) => {
  try {
    const { type } = req.query
    if (!type) {
      return res.status(400).json({ message: '模板类型不能为空' })
    }
    const template = await getDefaultTemplate(type as string)
    if (!template) {
      return res.status(404).json({ message: '未设置默认模板' })
    }
    res.json({ data: template })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const template = await getTemplateById(id)
    if (!template) {
      return res.status(404).json({ message: '模板不存在' })
    }
    res.json({ data: template })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const template = await createTemplate(req.body)
    res.json({ data: template })
  } catch (error) {
    if (error instanceof Error && error.message === '模板名称不能为空') {
      return res.status(400).json({ message: error.message })
    }
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const template = await updateTemplate(id, req.body)
    if (!template) {
      return res.status(404).json({ message: '模板不存在' })
    }
    res.json({ data: template })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const result = await deleteTemplate(id)
    if (!result) {
      return res.status(404).json({ message: '模板不存在' })
    }
    res.json({ message: '删除成功' })
  } catch (error) {
    next(error)
  }
})

export default router
