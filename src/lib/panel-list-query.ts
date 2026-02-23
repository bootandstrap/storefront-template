export interface PanelListQueryResult {
    page: number
    limit: number
    offset: number
    q: string | undefined
    status: string | undefined
    tab: string | undefined
}

export interface ParsePanelListQueryOptions {
    defaultLimit: number
    allowedStatuses?: readonly string[]
    allowedTabs?: readonly string[]
}

function pickFirst(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
        return value[0]
    }
    return value
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n) || n < 1) return fallback
    return n
}

export function parsePanelListQuery(
    searchParams: Record<string, string | string[] | undefined>,
    options: ParsePanelListQueryOptions
): PanelListQueryResult {
    const page = parsePositiveInt(pickFirst(searchParams.page), 1)
    const limit = Math.max(1, options.defaultLimit)

    const rawQ = pickFirst(searchParams.q)?.trim() || undefined

    const rawStatus = pickFirst(searchParams.status)?.trim() || undefined
    const status = rawStatus && options.allowedStatuses?.includes(rawStatus)
        ? rawStatus
        : undefined

    const rawTab = pickFirst(searchParams.tab)?.trim() || undefined
    const tab = rawTab && options.allowedTabs?.includes(rawTab)
        ? rawTab
        : undefined

    return {
        page,
        limit,
        offset: (page - 1) * limit,
        q: rawQ,
        status,
        tab,
    }
}
