/**
 * Timing-safe string comparison utility.
 *
 * Prevents timing oracle attacks when comparing secrets (API keys, tokens, etc.).
 * Uses crypto.timingSafeEqual which runs in constant time regardless of
 * how many bytes match.
 *
 * @module security/timing-safe
 * @see system_audit_2026_03_26.md §H-1
 */

import { timingSafeEqual } from 'node:crypto'

/**
 * Compare two strings in constant time.
 *
 * Returns false if lengths differ (leaks length info, acceptable for
 * fixed-length secrets). The important property is that the comparison
 * does NOT leak information about *which bytes* differ.
 */
export function isSecretValid(provided: string, expected: string): boolean {
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
}
