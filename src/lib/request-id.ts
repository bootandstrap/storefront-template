/**
 * Request tracing helper — extracts the x-request-id from incoming headers.
 *
 * Usage in Server Components / Route Handlers:
 *   import { getRequestId } from '@/lib/request-id'
 *   import { logger } from '@/lib/logger'
 *
 *   const requestId = await getRequestId()
 *   const log = logger.withRequest(requestId)
 *   log.info('Processing order', { orderId: '123' })
 */

import { headers } from 'next/headers'

/**
 * Get the x-request-id set by the proxy middleware.
 * Returns a fallback if the header is not present (e.g., during SSG).
 */
export async function getRequestId(): Promise<string> {
    try {
        const headersList = await headers()
        return headersList.get('x-request-id') || 'no-request-id'
    } catch {
        // headers() throws in static contexts — graceful fallback
        return 'static-context'
    }
}
