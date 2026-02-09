import Link from 'next/link'
import { getProducts } from '@/lib/medusa/client'
import ProductCard from '@/components/products/ProductCard'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'

interface FeaturedProductsProps {
    dictionary: Dictionary
}

export default async function FeaturedProducts({ dictionary }: FeaturedProductsProps) {
    const t = createTranslator(dictionary)
    const { products } = await getProducts({ limit: 8 })

    if (!products.length) {
        return (
            <section className="py-12 md:py-16">
                <div className="container-page text-center">
                    <p className="text-text-muted">{t('product.noProducts')}</p>
                </div>
            </section>
        )
    }

    return (
        <section className="py-12 md:py-16">
            <div className="container-page">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold font-display text-text-primary">
                        {t('product.featured')}
                    </h2>
                    <Link
                        href="/productos"
                        className="text-sm font-medium text-primary hover:text-primary-light transition-colors hidden sm:block"
                    >
                        {t('account.viewAll')} →
                    </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
                <div className="mt-8 text-center sm:hidden">
                    <Link href="/productos" className="btn btn-secondary">
                        {t('common.viewProducts')}
                    </Link>
                </div>
            </div>
        </section>
    )
}
