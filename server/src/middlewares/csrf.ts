import { Request, Response, NextFunction } from 'express'
import { validateCsrfToken } from '../utils/csrf'

declare module 'express' {
  interface Request {
    session?: {
      csrfToken?: string
    }
  }
}

export function csrfMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next()
    return
  }

  const csrfToken = req.body?.csrfToken
  const storedToken = req.session?.csrfToken

  if (!csrfToken || !validateCsrfToken(csrfToken, storedToken || '')) {
    res.status(403).json({
      success: false,
      message: '无效的请求',
    })
    return
  }

  next()
}
