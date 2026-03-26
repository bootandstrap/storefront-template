import Link from 'next/link'
import { cookies } from 'next/headers'
import { Home } from 'lucide-react'

/**
 * Global 404 page.
 *
 * Since this is at app root (no [lang] param), we infer locale from cookies.
 * All strings use a minimal inline dictionary to avoid importing the full i18n system
 * (which depends on the [lang] route segment).
 */

const STRINGS: Record<string, { title: string; description: string; home: string }> = {
    es: {
        title: 'Página no encontrada',
        description: 'La página que buscas no existe o ha sido movida.',
        home: 'Ir al inicio',
    },
    en: {
        title: 'Page not found',
        description: 'The page you\'re looking for doesn\'t exist or has been moved.',
        home: 'Go home',
    },
}

export default async function NotFound() {
    const cookieStore = await cookies()
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'es'
    const s = STRINGS[locale] || STRINGS.es

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="text-8xl font-bold font-display text-surface-3 mb-4">404</div>
                <h1 className="text-2xl font-bold font-display text-text-primary mb-3">
                    {s.title}
                </h1>
                <p className="text-text-muted mb-8">
                    {s.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href={`/${locale}`} className="btn btn-primary">
                        <Home className="w-4 h-4" />
                        {s.home}
                    </Link>
                </div>
            </div>
        </div>
    )
}
