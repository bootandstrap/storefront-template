import type { Metadata } from 'next'

import CategoryGrid from '@/components/home/CategoryGrid'
import { createTranslator, getDictionary, type Locale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Categorias',
    description: 'Explora las categorias disponibles en la tienda',
}

export default async function CategoriasPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    return (
        <div className="container-page py-8">
            <h1 className="text-3xl md:text-4xl font-bold font-display text-tx mb-2">
                {t('product.categories')}
            </h1>
            <CategoryGrid dictionary={dictionary} lang={lang} />
        </div>
    )
}
