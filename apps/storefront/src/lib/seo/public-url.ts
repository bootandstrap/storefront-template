import 'server-only'

import { headers } from 'next/headers'

interface ResolvePublicBaseUrlOptions {
    envUrl?: string | null
    forwardedHost?: string | null
    forwardedProto?: string | null
    host?: string | null
}

export function normalizePublicBaseUrl(value?: string | null): string {
    if (!value) return ''

    try {
        const url = new URL(value)
        if (!/^https?:$/.test(url.protocol)) return ''

        const pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '')
        return `${url.origin}${pathname}`
    } catch {
        return ''
    }
}

export function joinPublicUrl(baseUrl: string, pathname: string): string {
    if (!baseUrl) return pathname
    if (!pathname) return baseUrl

    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`
    return `${baseUrl}${normalizedPath}`
}

export function resolvePublicBaseUrl({
    envUrl,
    forwardedHost,
    forwardedProto,
    host,
}: ResolvePublicBaseUrlOptions): string {
    const configured = normalizePublicBaseUrl(envUrl)
    if (configured) return configured

    const resolvedHost = forwardedHost?.split(',')[0]?.trim() || host?.split(',')[0]?.trim() || ''
    if (!resolvedHost || resolvedHost.includes('/')) return ''

    const resolvedProto = forwardedProto?.split(',')[0]?.trim().replace(/:$/, '') || 'https'
    const protocol = resolvedProto === 'http' ? 'http' : 'https'

    return `${protocol}://${resolvedHost}`
}

export async function getPublicBaseUrl(): Promise<string> {
    const headerList = await headers()

    return resolvePublicBaseUrl({
        envUrl: process.env.NEXT_PUBLIC_SITE_URL,
        forwardedHost: headerList.get('x-forwarded-host'),
        forwardedProto: headerList.get('x-forwarded-proto'),
        host: headerList.get('host'),
    })
}
