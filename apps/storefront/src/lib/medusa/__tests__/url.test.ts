/**
 * Tests for getPublicMedusaUrl() — unified Medusa URL resolution
 *
 * Ensures a single source of truth for the public-facing Medusa backend URL
 * used by client-side components (CartContext, guest order lookup, etc).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('getPublicMedusaUrl', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.unstubAllEnvs()
    })

    afterEach(() => {
        vi.unstubAllEnvs()
    })

    it('prefers NEXT_PUBLIC_MEDUSA_BACKEND_URL when set', async () => {
        vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', 'https://api.example.com')
        vi.stubEnv('NODE_ENV', 'development')
        const { getPublicMedusaUrl } = await import('../url')
        expect(getPublicMedusaUrl()).toBe('https://api.example.com')
    })

    it('strips trailing slash from URL', async () => {
        vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', 'https://api.example.com/')
        vi.stubEnv('NODE_ENV', 'development')
        const { getPublicMedusaUrl } = await import('../url')
        expect(getPublicMedusaUrl()).toBe('https://api.example.com')
    })

    it('falls back to localhost:9000 in development when env is missing', async () => {
        vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', '')
        vi.stubEnv('NODE_ENV', 'development')
        const { getPublicMedusaUrl } = await import('../url')
        expect(getPublicMedusaUrl()).toBe('http://localhost:9000')
    })

    it('falls back to localhost:9000 in test when env is missing', async () => {
        vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', '')
        vi.stubEnv('NODE_ENV', 'test')
        const { getPublicMedusaUrl } = await import('../url')
        expect(getPublicMedusaUrl()).toBe('http://localhost:9000')
    })

    it('returns empty string in production when env is missing (graceful degradation)', async () => {
        vi.stubEnv('NEXT_PUBLIC_MEDUSA_BACKEND_URL', '')
        vi.stubEnv('NODE_ENV', 'production')
        const { getPublicMedusaUrl } = await import('../url')
        // Returns '' instead of throwing — prevents page crashes.
        // Cart operations will fail gracefully with error toasts.
        expect(getPublicMedusaUrl()).toBe('')
    })
})

