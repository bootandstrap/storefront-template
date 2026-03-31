import Link from 'next/link'
import { getProducts } from '@/lib/medusa/client'
import { getConfig } from '@/lib/config'
import ProductCard from '@/components/products/ProductCard'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator, localizedHref, type Locale } from '@/lib/i18n'

interface FeaturedProductsProps {
    dictionary: Dictionary
    lang: string
}

export default async function FeaturedProducts({ dictionary, lang }: FeaturedProductsProps) {
    const t = createTranslator(dictionary)

    // Graceful fallback: Medusa might not be running (local dev, cold start)
    let products: Awaited<ReturnType<typeof getProducts>>['products'] = []
    try {
        const res = await getProducts({ limit: 8 })
        products = res.products
    } catch {
        // Medusa down — show empty state instead of crashing
    }

    const { featureFlags } = await getConfig()

    if (!products.length) {
        return (
            <section className="py-12 md:py-16">
                <div className="container-page text-center">
                    <p className="text-tx-muted">{t('product.noProducts')}</p>
                </div>
            </section>
        )
    }

    return (
        <section className="py-12 md:py-16">
            <div className="container-page">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold font-display text-tx">
                            {t('product.featured')}
                        </h2>
                        <div className="w-12 h-1 bg-brand rounded-full mt-2" />
                    </div>
                    <Link
                        href={localizedHref(lang as Locale, 'products', dictionary)}
                        className="group text-sm font-medium text-brand hover:text-brand-light transition-colors hidden sm:flex items-center gap-1"
                    >
                        {t('account.viewAll')}
                        <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                    </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map((product, i) => (
                        <div key={product.id} className={`animate-slide-up-stagger stagger-${Math.min(i + 1, 8)}`}>
                            <ProductCard product={product} badgesEnabled={featureFlags.enable_product_badges} />
                        </div>
                    ))}
                </div>
                <div className="mt-8 text-center sm:hidden">
                    <Link href={localizedHref(lang as Locale, 'products', dictionary)} className="btn btn-secondary">
                        {t('common.viewProducts')}
                    </Link>
                </div>
            </div>
        </section>
    )
}
