'use client'

/**
 * useLimitGuard — Client-side limit enforcement hook
 *
 * Provides pre-flight limit validation and structured toast notifications
 * for plan limit enforcement in panel client components.
 *
 * Features:
 * - Pre-check before form submission (prevents wasted server roundtrips)
 * - Rich toast with resource name, usage bar, and upgrade CTA
 * - Parses structured `LIMIT_EXCEEDED:...` errors from server responses
 * - Severity-based styling (warning/critical)
 *
 * @example
 * ```tsx
 * const { guardCreate, handleLimitError } = useLimitGuard()
 *
 * // Pre-flight check before opening a creation form:
 * if (!guardCreate(planLimits, 'max_products', currentCount, t)) return
 *
 * // After a server action returns an error:
 * if (!result.success && handleLimitError(result.error, t)) return // handled
 * toast.error(result.error) // generic error
 * ```
 *
 * @module useLimitGuard
 */

import { toast } from 'sonner'
import { checkLimit, getLimitSeverity, type LimitCheckResult } from '@/lib/limits'
import { parseLimitError, RESOURCE_LABEL_KEYS, type LimitExceededInfo } from '@/lib/limit-errors'
import type { LimitableResource } from '@bootandstrap/shared'
import type { PlanLimits } from '@/lib/config'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Translator = (key: string, vars?: Record<string, string | number>) => string

interface LimitGuardResult {
    /**
     * Pre-flight check: validates limit BEFORE attempting action.
     * Returns true if within limits, false if blocked (shows toast).
     */
    guardCreate: (
        limits: PlanLimits,
        resource: LimitableResource,
        currentCount: number,
        t: Translator,
        lang?: string
    ) => boolean

    /**
     * Post-action error handler: parses structured limit errors from server.
     * Returns true if the error was a limit error (and toast was shown).
     */
    handleLimitError: (
        error: string | undefined,
        t: Translator,
        lang?: string
    ) => boolean

    /**
     * Get the current limit status for a resource (for inline display).
     */
    getLimitStatus: (
        limits: PlanLimits,
        resource: LimitableResource,
        currentCount: number
    ) => LimitCheckResult
}

// ---------------------------------------------------------------------------
// Toast Rendering
// ---------------------------------------------------------------------------

function showLimitToast(
    info: { resource: LimitableResource; current: number; max: number; percentage: number },
    t: Translator,
    lang?: string
): void {
    const resourceKey = RESOURCE_LABEL_KEYS[info.resource] ?? info.resource
    const resourceLabel = t(resourceKey) || info.resource.replace('max_', '').replace(/_/g, ' ')
    const severity = info.percentage >= 90 ? 'critical' : 'warning'
    const modulesHref = lang ? `/${lang}/panel/modulos` : '/panel/modulos'

    toast.error(
        t('limits.exceeded.title', { resource: resourceLabel }) || `${resourceLabel} limit reached`,
        {
            description: t('limits.exceeded.description', {
                current: info.current,
                max: info.max,
            }) || `Using ${info.current} of ${info.max}. Upgrade your plan to increase this limit.`,
            duration: severity === 'critical' ? 8000 : 5000,
            action: {
                label: t('limits.exceeded.upgrade') || 'Upgrade →',
                onClick: () => {
                    window.location.href = modulesHref
                },
            },
        }
    )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLimitGuard(): LimitGuardResult {
    const guardCreate = (
        limits: PlanLimits,
        resource: LimitableResource,
        currentCount: number,
        t: Translator,
        lang?: string
    ): boolean => {
        const result = checkLimit(limits, resource, currentCount)

        if (!result.allowed) {
            showLimitToast(
                {
                    resource,
                    current: result.current,
                    max: result.limit,
                    percentage: result.percentage,
                },
                t,
                lang
            )
            return false
        }

        // Also warn if very close to limit (>90%)
        const severity = getLimitSeverity(result)
        if (severity === 'critical') {
            const resourceKey = RESOURCE_LABEL_KEYS[resource] ?? resource
            const resourceLabel = t(resourceKey) || resource.replace('max_', '').replace(/_/g, ' ')
            toast.warning(
                t('limits.approaching.title', { resource: resourceLabel }) || `${resourceLabel}: approaching limit`,
                {
                    description: t('limits.approaching.description', {
                        remaining: result.remaining,
                    }) || `Only ${result.remaining} remaining.`,
                    duration: 4000,
                }
            )
        }

        return true
    }

    const handleLimitError = (
        error: string | undefined,
        t: Translator,
        lang?: string
    ): boolean => {
        if (!error) return false

        const info = parseLimitError(error)
        if (!info) return false

        showLimitToast(info, t, lang)
        return true
    }

    const getLimitStatus = (
        limits: PlanLimits,
        resource: LimitableResource,
        currentCount: number
    ): LimitCheckResult => {
        return checkLimit(limits, resource, currentCount)
    }

    return { guardCreate, handleLimitError, getLimitStatus }
}
