// ---------------------------------------------------------------------------
// Retry wrapper with exponential backoff for API calls
// ---------------------------------------------------------------------------

interface RetryOptions {
    /** Maximum number of attempts (default: 3) */
    maxAttempts?: number
    /** Base delay in ms between retries (default: 500) */
    baseDelay?: number
    /** Which HTTP status codes should trigger a retry */
    retryOn?: number[]
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelay: 500,
    retryOn: [408, 429, 500, 502, 503, 504],
}

/**
 * Wraps an async function and retries on transient failures.
 *
 * Usage:
 *   const data = await withRetry(() => fetchSomething())
 *   const data = await withRetry(() => fetchSomething(), { maxAttempts: 2 })
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    let lastError: unknown

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err

            // Check if we should retry based on status code
            if (err instanceof Response && !opts.retryOn.includes(err.status)) {
                throw err
            }

            // Don't retry on last attempt
            if (attempt === opts.maxAttempts) break

            // Exponential backoff with jitter
            const delay = opts.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }

    throw lastError
}
