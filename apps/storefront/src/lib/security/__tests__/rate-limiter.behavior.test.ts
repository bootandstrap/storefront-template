import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('in-memory infrastructure rate limiter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('tracks allowance, remaining requests, and retry delay per key', async () => {
    const { checkRateLimit } = await import('../rate-limiter')

    expect(checkRateLimit('ip-a', 2, 1_000)).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterMs: null,
    })
    expect(checkRateLimit('ip-a', 2, 1_000)).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterMs: null,
    })
    expect(checkRateLimit('ip-a', 2, 1_000)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: 1_000,
    })
    expect(checkRateLimit('ip-b', 2, 1_000).allowed).toBe(true)
  })

  it('prunes requests outside the sliding window', async () => {
    const { checkRateLimit } = await import('../rate-limiter')
    checkRateLimit('ip-window', 1, 1_000)
    expect(checkRateLimit('ip-window', 1, 1_000).allowed).toBe(false)

    vi.setSystemTime(2_001)
    expect(checkRateLimit('ip-window', 1, 1_000)).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterMs: null,
    })
  })

  it('fails closed for invalid limiter configuration', async () => {
    const { checkRateLimit } = await import('../rate-limiter')

    expect(checkRateLimit('ip-invalid-max', 0, 1_000)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: null,
    })
    expect(checkRateLimit('ip-invalid-window', 1, 0)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: null,
    })
  })

  it('auto-starts exactly one unreferenced cleanup interval', async () => {
    const { startCleanup } = await import('../rate-limiter')
    expect(vi.getTimerCount()).toBe(1)

    startCleanup(5)
    expect(vi.getTimerCount()).toBe(1)
  })
})
