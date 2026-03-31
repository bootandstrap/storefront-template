'use client'

import { RefreshCw } from 'lucide-react'
import { getErrorStrings } from '@/lib/i18n/error-strings'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    // Extract locale from URL path (e.g. /es/... → 'es')
    const locale = typeof window !== 'undefined'
        ? window.location.pathname.split('/')[1]
        : undefined
    const strings = getErrorStrings(locale)

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h1 className="text-2xl font-bold font-display text-tx mb-3">
                    {strings.title}
                </h1>
                <p className="text-tx-muted mb-6">
                    {strings.description}
                </p>
                {error.digest && (
                    <p className="text-xs text-tx-muted mb-4 font-mono">
                        Ref: {error.digest}
                    </p>
                )}
                <button onClick={reset} className="btn btn-primary">
                    <RefreshCw className="w-4 h-4" />
                    {strings.retry}
                </button>
            </div>
        </div>
    )
}
