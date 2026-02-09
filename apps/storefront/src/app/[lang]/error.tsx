'use client'

import { RefreshCw } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">⚠️</span>
                </div>
                <h1 className="text-2xl font-bold font-display text-text-primary mb-3">
                    Algo salió mal
                </h1>
                <p className="text-text-muted mb-6">
                    Hubo un error inesperado. Por favor intenta de nuevo.
                </p>
                {error.digest && (
                    <p className="text-xs text-text-muted mb-4 font-mono">
                        Ref: {error.digest}
                    </p>
                )}
                <button onClick={reset} className="btn btn-primary">
                    <RefreshCw className="w-4 h-4" />
                    Reintentar
                </button>
            </div>
        </div>
    )
}
