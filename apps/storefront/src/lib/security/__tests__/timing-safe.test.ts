import { describe, expect, it } from 'vitest'

import { isSecretValid } from '../timing-safe'

describe('isSecretValid', () => {
  it('accepts byte-identical secrets including unicode', () => {
    expect(isSecretValid('bns-secret-123', 'bns-secret-123')).toBe(true)
    expect(isSecretValid('secreto-ñ-🔒', 'secreto-ñ-🔒')).toBe(true)
  })

  it('rejects same-length and different-length mismatches', () => {
    expect(isSecretValid('bns-secret-123', 'bns-secret-124')).toBe(false)
    expect(isSecretValid('short', 'a-longer-secret')).toBe(false)
  })

  it('treats empty strings consistently', () => {
    expect(isSecretValid('', '')).toBe(true)
    expect(isSecretValid('', 'non-empty')).toBe(false)
  })
})
