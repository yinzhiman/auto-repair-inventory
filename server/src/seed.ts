import prisma from './config/database'
import { hashPassword } from './utils/password'

async function seed() {
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  })

  if (!existingAdmin) {
    const hashedPassword = await hashPassword('123456')
    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: '管理员',
        role: 'boss',
        status: 'active',
      },
    })
    console.log('默认管理员账号已创建: admin / 123456')
  } else {
    console.log('管理员账号已存在，跳过创建')
  }
}

seed()
  .catch((error) => {
    console.error('种子数据执行失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
