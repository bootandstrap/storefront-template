import Link from 'next/link'
import { Search, Home } from 'lucide-react'
import { getDictionary, createTranslator, localizedHref, type Locale, isValidLocale } from '@/lib/i18n'
import { headers } from 'next/headers'

export default async function NotFound() {
    // Extract lang from the URL path segment
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || ''
    const segments = pathname.split('/').filter(Boolean)
    const lang = (segments[0] && isValidLocale(segments[0])) ? segments[0] as Locale : 'en'

    const dictionary = await getDictionary(lang)
    const t = createTranslator(dictionary)

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="text-8xl font-bold font-display text-sf-3 mb-4">404</div>
                <h1 className="text-2xl font-bold font-display text-tx mb-3">
                    {t('error.notFound.title')}
                </h1>
                <p className="text-tx-muted mb-8">
                    {t('error.notFound.description')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href={`/${lang}`} className="btn btn-primary">
                        <Home className="w-4 h-4" />
                        {t('error.notFound.goHome')}
                    </Link>
                    <Link href={localizedHref(lang, 'products', dictionary)} className="btn btn-secondary">
                        <Search className="w-4 h-4" />
                        {t('error.notFound.viewProducts')}
                    </Link>
                </div>
            </div>
        </div>
    )
}
