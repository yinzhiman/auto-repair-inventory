import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword } from './password'

describe('password utils', () => {
  it('hashPassword should return a bcrypt hash string starting with $2a$ or $2b$', async () => {
    const hash = await hashPassword('123456')
    expect(hash).toMatch(/^\$2[ab]\$/)
    expect(hash.length).toBe(60)
  })

  it('comparePassword should return true for correct password', async () => {
    const hash = await hashPassword('123456')
    const result = await comparePassword('123456', hash)
    expect(result).toBe(true)
  })

  it('comparePassword should return false for wrong password', async () => {
    const hash = await hashPassword('123456')
    const result = await comparePassword('wrong', hash)
    expect(result).toBe(false)
  })

  it('same password should produce different hashes (bcrypt auto salt)', async () => {
    const hash1 = await hashPassword('123456')
    const hash2 = await hashPassword('123456')
    expect(hash1).not.toBe(hash2)
  })
})
