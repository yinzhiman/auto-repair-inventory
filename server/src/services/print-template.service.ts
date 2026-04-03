import prisma from '../config/database'

export interface CreatePrintTemplateInput {
  name: string
  type: string
  content?: string
  isDefault?: boolean
}

export interface UpdatePrintTemplateInput {
  name?: string
  type?: string
  content?: string
  isDefault?: boolean
}

export async function getTemplates(type?: string) {
  const where: any = {}
  if (type) {
    where.type = type
  }

  const [list, total] = await Promise.all([
    prisma.printTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.printTemplate.count({ where }),
  ])

  return { list, total }
}

export async function getTemplateById(id: number) {
  return prisma.printTemplate.findUnique({
    where: { id },
  })
}

export async function getDefaultTemplate(type: string) {
  return prisma.printTemplate.findFirst({
    where: { type, isDefault: true },
  })
}

export async function createTemplate(data: CreatePrintTemplateInput) {
  if (!data.name) {
    throw new Error('模板名称不能为空')
  }

  if (data.isDefault) {
    await prisma.printTemplate.updateMany({
      where: { type: data.type, isDefault: true },
      data: { isDefault: false },
    })
  }

  return prisma.printTemplate.create({
    data: {
      name: data.name,
      type: data.type || 'repair',
      content: data.content || '{}',
      isDefault: data.isDefault || false,
    },
  })
}

export async function updateTemplate(id: number, data: UpdatePrintTemplateInput) {
  const existing = await prisma.printTemplate.findUnique({
    where: { id },
  })

  if (!existing) {
    return null
  }

  if (data.isDefault) {
    await prisma.printTemplate.updateMany({
      where: { type: data.type || existing.type, isDefault: true },
      data: { isDefault: false },
    })
  }

  return prisma.printTemplate.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      content: data.content,
      isDefault: data.isDefault,
    },
  })
}

export async function deleteTemplate(id: number) {
  const existing = await prisma.printTemplate.findUnique({
    where: { id },
  })

  if (!existing) {
    return null
  }

  await prisma.printTemplate.delete({
    where: { id },
  })

  return true
}
