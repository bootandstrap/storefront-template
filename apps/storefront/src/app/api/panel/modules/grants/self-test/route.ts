import { NextRequest, NextResponse } from 'next/server'
import { getActiveModulesForTenant } from '@/lib/active-modules'
import contract from '@/lib/governance-contract.json'
import { logger } from '@/lib/logger'
import { toPanelErrorResponse } from '@/lib/panel-api-errors'
import { withPanelGuard } from '@/lib/panel-guard'
import { PANEL_GUARD, withRateLimit } from '@/lib/security/api-rate-guard'

type SanitizedActiveModule = {
    key: string
    tierKey: string | null
    source: 'flags' | 'orders' | 'overrides'
}

const CONTRACT_MODULE_KEYS = contract.modules.catalog.map(module => module.key)

function resolveRequiredModules(value: string | null): string[] {
    if (!value || value === 'contract') {
        return CONTRACT_MODULE_KEYS
    }

    const allowed = new Set(CONTRACT_MODULE_KEYS)
    return value
        .split(',')
        .map(key => key.trim())
        .filter(key => allowed.has(key))
}

function sortModules(modules: SanitizedActiveModule[]): SanitizedActiveModule[] {
    const order = new Map(CONTRACT_MODULE_KEYS.map((key, index) => [key, index]))
    return [...modules].sort((left, right) => {
        const leftIndex = order.get(left.key) ?? Number.MAX_SAFE_INTEGER
        const rightIndex = order.get(right.key) ?? Number.MAX_SAFE_INTEGER
        return leftIndex - rightIndex || left.key.localeCompare(right.key)
    })
}

export async function GET(req: NextRequest) {
    try {
        const rateLimitResult = await withRateLimit(req, PANEL_GUARD)
        if (rateLimitResult.limited) return rateLimitResult.response!

        const { tenantId } = await withPanelGuard()
        const { searchParams } = new URL(req.url)
        const required = resolveRequiredModules(searchParams.get('required'))
        const activeModules = await getActiveModulesForTenant(tenantId)
        const activeByKey = new Map(activeModules.map(module => [module.moduleKey, module]))
        const missing = required.filter(key => !activeByKey.has(key))
        const modules = sortModules(activeModules.map(module => ({
            key: module.moduleKey,
            tierKey: module.tierKey,
            source: module.source,
        })))
        const status = missing.length === 0 ? 'verified' : 'blocked'

        return NextResponse.json({
            schema: 'bootandstrap.modules.grants.self-test/v1',
            status,
            summary: {
                requiredCount: required.length,
                activeCount: required.filter(key => activeByKey.has(key)).length,
                missingCount: missing.length,
            },
            required,
            missing,
            modules,
        }, {
            status: status === 'verified' ? 200 : 409,
            headers: rateLimitResult.headers,
        })
    } catch (error) {
        logger.error('[modules-grants-self-test] Error:', error)
        return toPanelErrorResponse(error)
    }
}
