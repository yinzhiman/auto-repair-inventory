import { describe, it, expect } from 'vitest'
import { generateCsrfToken, validateCsrfToken } from './csrf'

describe('csrf utils', () => {
  it('generateCsrfToken should return a random string', () => {
    const token = generateCsrfToken()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)
  })

  it('validateCsrfToken should return true for matching tokens', () => {
    const token = generateCsrfToken()
    expect(validateCsrfToken(token, token)).toBe(true)
  })

  it('validateCsrfToken should return false for non-matching tokens', () => {
    const token1 = generateCsrfToken()
    const token2 = generateCsrfToken()
    expect(validateCsrfToken(token1, token2)).toBe(false)
  })

  it('validateCsrfToken should return false for empty token', () => {
    const storedToken = generateCsrfToken()
    expect(validateCsrfToken('', storedToken)).toBe(false)
  })
})
