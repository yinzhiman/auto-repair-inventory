import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateToken, verifyToken } from './jwt'

vi.mock('process', () => ({
  env: {
    JWT_SECRET: 'test-secret-key',
    JWT_EXPIRES_IN: '7d',
  },
}))

describe('jwt utils', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('generateToken should return a valid JWT string', () => {
    const token = generateToken({ userId: 1, role: 'boss' })
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('verifyToken should return payload for valid token', () => {
    const token = generateToken({ userId: 1, role: 'boss' })
    const payload = verifyToken(token)
    expect(payload.userId).toBe(1)
    expect(payload.role).toBe('boss')
  })

  it('verifyToken should throw error for invalid token', () => {
    expect(() => verifyToken('invalid-token')).toThrow()
  })

  it('verifyToken should throw error for expired token', () => {
    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJib3NzIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzP5dI6V'
    expect(() => verifyToken(expiredToken)).toThrow()
  })
})
