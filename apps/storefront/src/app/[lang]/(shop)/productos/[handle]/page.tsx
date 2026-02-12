import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getProduct, getProducts } from '@/lib/medusa/client'
import { getConfig, getRequiredTenantId } from '@/lib/config'
import { getPrice, formatPrice } from '@/lib/medusa/price'
import { productJsonLD } from '@/lib/seo/jsonld'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import AddToCartButton from '@/components/products/AddToCartButton'
import ProductCard from '@/components/products/ProductCard'
import WishlistButton from '@/components/products/WishlistButton'
import ProductReviews from '@/components/products/ProductReviews'
import { Truck, ShieldCheck, Package, ChevronRight } from 'lucide-react'

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
    const variant = product.variants?.[0]
    const resolved = getPrice(variant)
    const jsonLd = productJsonLD(product, config)

    // Fetch related products
    const categoryId = product.categories?.[0]?.id
    const { products: related } = categoryId
        ? await getProducts({ limit: 4, category_id: [categoryId] })
        : { products: [] }
    const relatedProducts = related.filter((p) => p.id !== product.id).slice(0, 4)

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
                    <Link href="/" className="hover:text-primary transition-colors">{t('nav.home')}</Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <Link href="/productos" className="hover:text-primary transition-colors">{t('nav.products')}</Link>
                    {product.categories?.[0] && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5" />
                            <Link
                                href={`/productos?category=${product.categories[0].handle}`}
                                className="hover:text-primary transition-colors"
                            >
                                {product.categories[0].name}
                            </Link>
                        </>
                    )}
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-text-primary font-medium truncate">{product.title}</span>
                </nav>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    {/* Image gallery */}
                    <div className="space-y-4">
                        <div className="relative aspect-square rounded-2xl overflow-hidden bg-surface-1">
                            {product.thumbnail ? (
                                <Image
                                    src={product.thumbnail}
                                    alt={product.title}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    className="object-cover"
                                    priority
                                />
                            ) : (
                                <div className="image-fallback">
                                    <Package className="!w-16 !h-16" strokeWidth={1} />
                                </div>
                            )}
                            {/* Wishlist button */}
                            {featureFlags.enable_wishlist && (
                                <div className="absolute top-3 right-3 z-10">
                                    <WishlistButton productId={product.id} />
                                </div>
                            )}
                        </div>
                        {product.images.length > 1 && (
                            <div className="grid grid-cols-4 gap-2">
                                {product.images.slice(0, 4).map((img) => (
                                    <div
                                        key={img.id}
                                        className="relative aspect-square rounded-xl overflow-hidden bg-surface-1 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                    >
                                        <Image
                                            src={img.url}
                                            alt={product.title}
                                            fill
                                            sizes="(max-width: 768px) 25vw, 12vw"
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product info */}
                    <div className="flex flex-col">
                        {/* Category badge */}
                        {product.categories?.[0] && (
                            <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full w-fit mb-3">
                                {product.categories[0].name}
                            </span>
                        )}

                        <h1 className="text-2xl md:text-3xl font-bold font-display text-text-primary mb-2">
                            {product.title}
                        </h1>

                        {product.subtitle && (
                            <p className="text-text-muted mb-4">{product.subtitle}</p>
                        )}

                        {/* Price — using shared utility */}
                        {resolved && (
                            <p className="text-3xl font-bold text-primary mb-6">
                                {formatPrice(resolved.amount, resolved.currency)}
                            </p>
                        )}

                        {/* Variant info */}
                        {product.variants && product.variants.length > 1 && (
                            <p className="text-sm text-text-secondary mb-4">
                                {t('product.variants', { count: String(product.variants.length) })}
                            </p>
                        )}

                        {/* Description */}
                        {product.description && (
                            <div className="prose prose-sm text-text-secondary mb-6 max-w-none">
                                <p>{product.description}</p>
                            </div>
                        )}

                        {/* Add to cart */}
                        {variant && (
                            <AddToCartButton
                                variantId={variant.id}
                                productTitle={product.title}
                                className="mb-6"
                            />
                        )}

                        {/* Delivery info */}
                        <div className="border-t border-surface-3 pt-6 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-text-secondary">
                                <Truck className="w-5 h-5 text-primary shrink-0" />
                                <span>{t('product.deliveryAvailable')}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-text-secondary">
                                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                                <span>{t('product.qualityGuarantee')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related products */}
                {relatedProducts.length > 0 && (
                    <section className="mt-16">
                        <h2 className="text-2xl font-bold font-display text-text-primary mb-6">
                            {t('product.relatedProducts')}
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            {relatedProducts.map((p) => (
                                <ProductCard key={p.id} product={p} />
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
            </div>
        </>
    )
}
