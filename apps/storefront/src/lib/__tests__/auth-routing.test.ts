import { describe, it, expect } from 'vitest'
import { resolvePostLoginDestination } from '../auth-routing'

describe('resolvePostLoginDestination', () => {
    it('sends owner role to panel when profile tenant context exists', () => {
        expect(
            resolvePostLoginDestination({
                lang: 'es',
                role: 'owner',
                profileTenantId: 'tenant-owner',
            })
        ).toBe('/es/panel')
    })

    it('keeps legacy role-only behavior for callers that have not been migrated yet', () => {
        expect(resolvePostLoginDestination({ lang: 'es', role: 'owner' })).toBe('/es/panel')
    })

    it('sends super_admin to panel when fallback tenant context exists', () => {
        expect(
            resolvePostLoginDestination({
                lang: 'es',
                role: 'super_admin',
                envTenantId: 'tenant-env',
            })
        ).toBe('/es/panel')
    })

    it('keeps panel roles without tenant context out of /panel', () => {
        expect(
            resolvePostLoginDestination({
                lang: 'es',
                role: 'owner',
                profileTenantId: null,
            })
        ).toBe('/es/cuenta')
    })

    it('sends non-panel roles to account by default', () => {
        expect(resolvePostLoginDestination({ lang: 'es', role: 'customer' })).toBe('/es/cuenta')
        expect(resolvePostLoginDestination({ lang: 'es', role: 'admin' })).toBe('/es/cuenta')
        expect(resolvePostLoginDestination({ lang: 'es', role: null })).toBe('/es/cuenta')
    })

    it('honors safe internal redirect when role can access destination', () => {
        expect(
            resolvePostLoginDestination({
                lang: 'es',
                role: 'owner',
                requestedRedirect: '/es/panel/analiticas',
            })
        ).toBe('/es/panel/analiticas')

        expect(
            resolvePostLoginDestination({
                lang: 'es',
                role: 'customer',
                requestedRedirect: '/es/cuenta/pedidos',
            })
        ).toBe('/es/cuenta/pedidos')
    })

    it('blocks privilege escalation and unsafe redirects', () => {
        expect(
            resolvePostLoginDestination({
                lang: 'es',
                role: 'customer',
                requestedRedirect: '/es/panel',
            })
        ).toBe('/es/cuenta')

        expect(
            resolvePostLoginDestination({
                lang: 'es',
                role: 'owner',
                requestedRedirect: 'https://evil.com/phish',
            })
        ).toBe('/es/panel')

        expect(
            resolvePostLoginDestination({
                lang: 'es',
                role: 'owner',
                requestedRedirect: '/de/panel',
            })
        ).toBe('/es/panel')
    })
})
