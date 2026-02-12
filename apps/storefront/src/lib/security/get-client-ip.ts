/**
 * Shared IP extraction with trusted proxy awareness.
 *
 * TRUSTED PROXY MODEL:
 *   In production behind a reverse proxy (Nginx/Dokploy), the LAST value in
 *   X-Forwarded-For is the one appended by our trusted proxy and represents
 *   the real client IP. The FIRST value is user-controllable and can be spoofed.
 *
 *   For single-proxy setups (our architecture), we take the LAST value.
 *   For multi-proxy setups, you'd count from the right by the number of trusted hops.
 *
 * FALLBACK CHAIN: X-Forwarded-For (last) → X-Real-IP → 0.0.0.0
 */

/**
 * Extract the client IP address from request headers.
 * Uses the LAST value from X-Forwarded-For (trusted proxy model).
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
        const parts = forwarded.split(',').map(s => s.trim()).filter(Boolean)
        // Last entry = appended by our trusted reverse proxy
        return parts[parts.length - 1] || '0.0.0.0'
    }
    return request.headers.get('x-real-ip') || '0.0.0.0'
}
