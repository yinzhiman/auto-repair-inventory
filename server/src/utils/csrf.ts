import crypto from 'crypto'

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function validateCsrfToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) {
    return false
  }
  return token === storedToken
}
