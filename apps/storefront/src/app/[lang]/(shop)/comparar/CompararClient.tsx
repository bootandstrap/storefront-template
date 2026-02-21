'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Scale, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react'
import { useCompare } from '@/contexts/CompareContext'

interface CompareProduct {
    id: string
    title: string
    handle: string
    description: string | null
    thumbnail: string | null
    categories: { name: string }[]
    variants: {
        id: string
        title: string
        inventory_quantity?: number
        calculated_price?: {
            calculated_amount: number
            currency_code: string
        }
        prices: { amount: number; currency_code: string }[]
        options: { value: string }[]
    }[]
}

export default function CompararClient({ lang }: { lang: string }) {
    const { items, removeItem, clear } = useCompare()
    const [products, setProducts] = useState<CompareProduct[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (items.length === 0) {
            setProducts([])
            setLoading(false)
            return
        }

        const fetchProducts = async () => {
            setLoading(true)
            try {
                const results: CompareProduct[] = []
                for (const id of items) {
                    const res = await fetch(`/api/products/${id}`)
                    if (res.ok) {
                        const data = await res.json()
                        if (data.product) results.push(data.product)
                    }
                }
                setProducts(results)
            } catch {
                console.error('Failed to fetch comparison products')
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [items])

    const getPrice = (product: CompareProduct) => {
        const variant = product.variants?.[0]
        if (!variant) return null
        const calc = variant.calculated_price
        if (calc) return { amount: calc.calculated_amount / 100, currency: calc.currency_code }
        const price = variant.prices?.[0]
        if (price) return { amount: price.amount / 100, currency: price.currency_code }
        return null
    }

    const formatPrice = (amount: number, currency: string) =>
        new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-ES', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount)

    if (loading) {
        return (
            <div className="container-page py-12">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-surface-1 rounded" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="space-y-3">
                                <div className="aspect-square bg-surface-1 rounded-xl" />
                                <div className="h-4 bg-surface-1 rounded w-3/4" />
                                <div className="h-4 bg-surface-1 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="container-page py-16 text-center">
                <Scale className="w-16 h-16 mx-auto text-text-muted mb-4" />
                <h1 className="text-2xl font-bold font-display text-text-primary mb-2">
                    {lang === 'es' ? 'Sin productos para comparar' : 'No products to compare'}
                </h1>
                <p className="text-text-muted mb-6">
                    {lang === 'es'
                        ? 'Añade al menos 2 productos para compararlos.'
                        : 'Add at least 2 products to compare them.'}
                </p>
                <Link
                    href={`/${lang}/productos`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium transition-all hover:shadow-lg"
                    style={{ backgroundColor: 'var(--config-primary, #6366f1)' }}
                >
                    <ShoppingBag className="w-4 h-4" />
                    {lang === 'es' ? 'Ver productos' : 'Browse products'}
                </Link>
            </div>
        )
    }

    return (
        <div className="container-page py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Link
                        href={`/${lang}/productos`}
                        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {lang === 'es' ? 'Volver a productos' : 'Back to products'}
                    </Link>
                    <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                        <Scale className="w-6 h-6 text-primary" />
                        {lang === 'es' ? 'Comparar productos' : 'Compare products'}
                        <span className="text-sm font-normal text-text-muted">({products.length})</span>
                    </h1>
                </div>
                <button
                    onClick={clear}
                    className="text-sm text-text-muted hover:text-red-500 transition-colors flex items-center gap-1"
                >
                    <Trash2 className="w-4 h-4" />
                    {lang === 'es' ? 'Limpiar todo' : 'Clear all'}
                </button>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    {/* Product images + titles */}
                    <thead>
                        <tr>
                            <th className="p-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider w-[120px]" />
                            {products.map(p => (
                                <th key={p.id} className="p-3 text-center min-w-[200px]">
                                    <div className="relative group">
                                        <button
                                            onClick={() => removeItem(p.id)}
                                            className="absolute -top-1 -right-1 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            aria-label={`Remove ${p.title}`}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                        <Link href={`/${lang}/productos/${p.handle}`}>
                                            <div className="aspect-square w-full max-w-[160px] mx-auto rounded-xl overflow-hidden bg-surface-1 mb-3">
                                                {p.thumbnail ? (
                                                    <Image
                                                        src={p.thumbnail}
                                                        alt={p.title}
                                                        width={160}
                                                        height={160}
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                                                        <ShoppingBag className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm font-semibold text-text-primary hover:text-primary transition-colors">
                                                {p.title}
                                            </p>
                                        </Link>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-3">
                        {/* Price */}
                        <tr className="bg-surface-0">
                            <td className="p-3 text-xs font-semibold text-text-muted uppercase">
                                {lang === 'es' ? 'Precio' : 'Price'}
                            </td>
                            {products.map(p => {
                                const price = getPrice(p)
                                return (
                                    <td key={p.id} className="p-3 text-center">
                                        {price ? (
                                            <span className="text-lg font-bold text-primary">
                                                {formatPrice(price.amount, price.currency)}
                                            </span>
                                        ) : (
                                            <span className="text-text-muted">—</span>
                                        )}
                                    </td>
                                )
                            })}
                        </tr>

                        {/* Category */}
                        <tr>
                            <td className="p-3 text-xs font-semibold text-text-muted uppercase">
                                {lang === 'es' ? 'Categoría' : 'Category'}
                            </td>
                            {products.map(p => (
                                <td key={p.id} className="p-3 text-center text-sm text-text-secondary">
                                    {p.categories?.[0]?.name || '—'}
                                </td>
                            ))}
                        </tr>

                        {/* Description */}
                        <tr className="bg-surface-0">
                            <td className="p-3 text-xs font-semibold text-text-muted uppercase">
                                {lang === 'es' ? 'Descripción' : 'Description'}
                            </td>
                            {products.map(p => (
                                <td key={p.id} className="p-3 text-center text-sm text-text-secondary">
                                    <p className="line-clamp-3">
                                        {p.description || '—'}
                                    </p>
                                </td>
                            ))}
                        </tr>

                        {/* Variants / Options */}
                        <tr>
                            <td className="p-3 text-xs font-semibold text-text-muted uppercase">
                                {lang === 'es' ? 'Opciones' : 'Options'}
                            </td>
                            {products.map(p => (
                                <td key={p.id} className="p-3 text-center">
                                    <div className="flex flex-wrap justify-center gap-1">
                                        {p.variants?.map(v => (
                                            <span
                                                key={v.id}
                                                className="inline-block text-xs px-2 py-0.5 rounded-full bg-surface-1 text-text-secondary"
                                            >
                                                {v.title}
                                            </span>
                                        ))}
                                        {(!p.variants || p.variants.length === 0) && (
                                            <span className="text-text-muted text-sm">—</span>
                                        )}
                                    </div>
                                </td>
                            ))}
                        </tr>

                        {/* Stock */}
                        <tr className="bg-surface-0">
                            <td className="p-3 text-xs font-semibold text-text-muted uppercase">
                                {lang === 'es' ? 'Disponibilidad' : 'Availability'}
                            </td>
                            {products.map(p => {
                                const qty = p.variants?.[0]?.inventory_quantity
                                const inStock = qty === undefined || qty > 0
                                return (
                                    <td key={p.id} className="p-3 text-center">
                                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${inStock ? 'text-emerald-600' : 'text-red-500'}`}>
                                            <span className={`w-2 h-2 rounded-full ${inStock ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            {inStock
                                                ? (lang === 'es' ? 'En stock' : 'In stock')
                                                : (lang === 'es' ? 'Agotado' : 'Out of stock')}
                                        </span>
                                    </td>
                                )
                            })}
                        </tr>

                        {/* CTA */}
                        <tr>
                            <td className="p-3" />
                            {products.map(p => (
                                <td key={p.id} className="p-3 text-center">
                                    <Link
                                        href={`/${lang}/productos/${p.handle}`}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-all hover:shadow-md active:scale-95"
                                        style={{ backgroundColor: 'var(--config-primary, #6366f1)' }}
                                    >
                                        <ShoppingBag className="w-4 h-4" />
                                        {lang === 'es' ? 'Ver producto' : 'View product'}
                                    </Link>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
