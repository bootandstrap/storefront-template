import { randomUUID } from 'node:crypto'

export interface Bns360I18nConfig {
    language: string | null
    storefrontLanguage: string | null
    activeLanguages: string[]
    defaultCurrency: string | null
    activeCurrencies: string[]
    timezone: string | null
    maxLanguages: number | null
    maxCurrencies: number | null
}

export type Bns360I18nConfigUpdate = Partial<Pick<
    Bns360I18nConfig,
    'language' | 'storefrontLanguage' | 'activeLanguages' | 'defaultCurrency' | 'activeCurrencies' | 'timezone'
>>

export interface Bns360I18nPublicRoute {
    path: string
    status: number
    htmlLang: string | null
}

export interface Bns360I18nPrimaryClient {
    readConfig(): Promise<Bns360I18nConfig>
    updateConfig(updates: Bns360I18nConfigUpdate): Promise<void>
    readPublicRoute(path: string): Promise<Bns360I18nPublicRoute>
}

export interface Bns360I18nPrimaryJourneyInput {
    tenantId: string
    client: Bns360I18nPrimaryClient
    runId?: string
}

export interface Bns360I18nPrimaryJourneyResult {
    schema: 'bootandstrap.template.bns-360.i18n-primary/v1'
    status: 'verified' | 'blocked'
    runId: string
    tenantRef: string
    generatedAt: string
    steps: Array<{
        key:
        | 'read_initial'
        | 'update_config'
        | 'read_after_update'
        | 'public_render'
        | 'runtime_projection'
        | 'rollback'
        | 'read_after_rollback'
        status: 'verified' | 'blocked'
    }>
    runtime: {
        language: string
        storefrontLanguage: string
        defaultCurrency: string
        activeLanguages: string[]
        activeCurrencies: string[]
        publicPath: string
        publicStatus: number
        publicHtmlLang: string | null
    }
    limits: {
        maxLanguages: number | null
        maxCurrencies: number | null
    }
    cleanup: {
        status: 'verified' | 'failed'
        restored: boolean
    }
    error?: string
}

const TARGET_CONFIG: Bns360I18nConfigUpdate = {
    language: 'de',
    storefrontLanguage: 'de',
    activeLanguages: ['de'],
    defaultCurrency: 'chf',
    activeCurrencies: ['chf'],
}

const DEFAULT_RUNTIME = {
    language: '',
    storefrontLanguage: '',
    defaultCurrency: '',
    activeLanguages: [] as string[],
    activeCurrencies: [] as string[],
    publicPath: '/de',
    publicStatus: 0,
    publicHtmlLang: null as string | null,
}

export async function runBns360I18nPrimaryJourney(
    input: Bns360I18nPrimaryJourneyInput
): Promise<Bns360I18nPrimaryJourneyResult> {
    const runId = input.runId ?? `bns360-i18n-${Date.now()}-${randomUUID()}`
    const steps: Bns360I18nPrimaryJourneyResult['steps'] = []
    let initialConfig: Bns360I18nConfig | null = null
    let runtime = { ...DEFAULT_RUNTIME }
    let limits: Bns360I18nPrimaryJourneyResult['limits'] = { maxLanguages: null, maxCurrencies: null }
    let journeyError: string | undefined
    let cleanupStatus: Bns360I18nPrimaryJourneyResult['cleanup']['status'] = 'failed'
    let restored = false

    try {
        initialConfig = await input.client.readConfig()
        limits = {
            maxLanguages: initialConfig.maxLanguages,
            maxCurrencies: initialConfig.maxCurrencies,
        }
        steps.push({ key: 'read_initial', status: 'verified' })

        await input.client.updateConfig(TARGET_CONFIG)
        steps.push({ key: 'update_config', status: 'verified' })

        const updatedConfig = await input.client.readConfig()
        limits = {
            maxLanguages: updatedConfig.maxLanguages,
            maxCurrencies: updatedConfig.maxCurrencies,
        }
        runtime = projectRuntime(updatedConfig, {
            path: '/de',
            status: 0,
            htmlLang: null,
        })
        steps.push({ key: 'read_after_update', status: 'verified' })

        const publicRoute = await input.client.readPublicRoute('/de')
        runtime = projectRuntime(updatedConfig, publicRoute)
        if (publicRoute.status >= 400 || publicRoute.htmlLang !== 'de') {
            throw new Error('i18n public render did not reflect the target locale')
        }
        steps.push({ key: 'public_render', status: 'verified' })

        if (
            runtime.language !== 'de' ||
            runtime.storefrontLanguage !== 'de' ||
            runtime.defaultCurrency !== 'chf' ||
            runtime.publicHtmlLang !== 'de'
        ) {
            throw new Error('i18n runtime projection did not reflect owner config update')
        }
        steps.push({ key: 'runtime_projection', status: 'verified' })
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'i18n primary journey failed'
    } finally {
        if (initialConfig) {
            try {
                await input.client.updateConfig({
                    language: initialConfig.language,
                    storefrontLanguage: initialConfig.storefrontLanguage,
                    activeLanguages: initialConfig.activeLanguages,
                    defaultCurrency: initialConfig.defaultCurrency,
                    activeCurrencies: initialConfig.activeCurrencies,
                    timezone: initialConfig.timezone,
                })
                steps.push({ key: 'rollback', status: 'verified' })
            } catch (error) {
                journeyError = journeyError ?? (error instanceof Error ? error.message : 'i18n rollback failed')
                steps.push({ key: 'rollback', status: 'blocked' })
            }

            try {
                const rollbackConfig = await input.client.readConfig()
                restored = isConfigRestored(initialConfig, rollbackConfig)
                cleanupStatus = restored ? 'verified' : 'failed'
                steps.push({
                    key: 'read_after_rollback',
                    status: restored ? 'verified' : 'blocked',
                })
            } catch (error) {
                journeyError = journeyError ?? (
                    error instanceof Error ? error.message : 'i18n rollback verification failed'
                )
            }
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.i18n-primary/v1',
        status: !journeyError && cleanupStatus === 'verified' && restored ? 'verified' : 'blocked',
        runId,
        tenantRef: input.tenantId,
        generatedAt: new Date().toISOString(),
        steps,
        runtime,
        limits,
        cleanup: {
            status: cleanupStatus,
            restored,
        },
        ...(journeyError ? { error: journeyError } : {}),
    }
}

function projectRuntime(
    config: Bns360I18nConfig,
    publicRoute: Bns360I18nPublicRoute
): Bns360I18nPrimaryJourneyResult['runtime'] {
    return {
        language: config.language ?? '',
        storefrontLanguage: config.storefrontLanguage ?? '',
        defaultCurrency: config.defaultCurrency ?? '',
        activeLanguages: config.activeLanguages,
        activeCurrencies: config.activeCurrencies,
        publicPath: publicRoute.path,
        publicStatus: publicRoute.status,
        publicHtmlLang: publicRoute.htmlLang,
    }
}

function isConfigRestored(initial: Bns360I18nConfig, current: Bns360I18nConfig): boolean {
    return (
        initial.language === current.language &&
        initial.storefrontLanguage === current.storefrontLanguage &&
        sameArray(initial.activeLanguages, current.activeLanguages) &&
        initial.defaultCurrency === current.defaultCurrency &&
        sameArray(initial.activeCurrencies, current.activeCurrencies) &&
        initial.timezone === current.timezone
    )
}

function sameArray(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index])
}
