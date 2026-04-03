import { Request, Response, NextFunction } from 'express'

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: '未登录',
      })
      return
    }

    if (req.user.role !== role && req.user.role !== 'boss') {
      res.status(403).json({
        success: false,
        message: '无权限访问',
      })
      return
    }

    next()
  }
}
