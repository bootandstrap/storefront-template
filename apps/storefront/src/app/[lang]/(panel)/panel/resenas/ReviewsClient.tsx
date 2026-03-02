'use client'

/**
 * ReviewsClient — Owner Panel Reviews Moderation
 *
 * Displays all reviews with status filters and approve/reject/delete actions.
 * Gated by enable_reviews feature flag (checked at page level).
 */

import { useState, useTransition } from 'react'
import { Star, Check, XCircle, Trash2, Clock, Filter } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'
import { moderateReviewAction, deleteReviewAction } from './actions'
import type { Dictionary } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'

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

function StatusBadge({ status }: { status: ReviewStatus }) {
    const config: Record<ReviewStatus, { label: string; className: string; icon: typeof Clock }> = {
        pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
        approved: { label: 'Aprobada', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Check },
        rejected: { label: 'Rechazada', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    }

    const c = config[status]
    const Icon = c.icon

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
            <Icon className="w-3 h-3" />
            {c.label}
        </span>
    )
}

export default function ReviewsClient({
    initialReviews,
    initialStats,
    dictionary,
}: {
    initialReviews: Review[]
    initialStats: ReviewStats
    dictionary: Dictionary
}) {
    const t = createTranslator(dictionary)
    const { success, error: showError } = useToast()
    const [reviews, setReviews] = useState(initialReviews)
    const [stats, setStats] = useState(initialStats)
    const [filter, setFilter] = useState<ReviewStatus | 'all'>('all')
    const [isPending, startTransition] = useTransition()
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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
                // Update stats
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
            setDeleteConfirm(null)
        })
    }

    const filterButtons: Array<{ key: ReviewStatus | 'all'; label: string; count: number }> = [
        { key: 'all', label: t('common.all') || 'Todas', count: stats.total },
        { key: 'pending', label: t('panel.reviews.pending') || 'Pendientes', count: stats.pending },
        { key: 'approved', label: t('panel.reviews.approved_label') || 'Aprobadas', count: stats.approved },
        { key: 'rejected', label: t('panel.reviews.rejected_label') || 'Rechazadas', count: stats.rejected },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display text-text-primary">
                        {t('panel.nav.reviews') || 'Reseñas'}
                    </h1>
                    <p className="text-sm text-text-muted mt-1">
                        {t('panel.reviews.subtitle') || 'Modera las reseñas de tus productos'}
                    </p>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filterButtons.map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`glass rounded-xl p-4 text-left transition-all ${filter === key
                            ? 'ring-2 ring-primary/50 border-primary/30'
                            : 'hover:bg-surface-1'
                            }`}
                    >
                        <p className="text-2xl font-bold text-text-primary">{count}</p>
                        <p className="text-xs text-text-muted mt-0.5">{label}</p>
                    </button>
                ))}
            </div>

            {/* Filter indicator */}
            {filter !== 'all' && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Filter className="w-4 h-4" />
                    <span>Filtrando: {filterButtons.find(f => f.key === filter)?.label}</span>
                    <button
                        onClick={() => setFilter('all')}
                        className="text-primary hover:underline text-xs"
                    >
                        Limpiar
                    </button>
                </div>
            )}

            {/* Reviews list */}
            {filteredReviews.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                    <Star className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
                    <p className="text-text-muted text-sm">
                        {t('panel.reviews.empty') || 'No hay reseñas que mostrar'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredReviews.map(review => (
                        <div key={review.id} className="glass rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-semibold text-text-primary text-sm">
                                            {review.author_name}
                                        </span>
                                        <StarRating value={review.rating} />
                                        <StatusBadge status={review.status} />
                                    </div>

                                    {review.comment && (
                                        <p className="text-sm text-text-secondary mt-2 line-clamp-3">
                                            {review.comment}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                                        <span>
                                            {new Date(review.created_at).toLocaleDateString()}
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
                                        <button
                                            onClick={() => handleModerate(review.id, 'approved')}
                                            disabled={isPending}
                                            title={t('panel.reviews.approve') || 'Aprobar'}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                    {review.status !== 'rejected' && (
                                        <button
                                            onClick={() => handleModerate(review.id, 'rejected')}
                                            disabled={isPending}
                                            title={t('panel.reviews.reject') || 'Rechazar'}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setDeleteConfirm(review.id)}
                                        disabled={isPending}
                                        title={t('panel.reviews.delete') || 'Eliminar'}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="relative glass rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-text-primary mb-2">
                            {t('panel.reviews.confirmDelete') || '¿Eliminar reseña?'}
                        </h3>
                        <p className="text-sm text-text-muted mb-4">
                            {t('panel.reviews.confirmDeleteMessage') || 'Esta acción no se puede deshacer.'}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="btn btn-ghost flex-1"
                            >
                                {t('common.cancel') || 'Cancelar'}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={isPending}
                                className="btn flex-1 bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                            >
                                {t('panel.reviews.delete') || 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
