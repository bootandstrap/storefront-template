'use client'

/**
 * PanelErrorBoundary — Reusable error boundary for panel pages
 *
 * Shows a friendly error message with retry and back-to-panel options.
 * Logs error to console (Sentry auto-captures client errors).
 *
 * Usage: export as `error.tsx` in any panel page directory.
 *
 * @module components/panel/PanelErrorBoundary
 */

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
    error: Error & { digest?: string }
    reset: () => void
}

export default function PanelErrorBoundary({ error, reset }: Props) {
    useEffect(() => {
        console.error('[PanelError]', error)
    }, [error])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center min-h-[60vh] p-6"
        >
            <div className="max-w-md w-full text-center space-y-5">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-tx-pri">
                        Algo salió mal
                    </h2>
                    <p className="text-sm text-tx-sec">
                        Ha ocurrido un error inesperado. Puedes intentar recargar esta sección
                        o volver al panel principal.
                    </p>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-left">
                        <p className="text-xs font-mono text-red-600 break-all">
                            {error.message}
                        </p>
                        {error.digest && (
                            <p className="text-xs text-tx-ter mt-1">
                                Digest: {error.digest}
                            </p>
                        )}
                    </div>
                )}

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-4 py-2.5 text-sm font-medium rounded-xl bg-brand text-white hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                    <a
                        href="/panel"
                        className="px-4 py-2.5 text-sm font-medium rounded-xl border border-brd-pri text-tx-sec hover:bg-sf-sec transition-colors flex items-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Ir al panel
                    </a>
                </div>
            </div>
        </motion.div>
    )
}
