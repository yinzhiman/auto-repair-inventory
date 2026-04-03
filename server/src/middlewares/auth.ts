import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import prisma from '../config/database'
import crypto from 'crypto'

declare module 'express' {
  interface Request {
    user?: {
      id: number
      username: string
      name: string
      role: string
    }
    authError?: string
  }
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.token

  if (!token) {
    next()
    return
  }

  try {
    const payload = verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      req.authError = '登录已失效'
      next()
      return
    }

    if (user.status === 'disabled') {
      req.authError = '该账号已被禁用'
      next()
      return
    }

    const tokenHash = hashToken(token)
    if (user.tokenHash !== tokenHash) {
      req.authError = '登录已失效'
      next()
      return
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    }

    next()
  } catch {
    req.authError = '登录已失效'
    next()
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: req.authError || '未登录',
    })
    return
  }
  next()
}
