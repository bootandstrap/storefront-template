'use client'

/**
 * ModuleCheckoutButton — Handles module purchase/upgrade via Stripe Checkout
 *
 * Calls /api/module-purchase → BSWEB → Stripe Checkout Session
 * Redirects to Stripe, then back to /panel/suscripcion on success.
 */

import { useState, useCallback } from 'react'

interface ModuleCheckoutButtonProps {
    moduleKey: string
    tierKey?: string
    label: string
    variant: 'activate' | 'upgrade'
    colorGradient?: string
    disabled?: boolean
    locale: string
    className?: string
    /** Optional i18n error labels */
    errorLabels?: {
        generic?: string
        noUrl?: string
        network?: string
    }
}

export default function ModuleCheckoutButton({
    moduleKey,
    tierKey,
    label,
    variant,
    colorGradient,
    disabled = false,
    locale,
    className,
    errorLabels,
}: ModuleCheckoutButtonProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleClick = useCallback(async () => {
        if (loading || disabled) return
        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/module-purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-locale': locale,
                },
                body: JSON.stringify({
                    module_key: moduleKey,
                    tier_id: tierKey,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || errorLabels?.generic || 'Something went wrong')
                return
            }

            if (data.url) {
                window.location.href = data.url
            } else {
                setError(errorLabels?.noUrl || 'No checkout URL returned')
            }
        } catch {
            setError(errorLabels?.network || 'Network error')
        } finally {
            setLoading(false)
        }
    }, [moduleKey, tierKey, locale, loading, disabled])

    const baseClass = variant === 'activate'
        ? `bg-gradient-to-r ${colorGradient || 'from-primary to-accent'} text-white hover:opacity-90`
        : 'bg-accent/10 text-accent hover:bg-accent/20'

    return (
        <div className="relative">
            <button
                type="button"
                onClick={handleClick}
                disabled={loading || disabled}
                className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-200
                    ${baseClass}
                    ${loading ? 'opacity-60 cursor-wait' : ''}
                    ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
                    ${className || ''}
                `}
            >
                {loading ? (
                    <span className="flex items-center gap-1.5">
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <circle
                                cx="12" cy="12" r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                className="opacity-25"
                            />
                            <path
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                className="opacity-75"
                            />
                        </svg>
                        …
                    </span>
                ) : label}
            </button>
            {error && (
                <div className="absolute top-full left-0 mt-1 text-[10px] text-red-400 whitespace-nowrap z-10">
                    {error}
                </div>
            )}
        </div>
    )
}
