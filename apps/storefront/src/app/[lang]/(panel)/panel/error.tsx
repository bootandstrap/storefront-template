/**
 * Panel Error Boundary — Catches React errors in the Owner Panel
 *
 * This is a Next.js 14+ error boundary component that provides a clean
 * recovery UI when any panel page throws. Prevents white screens and
 * gives the owner a way back to the dashboard.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default function PanelError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[Panel Error Boundary]', error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                {/* Message */}
                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-tx">
                        Something went wrong
                    </h2>
                    <p className="text-sm text-tx-muted leading-relaxed">
                        An unexpected error occurred while loading this page.
                        This has been logged automatically.
                    </p>
                    {error.digest && (
                        <p className="text-xs font-mono text-tx-muted/60 mt-2">
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-soft"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Try again
                    </button>
                    <a
                        href="/panel"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-sf-3 text-sm font-medium text-tx-sec hover:bg-sf-1 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Dashboard
                    </a>
                </div>

                {/* Debug info (dev only) */}
                {process.env.NODE_ENV === 'development' && (
                    <details className="text-left mt-4">
                        <summary className="text-xs text-tx-muted cursor-pointer hover:text-tx transition-colors">
                            Debug details
                        </summary>
                        <pre className="mt-2 p-3 rounded-xl bg-sf-1 text-xs text-tx-muted overflow-x-auto border border-sf-3/30 max-h-40">
                            {error.message}
                            {'\n\n'}
                            {error.stack}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    )
}
