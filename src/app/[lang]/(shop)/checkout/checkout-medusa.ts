/**
 * Internal Medusa Store API fetcher used by checkout server actions.
 * Server-only — never import in client components.
 */

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ''

export async function medusaStore<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const url = `${MEDUSA_BACKEND_URL}${path}`
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(PUBLISHABLE_KEY && { 'x-publishable-api-key': PUBLISHABLE_KEY }),
        ...options?.headers,
    }
    const res = await fetch(url, { ...options, headers })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Medusa ${res.status}: ${path} — ${text}`)
    }
    return res.json()
}
