'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/provider'
import { toggleBadge } from './actions'
import { AVAILABLE_BADGES, type BadgeId } from './badges'

interface ProductWithBadges {
    id: string
    title: string
    handle: string
    thumbnail: string | null
    status: string
    badges: string[]
}

interface Props {
    products: ProductWithBadges[]
    error?: string
}

export default function BadgesClient({ products, error: initialError }: Props) {
    const { t } = useI18n()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()
    const [error, setError] = useState<string | null>(initialError ?? null)
    const [search, setSearch] = useState('')

    const filtered = products.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase())
    )

    const handleToggle = (productId: string, badgeId: BadgeId, currentlyEnabled: boolean) => {
        startTransition(async () => {
            const result = await toggleBadge(productId, badgeId, !currentlyEnabled)
            if (result.success) {
                router.refresh()
                toast.success('✓')
            } else {
                setError(result.error ?? 'Error')
                toast.error(result.error ?? 'Error')
            }
        })
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {t('panel.badges.title')}
                    </h1>
                    <p className="text-text-muted mt-1">{t('panel.badges.subtitle')}</p>
                </div>
            </div>

            {/* Badge legend */}
            <div className="glass rounded-2xl p-4">
                <p className="text-xs font-medium text-text-secondary mb-2">
                    {t('panel.badges.available')}
                </p>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_BADGES.map((badge) => (
                        <span
                            key={badge.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}
                        >
                            {badge.emoji} {badge.label}
                        </span>
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            {/* Search */}
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('panel.badges.searchProducts')}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />

            {/* Product list */}
            {filtered.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                    <div className="text-4xl mb-3">🏷️</div>
                    <p className="text-text-muted">
                        {products.length === 0
                            ? t('panel.badges.connectMedusa')
                            : t('panel.badges.noResults')}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((product) => (
                        <div key={product.id} className="glass rounded-2xl p-4">
                            <div className="flex items-center gap-4">
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-lg bg-surface-1 flex-shrink-0 overflow-hidden relative">
                                    {product.thumbnail ? (
                                        <Image
                                            src={product.thumbnail}
                                            alt={product.title}
                                            fill
                                            className="object-cover"
                                            sizes="48px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                                        </div>
                                    )}
                                </div>

                                {/* Title */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-text-primary truncate">
                                        {product.title}
                                    </h3>
                                    <p className="text-xs text-text-muted">{product.handle}</p>
                                </div>

                                {/* Status */}
                                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${product.status === 'published'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-surface-2 text-text-muted'
                                    }`}>
                                    {product.status}
                                </span>
                            </div>

                            {/* Badge toggles */}
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-surface-2">
                                {AVAILABLE_BADGES.map((badge) => {
                                    const isEnabled = product.badges.includes(badge.id)
                                    return (
                                        <button
                                            key={badge.id}
                                            onClick={() => handleToggle(product.id, badge.id, isEnabled)}
                                            disabled={isPending}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${isEnabled
                                                ? badge.color + ' ring-2 ring-offset-1 ring-current/20'
                                                : 'bg-surface-1 text-text-muted hover:bg-surface-2'
                                                } ${isPending ? 'opacity-50' : ''}`}
                                        >
                                            {badge.emoji} {badge.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
