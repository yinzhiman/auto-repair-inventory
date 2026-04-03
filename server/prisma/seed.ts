import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/utils/password'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await hashPassword('admin123')

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: adminPassword,
      loginErrorCount: 0,
      lockedUntil: null,
    },
    create: {
      username: 'admin',
      password: adminPassword,
      name: '管理员',
      role: 'admin',
      status: 'active',
    },
  })

  console.log('Updated admin user:', admin.username)

  const employeePassword = await hashPassword('123456')

  const employee = await prisma.user.upsert({
    where: { username: 'employee' },
    update: {
      password: employeePassword,
      loginErrorCount: 0,
      lockedUntil: null,
    },
    create: {
      username: 'employee',
      password: employeePassword,
      name: '员工甲',
      role: 'employee',
      status: 'active',
    },
  })

  console.log('Updated employee user:', employee.username)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
