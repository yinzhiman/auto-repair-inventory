import { Router, Request, Response } from 'express'
import prisma from '../config/database'
import { comparePassword } from '../utils/password'
import { generateToken, verifyToken } from '../utils/jwt'
import crypto from 'crypto'

const router = Router()

const MAX_LOGIN_ERRORS = 10

function isPhone(account: string): boolean {
  return /^1[3-9]\d{9}$/.test(account)
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { account, password } = req.body

    if (!account || !password) {
      res.status(400).json({
        success: false,
        message: '请输入账号和密码',
      })
      return
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: '密码至少需要6位',
      })
      return
    }

    if (isPhone(account)) {
      const user = await prisma.user.findUnique({
        where: { phone: account },
      })

      if (!user) {
        res.status(400).json({
          success: false,
          message: '该手机号未注册',
        })
        return
      }

      if (user.status === 'disabled') {
        res.status(400).json({
          success: false,
          message: '该账号已被禁用，请联系管理员',
        })
        return
      }

      if (user.lockedUntil && new Date() < user.lockedUntil) {
        res.status(400).json({
          success: false,
          message: '密码错误次数过多，请联系管理员重置密码',
        })
        return
      }

      const isPasswordValid = await comparePassword(password, user.password)

      if (!isPasswordValid) {
        const newErrorCount = user.loginErrorCount + 1
        const remainingAttempts = MAX_LOGIN_ERRORS - newErrorCount

        if (remainingAttempts <= 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginErrorCount: newErrorCount,
              lockedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          })
          res.status(400).json({
            success: false,
            message: '密码错误次数过多，请联系管理员重置密码',
          })
          return
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { loginErrorCount: newErrorCount },
        })

        res.status(400).json({
          success: false,
          message: `密码错误，您还可以尝试${remainingAttempts}次`,
        })
        return
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { loginErrorCount: 0, lockedUntil: null },
      })

      const token = generateToken({ userId: user.id, role: user.role })
      const tokenHash = hashToken(token)

      await prisma.user.update({
        where: { id: user.id },
        data: { tokenHash },
      })

      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          name: user.name,
          role: user.role,
        },
      })
      return
    }

    if (/^\d+$/.test(account) && !isPhone(account)) {
      res.status(400).json({
        success: false,
        message: '请输入正确的手机号格式',
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { username: account },
    })

    if (!user) {
      res.status(400).json({
        success: false,
        message: '用户名不存在',
      })
      return
    }

    if (user.status === 'disabled') {
      res.status(400).json({
        success: false,
        message: '该账号已被禁用，请联系管理员',
      })
      return
    }

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      res.status(400).json({
        success: false,
        message: '密码错误次数过多，请联系管理员重置密码',
      })
      return
    }

    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      const newErrorCount = user.loginErrorCount + 1
      const remainingAttempts = MAX_LOGIN_ERRORS - newErrorCount

      if (remainingAttempts <= 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginErrorCount: newErrorCount,
            lockedUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
        res.status(400).json({
          success: false,
          message: '密码错误次数过多，请联系管理员重置密码',
        })
        return
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { loginErrorCount: newErrorCount },
      })

      res.status(400).json({
        success: false,
        message: `密码错误，您还可以尝试${remainingAttempts}次`,
      })
      return
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginErrorCount: 0, lockedUntil: null },
    })

    const token = generateToken({ userId: user.id, role: user.role })
    const tokenHash = hashToken(token)

    await prisma.user.update({
      where: { id: user.id },
      data: { tokenHash },
    })

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token

    if (token) {
      try {
        const payload = verifyToken(token)
        await prisma.user.update({
          where: { id: payload.userId },
          data: { tokenHash: null },
        })
      } catch {
        // Token 无效，忽略
      }
    }

    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'strict',
    })

    res.json({
      success: true,
      message: '登出成功',
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token

    if (!token) {
      res.status(401).json({
        success: false,
        message: '未登录',
      })
      return
    }

    let payload
    try {
      payload = verifyToken(token)
    } catch {
      res.status(401).json({
        success: false,
        message: '登录已过期',
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      res.status(401).json({
        success: false,
        message: '用户不存在',
      })
      return
    }

    if (user.status === 'disabled') {
      res.status(401).json({
        success: false,
        message: '该账号已被禁用',
      })
      return
    }

    const tokenHash = hashToken(token)
    if (user.tokenHash !== tokenHash) {
      res.status(401).json({
        success: false,
        message: '账号已在其他设备登录',
      })
      return
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误',
    })
  }
})

export default router
