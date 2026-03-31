'use client'

import { RefreshCw, ArrowLeft } from 'lucide-react'
import { getErrorStrings } from '@/lib/i18n/error-strings'
import { useParams, useRouter } from 'next/navigation'

/**
 * Error boundary for the owner panel.
 *
 * When a panel page throws, the user sees a friendly error rather than
 * a blank screen. Provides localized error messages and a retry button.
 */
export default function PanelError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const params = useParams()
    const router = useRouter()
    const locale = typeof params?.lang === 'string' ? params.lang : undefined
    const strings = getErrorStrings(locale)

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
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
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => router.back()}
                        className="btn btn-outline flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {strings.retry === 'Reintentar' ? 'Volver' : 'Go back'}
                    </button>
                    <button onClick={reset} className="btn btn-primary flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        {strings.retry}
                    </button>
                </div>
            </div>
        </div>
    )
}
