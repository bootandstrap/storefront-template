import 'server-only'
/**
 * Context Loader — Supabase Storage
 * Reads markdown files from Supabase Storage bucket per tenant.
 * Bucket structure: chatbot-docs/{tenant_id}/{locale}/*.md
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { CHAT_CONFIG } from './config'
import { logger } from '@/lib/logger'

// In-memory cache for document context, keyed by tenant_id:locale
const contextCache: Map<string, { content: string; timestamp: number }> = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Load all markdown documents from Supabase Storage for this tenant.
 * Falls back to 'es' if the locale folder doesn't exist.
 * Results are cached in memory for performance.
 */
export async function loadDocumentContext(tenantId: string, locale: string = 'es', maxDocs: number = 10): Promise<string> {
    const now = Date.now()
    const cacheKey = `${tenantId}:${locale}:${maxDocs}`

    // Return cached context if still valid
    const cached = contextCache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        return cached.content
    }

    try {
        const supabase = createAdminClient()
        const bucket = CHAT_CONFIG.docsBucket

        // Try locale-specific folder first
        let folderPath = `${tenantId}/${locale}`
        let { data: files, error } = await supabase.storage
            .from(bucket)
            .list(folderPath, { limit: 50, sortBy: { column: 'name', order: 'asc' } })

        // Fallback to 'es' if locale folder is empty or doesn't exist
        if ((!files || files.length === 0) && locale !== 'es') {
            folderPath = `${tenantId}/es`
            const result = await supabase.storage
                .from(bucket)
                .list(folderPath, { limit: 50, sortBy: { column: 'name', order: 'asc' } })
            files = result.data
            error = result.error
        }

        if (error || !files || files.length === 0) {
            logger.warn(`[ChatBot] No docs found for tenant ${tenantId} locale ${locale}`)
            return 'No documentation available.'
        }

        // Filter only .md files — respect tier-based maxDocs limit
        const mdFiles = files.filter(f => f.name.endsWith('.md')).slice(0, maxDocs)

        if (mdFiles.length === 0) {
            return 'No documentation available.'
        }

        // Download and concatenate all markdown files
        const contents: string[] = []
        for (const file of mdFiles) {
            const filePath = `${folderPath}/${file.name}`
            const { data, error: dlError } = await supabase.storage
                .from(bucket)
                .download(filePath)

            if (dlError || !data) {
                logger.warn(`[ChatBot] Failed to download ${filePath}:`, dlError?.message)
                continue
            }

            const text = await data.text()
            contents.push(`--- ${file.name} ---\n${text}\n`)
        }

        const fullContext = contents.join('\n')

        // Truncate if too long (rough estimate: 1 token ≈ 4 chars)
        const maxChars = CHAT_CONFIG.maxContextTokens * 4
        const truncatedContext = fullContext.length > maxChars
            ? fullContext.slice(0, maxChars) + '\n\n[Documentation truncated...]'
            : fullContext

        // Update cache
        contextCache.set(cacheKey, { content: truncatedContext, timestamp: now })

        return truncatedContext

    } catch (error) {
        logger.error('[ChatBot] Context loader error:', error)
        return 'No documentation available.'
    }
}

/**
 * Clear the cached context for all tenants/locales
 */
export function clearContextCache(): void {
    contextCache.clear()
}
