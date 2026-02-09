'use client'

import { RefreshCw } from 'lucide-react'

export default function ProductsError({
    reset,
}: {
    error: Error
    reset: () => void
}) {
    return (
        <div className="container-page py-16 text-center">
            <p className="text-4xl mb-4">📦</p>
            <h2 className="text-xl font-bold font-display text-text-primary mb-2">
                Error al cargar productos
            </h2>
            <p className="text-text-muted mb-6">
                No pudimos cargar los productos. Puede que los datos en caché estén
                disponibles — intenta recargar.
            </p>
            <button onClick={reset} className="btn btn-primary">
                <RefreshCw className="w-4 h-4" />
                Reintentar
            </button>
        </div>
    )
}
