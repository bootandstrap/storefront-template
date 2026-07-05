import { describe, expect, it } from 'vitest'

import { resolvePublicBaseUrl } from '@/lib/seo/public-url'

describe('resolvePublicBaseUrl', () => {
    it('prefers a configured absolute site URL', () => {
        expect(
            resolvePublicBaseUrl({
                envUrl: 'https://configured.example.com/',
                forwardedProto: 'https',
                forwardedHost: 'tenant.example.com',
            })
        ).toBe('https://configured.example.com')
    })

    it('falls back to forwarded host and proto when env is missing', () => {
        expect(
            resolvePublicBaseUrl({
                envUrl: '',
                forwardedProto: 'https',
                forwardedHost: 'campifruit.bootandstrap.com',
            })
        ).toBe('https://campifruit.bootandstrap.com')
    })

    it('uses host header with https default when proxy proto is absent', () => {
        expect(
            resolvePublicBaseUrl({
                envUrl: '',
                host: 'campifruit.bootandstrap.com',
            })
        ).toBe('https://campifruit.bootandstrap.com')
    })

    it('ignores invalid env URLs and still resolves from request headers', () => {
        expect(
            resolvePublicBaseUrl({
                envUrl: '/relative-path',
                forwardedProto: 'https',
                forwardedHost: 'campifruit.bootandstrap.com',
            })
        ).toBe('https://campifruit.bootandstrap.com')
    })
})
