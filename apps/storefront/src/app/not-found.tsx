import Link from 'next/link'
import { cookies } from 'next/headers'
import { Home, ArrowLeft, Search } from 'lucide-react'

/**
 * Global 404 page — Premium design with helpful CTAs.
 *
 * Since this is at app root (no [lang] param), we infer locale from cookies.
 * All strings use a minimal inline dictionary to avoid importing the full i18n system.
 */

const STRINGS: Record<string, {
    title: string
    subtitle: string
    description: string
    home: string
    back: string
    search: string
}> = {
    es: {
        title: '404',
        subtitle: 'Página no encontrada',
        description: 'Lo sentimos, la página que buscas no existe, ha sido movida o el enlace es incorrecto.',
        home: 'Ir al inicio',
        back: 'Volver atrás',
        search: 'Buscar productos',
    },
    en: {
        title: '404',
        subtitle: 'Page not found',
        description: 'Sorry, the page you\'re looking for doesn\'t exist, has been moved, or the link is incorrect.',
        home: 'Go home',
        back: 'Go back',
        search: 'Search products',
    },
}

export default async function NotFound() {
    const cookieStore = await cookies()
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'es'
    const s = STRINGS[locale] || STRINGS.es

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20">
            <div className="text-center max-w-lg">
                {/* Large 404 number with brand gradient */}
                <div className="relative mb-8">
                    <div className="text-[10rem] sm:text-[12rem] font-bold font-display leading-none bg-gradient-to-br from-brand via-brand-light to-brand/30 bg-clip-text text-transparent select-none">
                        404
                    </div>
                    {/* Subtle glow behind */}
                    <div className="absolute inset-0 text-[10rem] sm:text-[12rem] font-bold font-display leading-none text-brand/10 blur-2xl select-none pointer-events-none" aria-hidden="true">
                        404
                    </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold font-display text-tx mb-3">
                    {s.subtitle}
                </h1>
                <p className="text-tx-muted mb-10 max-w-md mx-auto leading-relaxed">
                    {s.description}
                </p>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href={`/${locale}`}
                        className="btn btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl"
                    >
                        <Home className="w-4 h-4" />
                        {s.home}
                    </Link>
                    <Link
                        href={`/${locale}/productos`}
                        className="btn btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl"
                    >
                        <Search className="w-4 h-4" />
                        {s.search}
                    </Link>
                </div>

                {/* Decorative pattern */}
                <div className="mt-16 flex items-center justify-center gap-1 opacity-20" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-brand/60"
                            style={{ animationDelay: `${i * 150}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
