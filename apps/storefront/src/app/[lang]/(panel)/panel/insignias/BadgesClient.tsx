'use client'

/**
 * Product Badges — Owner Panel (SOTA rewrite)
 *
 * Fixes:
 * - Emoji empty state → lucide icon + animated empty state
 * - Inline SVG fallback → lucide Package icon
 * - No animation → PageEntrance + ListStagger + StaggerItem
 * - Inline status badge → PanelStatusBadge-style
 * - Badge toggle: add scale ping animation
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import Image from 'next/image'
import { useI18n } from '@/lib/i18n/provider'
import { toggleBadge } from './actions'
import { AVAILABLE_BADGES, type BadgeId } from './badges'
import { Award, Package, Search } from 'lucide-react'
import { motion } from 'framer-motion'

import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'

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
            if (result.success) { router.refresh(); toast.success('✓') }
            else { setError(result.error ?? 'Error'); toast.error(result.error ?? 'Error') }
        })
    }

    return (
        <PageEntrance className="space-y-5">


            {/* Badge legend */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-4"
            >
                <p className="text-xs font-semibold text-tx-muted uppercase tracking-wide mb-2">
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
            </motion.div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm"
                >
                    {error}
                </motion.div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tx-muted" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('panel.badges.searchProducts')}
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] glass rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all"
                />
            </div>

            {/* Product list */}
            {filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Award className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <p className="text-tx-muted text-lg">
                            {products.length === 0
                                ? t('panel.badges.connectMedusa')
                                : t('panel.badges.noResults')}
                        </p>
                    </div>
                </motion.div>
            ) : (
                <ListStagger className="space-y-3">
                    {filtered.map((product) => (
                        <StaggerItem key={product.id}>
                            <motion.div
                                whileHover={{ y: -1 }}
                                className="glass rounded-2xl p-4 transition-shadow hover:shadow-lg"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Thumbnail */}
                                    <div className="w-12 h-12 rounded-xl bg-sf-1 flex-shrink-0 overflow-hidden relative">
                                        {product.thumbnail ? (
                                            <Image
                                                src={product.thumbnail}
                                                alt={product.title}
                                                fill
                                                className="object-cover"
                                                sizes="48px"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-tx-muted">
                                                <Package className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-tx truncate">
                                            {product.title}
                                        </h3>
                                        <p className="text-xs text-tx-muted">{product.handle}</p>
                                    </div>

                                    {/* Status */}
                                    <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 font-medium ${product.status === 'published'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-sf-2 text-tx-muted'
                                    }`}>
                                        {product.status}
                                    </span>
                                </div>

                                {/* Badge toggles */}
                                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-sf-2">
                                    {AVAILABLE_BADGES.map((badge) => {
                                        const isEnabled = product.badges.includes(badge.id)
                                        return (
                                            <motion.button
                                                key={badge.id}
                                                onClick={() => handleToggle(product.id, badge.id, isEnabled)}
                                                disabled={isPending}
                                                whileTap={{ scale: 0.92 }}
                                                aria-pressed={isEnabled}
                                                aria-label={`${badge.label}: ${isEnabled ? 'enabled' : 'disabled'}`}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[32px] rounded-full text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${isEnabled
                                                    ? badge.color + ' ring-2 ring-offset-1 ring-current/20 shadow-sm'
                                                    : 'bg-sf-1 text-tx-muted hover:bg-sf-2'
                                                } ${isPending ? 'opacity-50' : ''}`}
                                            >
                                                {badge.emoji} {badge.label}
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </ListStagger>
            )}
        </PageEntrance>
    )
}
