import { describe, expect, it, vi } from 'vitest'

import {
    runBns360SeoPrimaryJourney,
    type Bns360SeoConfig,
    type Bns360SeoPrimaryClient,
} from '../seo-primary-journey'

function createConfig(overrides: Partial<Bns360SeoConfig> = {}): Bns360SeoConfig {
    return {
        metaTitle: 'Initial title',
        metaDescription: 'Initial description',
        ...overrides,
    }
}

function createClient(): Bns360SeoPrimaryClient {
    const state = { current: createConfig() }

    return {
        readConfig: vi.fn(async () => ({ ...state.current })),
        updateConfig: vi.fn(async updates => {
            state.current = { ...state.current, ...updates }
        }),
        readPublicRoute: vi.fn(async path => ({
            path,
            status: 200,
            title: state.current.metaTitle,
            description: state.current.metaDescription,
            ogTitle: state.current.metaTitle,
            ogDescription: state.current.metaDescription,
        })),
    }
}

describe('runBns360SeoPrimaryJourney', () => {
    it('updates SEO metadata, observes public metadata, and rolls back', async () => {
        const client = createClient()

        const result = await runBns360SeoPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.seo-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                metaTitle: 'BNS360 SEO run-1',
                metaDescription: 'BNS360 metadata run-1',
                publicPath: '/es',
                publicStatus: 200,
                publicTitle: 'BNS360 SEO run-1',
                publicDescription: 'BNS360 metadata run-1',
                publicOgTitle: 'BNS360 SEO run-1',
                publicOgDescription: 'BNS360 metadata run-1',
            },
            cleanup: { status: 'verified', restored: true },
        })
        expect(client.updateConfig).toHaveBeenCalledWith({
            metaTitle: 'BNS360 SEO run-1',
            metaDescription: 'BNS360 metadata run-1',
        })
        expect(client.updateConfig).toHaveBeenLastCalledWith({
            metaTitle: 'Initial title',
            metaDescription: 'Initial description',
        })
        expect(client.readPublicRoute).toHaveBeenCalledWith('/es')
        expect(JSON.stringify(result)).not.toContain('google_analytics_id')
        expect(JSON.stringify(result)).not.toContain('token')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360SeoPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })
        const second = await runBns360SeoPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })

        expect(first.runId).toMatch(/^bns360-seo-/)
        expect(second.runId).toMatch(/^bns360-seo-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('runs rollback in finally after public metadata failure', async () => {
        const client = createClient()
        vi.mocked(client.readPublicRoute).mockRejectedValueOnce(new Error('public metadata failed'))

        const result = await runBns360SeoPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.error).toContain('public metadata failed')
        expect(result.cleanup.status).toBe('verified')
        expect(result.cleanup.restored).toBe(true)
        expect(client.updateConfig).toHaveBeenLastCalledWith({
            metaTitle: 'Initial title',
            metaDescription: 'Initial description',
        })
    })

    it('reports public metadata status when rendered metadata does not match', async () => {
        const client = createClient()
        vi.mocked(client.readPublicRoute).mockResolvedValueOnce({
            path: '/es',
            status: 200,
            title: 'Initial title',
            description: 'Initial description',
            ogTitle: 'Initial title',
            ogDescription: 'Initial description',
        })

        const result = await runBns360SeoPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.runtime).toMatchObject({
            metaTitle: 'BNS360 SEO run-1',
            metaDescription: 'BNS360 metadata run-1',
            publicStatus: 200,
            publicTitle: 'Initial title',
            publicDescription: 'Initial description',
        })
        expect(result.error).toContain('SEO public metadata')
        expect(result.cleanup.status).toBe('verified')
    })

    it('blocks certification when rollback cannot be proven', async () => {
        const client = createClient()
        vi.mocked(client.readConfig)
            .mockResolvedValueOnce(createConfig())
            .mockResolvedValueOnce(createConfig({
                metaTitle: 'BNS360 SEO run-1',
                metaDescription: 'BNS360 metadata run-1',
            }))
            .mockResolvedValueOnce(createConfig({ metaTitle: 'BNS360 SEO run-1' }))

        const result = await runBns360SeoPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('failed')
        expect(result.cleanup.restored).toBe(false)
    })
})
