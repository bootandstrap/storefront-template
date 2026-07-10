import { describe, expect, it, vi } from 'vitest'

import {
    runBns360I18nPrimaryJourney,
    type Bns360I18nConfig,
    type Bns360I18nPrimaryClient,
} from '../i18n-primary-journey'

function createConfig(overrides: Partial<Bns360I18nConfig> = {}): Bns360I18nConfig {
    return {
        language: 'es',
        storefrontLanguage: 'es',
        activeLanguages: ['es'],
        defaultCurrency: 'eur',
        activeCurrencies: ['eur'],
        timezone: 'Europe/Madrid',
        maxLanguages: 5,
        maxCurrencies: 5,
        ...overrides,
    }
}

function createClient(): Bns360I18nPrimaryClient {
    const state = { current: createConfig() }

    return {
        readConfig: vi.fn(async () => ({ ...state.current })),
        updateConfig: vi.fn(async updates => {
            state.current = { ...state.current, ...updates }
        }),
        readPublicRoute: vi.fn(async path => ({
            path,
            status: 200,
            htmlLang: path.replace('/', ''),
        })),
    }
}

describe('runBns360I18nPrimaryJourney', () => {
    it('updates language and currency config, observes localized render, and rolls back', async () => {
        const client = createClient()

        const result = await runBns360I18nPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.i18n-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                language: 'de',
                storefrontLanguage: 'de',
                defaultCurrency: 'chf',
                publicPath: '/de',
                publicHtmlLang: 'de',
            },
            limits: {
                maxLanguages: 5,
                maxCurrencies: 5,
            },
            cleanup: { status: 'verified', restored: true },
        })
        expect(client.updateConfig).toHaveBeenCalledWith(expect.objectContaining({
            language: 'de',
            storefrontLanguage: 'de',
            activeLanguages: ['de'],
            defaultCurrency: 'chf',
            activeCurrencies: ['chf'],
        }))
        expect(client.updateConfig).toHaveBeenLastCalledWith(expect.objectContaining({
            language: 'es',
            storefrontLanguage: 'es',
            activeLanguages: ['es'],
            defaultCurrency: 'eur',
            activeCurrencies: ['eur'],
        }))
        expect(client.readPublicRoute).toHaveBeenCalledWith('/de')
        expect(JSON.stringify(result)).not.toContain('Europe/Madrid')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360I18nPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })
        const second = await runBns360I18nPrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })

        expect(first.runId).toMatch(/^bns360-i18n-/)
        expect(second.runId).toMatch(/^bns360-i18n-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('runs rollback in finally after public render failure', async () => {
        const client = createClient()
        vi.mocked(client.readPublicRoute).mockRejectedValueOnce(new Error('localized render failed'))

        const result = await runBns360I18nPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.runtime).toMatchObject({
            language: 'de',
            storefrontLanguage: 'de',
            defaultCurrency: 'chf',
            publicPath: '/de',
            publicStatus: 0,
            publicHtmlLang: null,
        })
        expect(result.error).toContain('localized render failed')
        expect(result.cleanup.status).toBe('verified')
        expect(result.cleanup.restored).toBe(true)
        expect(client.updateConfig).toHaveBeenLastCalledWith(expect.objectContaining({
            language: 'es',
            defaultCurrency: 'eur',
        }))
    })

    it('reports public render status when the locale response does not match', async () => {
        const client = createClient()
        vi.mocked(client.readPublicRoute).mockResolvedValueOnce({
            path: '/de',
            status: 200,
            htmlLang: 'es',
        })

        const result = await runBns360I18nPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.runtime).toMatchObject({
            language: 'de',
            storefrontLanguage: 'de',
            defaultCurrency: 'chf',
            publicPath: '/de',
            publicStatus: 200,
            publicHtmlLang: 'es',
        })
        expect(result.error).toContain('i18n public render')
        expect(result.cleanup.status).toBe('verified')
    })

    it('blocks certification when rollback cannot be proven', async () => {
        const client = createClient()
        vi.mocked(client.readConfig)
            .mockResolvedValueOnce(createConfig())
            .mockResolvedValueOnce(createConfig({
                language: 'de',
                storefrontLanguage: 'de',
                activeLanguages: ['de'],
                defaultCurrency: 'chf',
                activeCurrencies: ['chf'],
            }))
            .mockResolvedValueOnce(createConfig({ language: 'de' }))

        const result = await runBns360I18nPrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('failed')
        expect(result.cleanup.restored).toBe(false)
    })
})
