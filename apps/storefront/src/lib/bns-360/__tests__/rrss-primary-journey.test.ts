import { describe, expect, it, vi } from 'vitest'

import {
    runBns360RrssPrimaryJourney,
    type Bns360RrssConfig,
    type Bns360RrssPrimaryClient,
} from '../rrss-primary-journey'

function createConfig(overrides: Partial<Bns360RrssConfig> = {}): Bns360RrssConfig {
    return {
        socialFacebook: 'https://facebook.com/initial',
        socialInstagram: 'https://instagram.com/initial',
        ...overrides,
    }
}

function createClient(): Bns360RrssPrimaryClient {
    const state = { current: createConfig() }

    return {
        readConfig: vi.fn(async () => ({ ...state.current })),
        updateConfig: vi.fn(async updates => {
            state.current = { ...state.current, ...updates }
        }),
        readPublicRoute: vi.fn(async path => ({
            path,
            status: 200,
            sameAs: [
                state.current.socialInstagram,
                state.current.socialFacebook,
            ].filter((value): value is string => Boolean(value)),
        })),
    }
}

describe('runBns360RrssPrimaryJourney', () => {
    it('updates social links, observes public sameAs JSON-LD, and rolls back', async () => {
        const client = createClient()

        const result = await runBns360RrssPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.rrss-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                socialFacebook: 'https://facebook.com/bns360-run-1',
                socialInstagram: 'https://instagram.com/bns360-run-1',
                publicPath: '/es',
                publicStatus: 200,
                sameAs: [
                    'https://instagram.com/bns360-run-1',
                    'https://facebook.com/bns360-run-1',
                ],
            },
            cleanup: { status: 'verified', restored: true },
        })
        expect(client.updateConfig).toHaveBeenCalledWith({
            socialFacebook: 'https://facebook.com/bns360-run-1',
            socialInstagram: 'https://instagram.com/bns360-run-1',
        })
        expect(client.updateConfig).toHaveBeenLastCalledWith({
            socialFacebook: 'https://facebook.com/initial',
            socialInstagram: 'https://instagram.com/initial',
        })
        expect(client.readPublicRoute).toHaveBeenCalledWith('/es')
        expect(JSON.stringify(result)).not.toContain('password')
        expect(JSON.stringify(result)).not.toContain('token')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360RrssPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })
        const second = await runBns360RrssPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })

        expect(first.runId).toMatch(/^bns360-rrss-/)
        expect(second.runId).toMatch(/^bns360-rrss-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('runs rollback in finally after public JSON-LD failure', async () => {
        const client = createClient()
        vi.mocked(client.readPublicRoute).mockRejectedValueOnce(new Error('public social links failed'))

        const result = await runBns360RrssPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.error).toContain('public social links failed')
        expect(result.cleanup.status).toBe('verified')
        expect(result.cleanup.restored).toBe(true)
        expect(client.updateConfig).toHaveBeenLastCalledWith({
            socialFacebook: 'https://facebook.com/initial',
            socialInstagram: 'https://instagram.com/initial',
        })
    })

    it('reports public sameAs status when rendered links do not match', async () => {
        const client = createClient()
        vi.mocked(client.readPublicRoute).mockResolvedValueOnce({
            path: '/es',
            status: 200,
            sameAs: ['https://instagram.com/initial'],
        })

        const result = await runBns360RrssPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.runtime).toMatchObject({
            socialFacebook: 'https://facebook.com/bns360-run-1',
            socialInstagram: 'https://instagram.com/bns360-run-1',
            publicStatus: 200,
            sameAs: ['https://instagram.com/initial'],
        })
        expect(result.error).toContain('RRSS public sameAs')
        expect(result.cleanup.status).toBe('verified')
    })

    it('blocks certification when rollback cannot be proven', async () => {
        const client = createClient()
        vi.mocked(client.readConfig)
            .mockResolvedValueOnce(createConfig())
            .mockResolvedValueOnce(createConfig({
                socialFacebook: 'https://facebook.com/bns360-run-1',
                socialInstagram: 'https://instagram.com/bns360-run-1',
            }))
            .mockResolvedValueOnce(createConfig({ socialFacebook: 'https://facebook.com/bns360-run-1' }))

        const result = await runBns360RrssPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('failed')
        expect(result.cleanup.restored).toBe(false)
    })
})
