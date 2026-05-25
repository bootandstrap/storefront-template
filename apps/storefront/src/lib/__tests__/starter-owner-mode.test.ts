import { describe, expect, it } from 'vitest'
import {
    getOwnerExperienceMode,
    isStarterCollaborativeMode,
    isStarterPanelRouteAllowed,
    resolveOwnerExperienceModeForTenant,
} from '../starter-build/owner-mode'

describe('starter-owner-mode', () => {
    it('defaults to full dashboard when owner_experience_mode is absent or invalid', () => {
        expect(getOwnerExperienceMode({})).toBe('full_dashboard')
        expect(getOwnerExperienceMode({ owner_experience_mode: 'unknown' })).toBe('full_dashboard')
        expect(isStarterCollaborativeMode({ owner_experience_mode: 'unknown' })).toBe(false)
    })

    it('detects starter collaborative mode from tolerant config reads', () => {
        const config = { owner_experience_mode: 'starter_collaborative' }

        expect(getOwnerExperienceMode(config)).toBe('starter_collaborative')
        expect(isStarterCollaborativeMode(config)).toBe(true)
    })

    it('allows only panel home when the tenant is in starter collaborative mode', () => {
        expect(isStarterPanelRouteAllowed(undefined, 'starter_collaborative')).toBe(true)
        expect(isStarterPanelRouteAllowed('', 'starter_collaborative')).toBe(true)
        expect(isStarterPanelRouteAllowed('mi-tienda', 'starter_collaborative')).toBe(false)
        expect(isStarterPanelRouteAllowed('ventas', 'starter_collaborative')).toBe(false)
    })

    it('keeps normal panel routes available outside starter collaborative mode', () => {
        expect(isStarterPanelRouteAllowed(undefined, 'full_dashboard')).toBe(true)
        expect(isStarterPanelRouteAllowed('mi-tienda', 'full_dashboard')).toBe(true)
        expect(isStarterPanelRouteAllowed('ventas', 'full_dashboard')).toBe(true)
    })

    it('prefers tenants.owner_experience_mode when the authenticated tenant lookup is available', async () => {
        const mode = await resolveOwnerExperienceModeForTenant({
            tenantId: 'tenant-1',
            config: { owner_experience_mode: 'full_dashboard' },
            supabase: {
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({
                                data: { owner_experience_mode: 'starter_collaborative' },
                                error: null,
                            }),
                        }),
                    }),
                }),
            },
        })

        expect(mode).toBe('starter_collaborative')
    })

    it('falls back to full dashboard when tenant lookup is unavailable even if config drifts', async () => {
        const mode = await resolveOwnerExperienceModeForTenant({
            tenantId: 'tenant-1',
            config: { owner_experience_mode: 'starter_collaborative' },
            supabase: {
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({
                                data: null,
                                error: { message: 'missing tenant row' },
                            }),
                        }),
                    }),
                }),
            },
        })

        expect(mode).toBe('full_dashboard')
    })
})
