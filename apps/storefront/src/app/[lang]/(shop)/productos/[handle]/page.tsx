import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getProduct, getProducts } from '@/lib/medusa/client'
import { getConfig, getRequiredTenantId } from '@/lib/config'
import { getPrice, formatPrice } from '@/lib/medusa/price'
import { productJsonLD, breadcrumbListJsonLD } from '@/lib/seo/jsonld'
import { getDictionary, createTranslator, localizedHref, type Locale } from '@/lib/i18n'
import ProductDetailClient from '@/components/products/ProductDetailClient'
import ProductCard from '@/components/products/ProductCard'
import ProductReviews from '@/components/products/ProductReviews'
import ProductTabs from '@/components/products/ProductTabs'
import ProductViewTracker from '@/components/products/ProductViewTracker'
import RecentlyViewed from '@/components/products/RecentlyViewed'
import { Truck, ShieldCheck, RotateCcw, ChevronRight } from 'lucide-react'

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
    const breadcrumbJsonLd = breadcrumbListJsonLD(
        product,
        product.categories?.[0]?.name || null,
        lang,
    )

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
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />

            <div className="container-page py-8">
                {/* Breadcrumbs */}
                <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-tx-muted mb-6">
                    <Link href={localizedHref(lang as Locale, 'home', dictionary)} className="hover:text-brand transition-colors">{t('nav.home')}</Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <Link href={localizedHref(lang as Locale, 'products', dictionary)} className="hover:text-brand transition-colors">{t('nav.products')}</Link>
                    {product.categories?.[0] && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5" />
                            <Link
                                href={`${localizedHref(lang as Locale, 'products', dictionary)}?category=${product.categories[0].handle}`}
                                className="hover:text-brand transition-colors"
                            >
                                {product.categories[0].name}
                            </Link>
                        </>
                    )}
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-tx font-medium truncate">{product.title}</span>
                </nav>

                {/* Product detail — interactive client component */}
                <ProductDetailClient
                    product={product}
                    wishlistEnabled={!!featureFlags.enable_wishlist}
                    lowStockThreshold={config.low_stock_threshold ?? 5}
                />

                {/* Delivery info — trust badges */}
                <div className="mt-8 border-t border-sf-3 pt-6 flex flex-wrap gap-6">
                    <div className="flex items-center gap-3 text-sm text-tx-sec">
                        <Truck className="w-5 h-5 text-brand shrink-0" />
                        <span>{t('product.deliveryAvailable')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-tx-sec">
                        <ShieldCheck className="w-5 h-5 text-brand shrink-0" />
                        <span>{t('product.qualityGuarantee')}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-tx-sec">
                        <RotateCcw className="w-5 h-5 text-brand shrink-0" />
                        <span>{t('product.easyReturns') || 'Easy returns'}</span>
                    </div>
                </div>

                {/* Product Tabs: Description | Details | Reviews */}
                <section className="mt-10">
                    <ProductTabs
                        tabs={[
                            {
                                id: 'description',
                                label: t('product.description') || 'Description',
                                content: product.description ? (
                                    <div className="prose prose-sm text-tx-sec max-w-none">
                                        <p className="leading-relaxed">{product.description}</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-tx-muted">{t('product.noDescription') || 'No description available.'}</p>
                                )
                            },
                            ...(product.metadata && Object.keys(product.metadata).filter(k => k !== 'badges').length > 0
                                ? [{
                                    id: 'specs',
                                    label: t('product.specifications') || 'Details',
                                    content: (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {Object.entries(product.metadata || {})
                                                .filter(([k]) => k !== 'badges')
                                                .map(([key, value]) => (
                                                    <div key={key} className="flex justify-between px-3 py-2 bg-sf-1 rounded-lg">
                                                        <span className="text-sm font-medium text-tx-sec capitalize">{key.replace(/_/g, ' ')}</span>
                                                        <span className="text-sm text-tx">{String(value)}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    ),
                                }]
                                : []
                            ),
                            ...(featureFlags.enable_reviews ? [{
                                id: 'reviews',
                                label: t('reviews.title') || 'Reviews',
                                content: <ProductReviews productId={product.id} tenantId={tenantId} />,
                            }] : []),
                        ]}
                    />
                </section>

                {/* Related products — gated by feature flag */}
                {featureFlags.enable_related_products && relatedProducts.length > 0 && (
                    <section className="mt-16">
                        <h2 className="text-2xl font-bold font-display text-tx mb-6">
                            {t('product.relatedProducts')}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {relatedProducts.map((p) => (
                                <ProductCard key={p.id} product={p} badgesEnabled={featureFlags.enable_product_badges} />
                            ))}
                        </div>
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
