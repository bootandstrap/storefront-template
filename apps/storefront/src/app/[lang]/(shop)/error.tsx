'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface ErrorPageProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    const params = useParams()
    const lang = (params?.lang as string) || 'es'
    const isEs = lang === 'es'

    useEffect(() => {
        // Log to error tracking in production
        console.error('[Shop Error Boundary]', error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-20">
            <div className="text-center max-w-lg">
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold font-display text-tx mb-3">
                    {isEs ? 'Algo salió mal' : 'Something went wrong'}
                </h1>
                <p className="text-tx-muted mb-8 max-w-md mx-auto leading-relaxed">
                    {isEs
                        ? 'Ha ocurrido un error inesperado. Por favor, inténtelo de nuevo.'
                        : 'An unexpected error occurred. Please try again.'
                    }
                </p>

                {/* Error digest (dev only) */}
                {error.digest && (
                    <p className="text-xs text-tx-faint mb-6 font-mono bg-sf-2 rounded-lg px-3 py-1.5 inline-block">
                        ID: {error.digest}
                    </p>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => reset()}
                        className="btn btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {isEs ? 'Intentar de nuevo' : 'Try again'}
                    </button>
                    <Link
                        href={`/${lang}`}
                        className="btn btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl"
                    >
                        <Home className="w-4 h-4" />
                        {isEs ? 'Ir al inicio' : 'Go home'}
                    </Link>
                </div>
            </div>
        </div>
    )
}
