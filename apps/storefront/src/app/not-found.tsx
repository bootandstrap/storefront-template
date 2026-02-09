import Link from 'next/link'
import { Search, Home } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="text-8xl font-bold font-display text-surface-3 mb-4">404</div>
                <h1 className="text-2xl font-bold font-display text-text-primary mb-3">
                    Página no encontrada
                </h1>
                <p className="text-text-muted mb-8">
                    La página que buscas no existe o fue movida.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/" className="btn btn-primary">
                        <Home className="w-4 h-4" />
                        Ir al inicio
                    </Link>
                    <Link href="/productos" className="btn btn-secondary">
                        <Search className="w-4 h-4" />
                        Ver productos
                    </Link>
                </div>
            </div>
        </div>
    )
}
