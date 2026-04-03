import jwt from 'jsonwebtoken'

export interface JwtPayload {
  userId: number
  role: string
}

export function generateToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET || 'default-secret'
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn']
  return jwt.sign(payload, secret, { expiresIn })
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET || 'default-secret'
  return jwt.verify(token, secret) as JwtPayload
}
