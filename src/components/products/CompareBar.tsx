'use client'

import { useEffect, useState } from 'react'
import { X, Scale } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useCompare } from '@/contexts/CompareContext'

interface ProductMini {
    id: string
    title: string
    thumbnail: string | null
}

export default function CompareBarWrapper({ lang }: { lang: string }) {
    const { items, removeItem, clear, count } = useCompare()
    const [products, setProducts] = useState<ProductMini[]>([])

    // Fetch minimal product info for selected items
    useEffect(() => {
        const fetchAll = async () => {
            if (items.length === 0) {
                setProducts([])
                return
            }
            const results: ProductMini[] = []
            for (const id of items) {
                try {
                    const res = await fetch(`/api/products/${id}`)
                    if (res.ok) {
                        const data = await res.json()
                        if (data.product) {
                            results.push({
                                id: data.product.id,
                                title: data.product.title,
                                thumbnail: data.product.thumbnail,
                            })
                        }
                    }
                } catch { /* ignore */ }
            }
            setProducts(results)
        }
        fetchAll()
    }, [items])

    return (
        <AnimatePresence>
            {count >= 2 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-40"
                >
                    <div className="bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_30px_rgba(0,0,0,0.1)]">
                        <div className="container-page py-3 flex items-center gap-4">
                            {/* Selected products */}
                            <div className="flex items-center gap-3 flex-1 overflow-x-auto">
                                <Scale className="w-5 h-5 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-600 flex-shrink-0">
                                    {count}/4
                                </span>
                                {products.map(product => (
                                    <div key={product.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1 flex-shrink-0">
                                        {product.thumbnail && (
                                            <Image
                                                src={product.thumbnail}
                                                alt={product.title}
                                                width={32}
                                                height={32}
                                                className="rounded object-cover"
                                            />
                                        )}
                                        <span className="text-xs text-gray-700 max-w-[100px] truncate">{product.title}</span>
                                        <button
                                            onClick={() => removeItem(product.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                            aria-label={`Remove ${product.title}`}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={clear}
                                    className="text-xs text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5"
                                >
                                    {lang === 'es' ? 'Limpiar' : 'Clear'}
                                </button>
                                <Link
                                    href={`/${lang}/comparar`}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-all hover:shadow-md active:scale-95"
                                    style={{ backgroundColor: 'var(--config-primary, #6366f1)' }}
                                >
                                    <Scale className="w-4 h-4" />
                                    {lang === 'es' ? 'Comparar' : 'Compare'}
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
