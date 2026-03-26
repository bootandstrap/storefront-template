'use client'

/**
 * ReviewsClient — Owner Panel Reviews Moderation (SOTA rewrite)
 *
 * SOTA upgrades:
 * - Hand-rolled delete modal → PanelConfirmDialog
 * - No animation → PageEntrance + ListStagger
 * - Static filter buttons → animated active indicator
 * - Inline StatusBadge → still local (domain-specific), but with AnimatePresence
 * - Animated moderation feedback
 */

import { useState, useTransition } from 'react'
import { Star, Check, XCircle, Trash2, Clock, Filter } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { moderateReviewAction, deleteReviewAction } from './actions'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'
import { toIntlLocale } from '@/lib/i18n/intl-locale'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import PanelConfirmDialog, { useConfirmDialog } from '@/components/panel/PanelConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'

type ReviewStatus = 'pending' | 'approved' | 'rejected'

interface Review {
    id: string
    product_id: string
    author_name: string
    rating: number
    comment: string | null
    status: ReviewStatus
    created_at: string
}

interface ReviewStats {
    total: number
    pending: number
    approved: number
    rejected: number
}

function StarRating({ value }: { value: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={`w-3.5 h-3.5 ${n <= value
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-text-muted/30'
                        }`}
                />
            ))}
        </div>
    )
}

const STATUS_CONFIG: Record<ReviewStatus, { className: string; icon: typeof Clock }> = {
    pending: { className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
    approved: { className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
    rejected: { className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
}

function StatusBadge({ status, statusLabels }: { status: ReviewStatus; statusLabels: Record<ReviewStatus, string> }) {
    const c = STATUS_CONFIG[status]
    const Icon = c.icon
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
            <Icon className="w-3 h-3" />
            {statusLabels[status]}
        </span>
    )
}

export default function ReviewsClient({
    initialReviews,
    initialStats,
    dictionary,
    lang,
}: {
    initialReviews: Review[]
    initialStats: ReviewStats
    dictionary: Dictionary
    lang: string
}) {
    const t = createTranslator(dictionary)
    const statusLabels: Record<ReviewStatus, string> = {
        pending: t('panel.reviews.statusPending'),
        approved: t('panel.reviews.statusApproved'),
        rejected: t('panel.reviews.statusRejected'),
    }
    const { success, error: showError } = useToast()
    const [reviews, setReviews] = useState(initialReviews)
    const [stats, setStats] = useState(initialStats)
    const [filter, setFilter] = useState<ReviewStatus | 'all'>('all')
    const [isPending, startTransition] = useTransition()

    const confirmDialog = useConfirmDialog({
        title: t('panel.reviews.confirmDelete') || '¿Eliminar reseña?',
        description: t('panel.reviews.confirmDeleteMessage') || 'Esta acción no se puede deshacer.',
        confirmLabel: t('panel.reviews.delete') || 'Eliminar',
        variant: 'danger',
    })

    const filteredReviews = filter === 'all'
        ? reviews
        : reviews.filter(r => r.status === filter)

    function handleModerate(reviewId: string, newStatus: 'approved' | 'rejected') {
        startTransition(async () => {
            const result = await moderateReviewAction(reviewId, newStatus)
            if (result.success) {
                setReviews(prev => prev.map(r =>
                    r.id === reviewId ? { ...r, status: newStatus } : r
                ))
                const old = reviews.find(r => r.id === reviewId)
                if (old) {
                    setStats(prev => ({
                        ...prev,
                        [old.status]: prev[old.status as keyof ReviewStats] as number - 1,
                        [newStatus]: prev[newStatus as keyof ReviewStats] as number + 1,
                    }))
                }
                success(newStatus === 'approved'
                    ? (t('panel.reviews.approved') || 'Review approved')
                    : (t('panel.reviews.rejected') || 'Review rejected')
                )
            } else {
                showError(t('common.error') || 'Operation failed')
            }
        })
    }

    function handleDelete(reviewId: string) {
        confirmDialog.confirm(() => {
            startTransition(async () => {
                const result = await deleteReviewAction(reviewId)
                if (result.success) {
                    const old = reviews.find(r => r.id === reviewId)
                    setReviews(prev => prev.filter(r => r.id !== reviewId))
                    if (old) {
                        setStats(prev => ({
                            ...prev,
                            total: prev.total - 1,
                            [old.status]: prev[old.status as keyof ReviewStats] as number - 1,
                        }))
                    }
                    success(t('panel.reviews.deleted') || 'Review deleted')
                } else {
                    showError(t('common.error') || 'Operation failed')
                }
            })
        })
    }

    const filterButtons: Array<{ key: ReviewStatus | 'all'; label: string; count: number }> = [
        { key: 'all', label: t('common.all') || 'Todas', count: stats.total },
        { key: 'pending', label: t('panel.reviews.pending') || 'Pendientes', count: stats.pending },
        { key: 'approved', label: t('panel.reviews.approved_label') || 'Aprobadas', count: stats.approved },
        { key: 'rejected', label: t('panel.reviews.rejected_label') || 'Rechazadas', count: stats.rejected },
    ]

    return (
        <PageEntrance className="space-y-6">
            <PanelPageHeader
                title={t('panel.nav.reviews') || 'Reseñas'}
                subtitle={t('panel.reviews.subtitle') || 'Modera las reseñas de tus productos'}
                icon={<Star className="w-5 h-5" />}
                badge={stats.total}
            />

            {/* ── Filter stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filterButtons.map(({ key, label, count }) => (
                    <motion.button
                        key={key}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setFilter(key)}
                        aria-pressed={filter === key}
                        className={`glass rounded-2xl p-4 min-h-[80px] text-left transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ${filter === key
                            ? 'ring-2 ring-primary/50'
                            : 'hover:bg-surface-1'
                            }`}
                    >
                        {filter === key && (
                            <motion.div
                                layoutId="review-filter-active"
                                className="absolute inset-0 rounded-2xl ring-2 ring-primary/50"
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        )}
                        <p className="text-2xl font-bold text-text-primary relative">{count}</p>
                        <p className="text-xs text-text-muted mt-0.5 relative">{label}</p>
                    </motion.button>
                ))}
            </div>

            {/* ── Filter indicator ── */}
            <AnimatePresence>
                {filter !== 'all' && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex items-center gap-2 text-sm text-text-muted"
                    >
                        <Filter className="w-4 h-4" />
                        <span>{t('panel.reviews.filtering')}: {filterButtons.find(f => f.key === filter)?.label}</span>
                        <button
                            onClick={() => setFilter('all')}
                            className="text-primary hover:underline text-xs min-h-[32px] px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            {t('common.clear')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Reviews list ── */}
            {filteredReviews.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl"
                >
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Star className="w-8 h-8 text-text-muted" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold font-display text-text-primary mb-2">
                            {t('panel.reviews.empty') || 'No reviews yet'}
                        </h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            {t('panel.reviews.emptyHint') || 'When customers leave reviews on your products, they will appear here for moderation.'}
                        </p>
                    </div>
                </motion.div>
            ) : (
                <ListStagger className="space-y-3">
                    {filteredReviews.map(review => (
                        <StaggerItem key={review.id}>
                            <motion.div
                                whileHover={{ y: -1 }}
                                className="glass rounded-xl p-4 transition-shadow hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="font-semibold text-text-primary text-sm">
                                                {review.author_name}
                                            </span>
                                            <StarRating value={review.rating} />
                                            <StatusBadge status={review.status} statusLabels={statusLabels} />
                                        </div>

                                        {review.comment && (
                                            <p className="text-sm text-text-secondary mt-2 line-clamp-3">
                                                {review.comment}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                                            <span>
                                                {new Date(review.created_at).toLocaleDateString(toIntlLocale(lang))}
                                            </span>
                                            <span className="text-text-muted/40">•</span>
                                            <span className="font-mono text-[10px]">
                                                {review.product_id.slice(0, 12)}...
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {review.status !== 'approved' && (
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleModerate(review.id, 'approved')}
                                                disabled={isPending}
                                                title={t('panel.reviews.approve') || 'Aprobar'}
                                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                                            >
                                                <Check className="w-4 h-4" />
                                            </motion.button>
                                        )}
                                        {review.status !== 'rejected' && (
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleModerate(review.id, 'rejected')}
                                                disabled={isPending}
                                                title={t('panel.reviews.reject') || 'Rechazar'}
                                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </motion.button>
                                        )}
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleDelete(review.id)}
                                            disabled={isPending}
                                            title={t('panel.reviews.delete') || 'Eliminar'}
                                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </ListStagger>
            )}

            <PanelConfirmDialog {...confirmDialog.dialogProps} />
        </PageEntrance>
    )
}
