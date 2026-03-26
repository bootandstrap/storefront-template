import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getProduct, getProducts } from '@/lib/medusa/client'
import { getConfig, getRequiredTenantId } from '@/lib/config'
import { getPrice, formatPrice } from '@/lib/medusa/price'
import { productJsonLD } from '@/lib/seo/jsonld'
import { getDictionary, createTranslator, localizedHref, type Locale } from '@/lib/i18n'
import ProductDetailClient from '@/components/products/ProductDetailClient'
import ProductCard from '@/components/products/ProductCard'
import ProductReviews from '@/components/products/ProductReviews'
import ProductViewTracker from '@/components/products/ProductViewTracker'
import RecentlyViewed from '@/components/products/RecentlyViewed'
import { Truck, ShieldCheck, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ lang: string; handle: string }>
}

// Dynamic metadata with OG
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { handle, lang } = await params
    const product = await getProduct(handle)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    if (!product) return { title: t('product.notFound') }

    const { config } = await getConfig()

    return {
        title: product.title,
        description: product.description || `${product.title} — ${config.business_name}`,
        openGraph: {
            title: product.title,
            description: product.description || undefined,
            images: product.thumbnail ? [{ url: product.thumbnail }] : undefined,
        },
    }
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { handle, lang } = await params
    const product = await getProduct(handle)

    if (!product) notFound()

    const { config, featureFlags } = await getConfig()
    const tenantId = getRequiredTenantId()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const jsonLd = productJsonLD(product, config)

    // Fetch related products — graceful if Medusa is down
    const categoryId = product.categories?.[0]?.id
    let relatedProducts: typeof product[] = []
    try {
        const { products: related } = categoryId
            ? await getProducts({ limit: 4, category_id: [categoryId] })
            : { products: [] as typeof product[] }
        relatedProducts = related.filter((p) => p.id !== product.id).slice(0, 4)
    } catch {
        // Medusa down for related products — skip section
    }

    return (
        <>
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <div className="container-page py-8">
                {/* Breadcrumbs */}
                <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-text-muted mb-6">
                    <Link href={localizedHref(lang as Locale, 'home', dictionary)} className="hover:text-primary transition-colors">{t('nav.home')}</Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <Link href={localizedHref(lang as Locale, 'products', dictionary)} className="hover:text-primary transition-colors">{t('nav.products')}</Link>
                    {product.categories?.[0] && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5" />
                            <Link
                                href={`${localizedHref(lang as Locale, 'products', dictionary)}?category=${product.categories[0].handle}`}
                                className="hover:text-primary transition-colors"
                            >
                                {product.categories[0].name}
                            </Link>
                        </>
                    )}
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-text-primary font-medium truncate">{product.title}</span>
                </nav>

                {/* Product detail — interactive client component */}
                <ProductDetailClient
                    product={product}
                    wishlistEnabled={!!featureFlags.enable_wishlist}
                    lowStockThreshold={config.low_stock_threshold ?? 5}
                />

                {/* Delivery info */}
                <div className="mt-8 border-t border-surface-3 pt-6 flex flex-wrap gap-6">
                    <div className="flex items-center gap-3 text-sm text-text-secondary">
                        <Truck className="w-5 h-5 text-primary shrink-0" />
                        <span>{t('product.deliveryAvailable')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-text-secondary">
                        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                        <span>{t('product.qualityGuarantee')}</span>
                    </div>
                </div>

                {/* Related products — gated by feature flag */}
                {featureFlags.enable_related_products && relatedProducts.length > 0 && (
                    <section className="mt-16">
                        <h2 className="text-2xl font-bold font-display text-text-primary mb-6">
                            {t('product.relatedProducts')}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {relatedProducts.map((p) => (
                                <ProductCard key={p.id} product={p} badgesEnabled={featureFlags.enable_product_badges} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Product Reviews */}
                {featureFlags.enable_reviews && (
                    <section className="mt-16">
                        <ProductReviews productId={product.id} tenantId={tenantId} />
                    </section>
                )}

                {/* Recently Viewed — client-only, localStorage-based */}
                <section className="mt-16">
                    <RecentlyViewed currentHandle={product.handle!} />
                </section>

                {/* Track this product view — thin client wrapper */}
                <ProductViewTracker
                    handle={product.handle!}
                    title={product.title}
                    thumbnail={product.thumbnail}
                />
            </div>
        </>
    )
}
