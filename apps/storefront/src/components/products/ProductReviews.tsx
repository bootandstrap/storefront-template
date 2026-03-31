'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Star, Send, Loader2, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { getPublicMedusaUrl, getPublishableKey } from '@/lib/medusa/url'
import RatingDistribution from './RatingDistribution'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Review {
    id: string
    author_name: string
    rating: number
    comment: string | null
    created_at: string
}

interface ProductReviewsProps {
    productId: string
    tenantId?: string // kept for backward compatibility, but no longer used
}

// ---------------------------------------------------------------------------
// Star Rating Component
// ---------------------------------------------------------------------------

function StarRating({
    value,
    onChange,
    readonly = false,
    size = 20,
}: {
    value: number
    onChange?: (v: number) => void
    readonly?: boolean
    size?: number
}) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => onChange?.(star)}
                    className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
                    aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                >
                    <Star
                        size={size}
                        className={`transition-colors ${star <= value
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-none text-sf-3'
                            }`}
                    />
                </button>
            ))}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Product Reviews Component — backed by Medusa API
// ---------------------------------------------------------------------------

export default function ProductReviews({ productId }: ProductReviewsProps) {
    const { t } = useI18n()
    const [reviews, setReviews] = useState<Review[]>([])
    const [avgRating, setAvgRating] = useState(0)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [showForm, setShowForm] = useState(false)

    // Form fields
    const [authorName, setAuthorName] = useState('')
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest')
    const [reviewPage, setReviewPage] = useState(1)
    const REVIEWS_PER_PAGE = 5

    const medusaUrl = getPublicMedusaUrl()
    const publishableKey = getPublishableKey()

    // Load reviews from Medusa Store API
    const loadReviews = useCallback(async () => {
        try {
            const res = await fetch(`${medusaUrl}/store/reviews/${productId}`, {
                headers: {
                    ...(publishableKey && { 'x-publishable-api-key': publishableKey }),
                },
            })
            if (res.ok) {
                const data = await res.json()
                setReviews(data.reviews || [])
                setAvgRating(data.avg_rating || 0)
            }
        } catch {
            // Silently fail — reviews are non-critical
        } finally {
            setLoading(false)
        }
    }, [productId, medusaUrl, publishableKey])

    useEffect(() => { loadReviews() }, [loadReviews])

    // Submit review to Medusa Store API
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!authorName.trim() || !rating) return

        setSubmitting(true)
        setError(null)

        try {
            const res = await fetch(`${medusaUrl}/store/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(publishableKey && { 'x-publishable-api-key': publishableKey }),
                },
                body: JSON.stringify({
                    product_id: productId,
                    author_name: authorName.trim(),
                    rating,
                    comment: comment.trim() || undefined,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || 'Error submitting review')
            }

            setAuthorName('')
            setRating(5)
            setComment('')
            setShowForm(false)
            setSuccess(true)
            setTimeout(() => setSuccess(false), 5000)
            // Note: new review is "pending" so it won't appear immediately.
            // We still reload to give a fresh view.
            await loadReviews()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error submitting review')
        } finally {
            setSubmitting(false)
        }
    }

    // Compute rating distribution
    const distribution = useMemo(() => {
        const counts = [0, 0, 0, 0, 0]
        for (const r of reviews) {
            if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++
        }
        return counts
    }, [reviews])

    // Sort reviews
    const sortedReviews = useMemo(() => {
        const sorted = [...reviews]
        switch (sortBy) {
            case 'highest': return sorted.sort((a, b) => b.rating - a.rating)
            case 'lowest': return sorted.sort((a, b) => a.rating - b.rating)
            default: return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }
    }, [reviews, sortBy])

    // Paginate
    const totalReviewPages = Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE)
    const paginatedReviews = useMemo(() => {
        const start = (reviewPage - 1) * REVIEWS_PER_PAGE
        return sortedReviews.slice(start, start + REVIEWS_PER_PAGE)
    }, [sortedReviews, reviewPage, REVIEWS_PER_PAGE])

    // Reset page on sort change
    useEffect(() => {
        setReviewPage(1)
    }, [sortBy])

    if (loading) {
        return (
            <div className="space-y-3 animate-pulse">
                <div className="h-6 w-32 bg-text-muted/10 rounded" />
                <div className="h-4 w-48 bg-text-muted/10 rounded" />
                <div className="h-20 bg-text-muted/10 rounded-xl" />
            </div>
        )
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold font-display text-tx">
                        {t('reviews.title') || 'Customer Reviews'}
                    </h2>
                </div>
                <button
                    type="button"
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-outline text-sm"
                >
                    {t('reviews.writeReview') || 'Write a review'}
                </button>
            </div>

            {/* Rating Distribution Chart */}
            {reviews.length > 0 && (
                <RatingDistribution
                    distribution={distribution}
                    totalCount={reviews.length}
                    avgRating={avgRating}
                />
            )}

            {/* Success message — note that reviews need owner approval */}
            {success && (
                <div className="px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
                    {t('reviews.thankYouPending') || 'Thank you for your review! It will be visible once approved.'}
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Review form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="glass rounded-xl p-5 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-tx-sec block mb-1">
                            {t('reviews.yourName') || 'Your name'}
                        </label>
                        <input
                            type="text"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            required
                            className="input w-full text-sm"
                            placeholder="Juan"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-tx-sec block mb-1">
                            {t('reviews.rating') || 'Rating'}
                        </label>
                        <StarRating value={rating} onChange={setRating} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-tx-sec block mb-1">
                            {t('reviews.comment') || 'Comment (optional)'}
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            className="input w-full resize-none text-sm"
                            placeholder={t('reviews.commentPlaceholder') || 'Share your experience...'}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting || !authorName.trim()}
                        className="btn btn-primary text-sm flex items-center gap-2"
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {t('reviews.submit') || 'Submit Review'}
                    </button>
                </form>
            )}

            {/* Reviews list */}
            {reviews.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                    <Star className="w-8 h-8 text-tx-faint mx-auto mb-2" />
                    <p className="text-sm text-tx-muted">
                        {t('reviews.noReviews') || 'No reviews yet. Be the first!'}
                    </p>
                </div>
            ) : (
                <>
                    {/* Sort controls */}
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-3.5 h-3.5 text-tx-muted" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'newest' | 'highest' | 'lowest')}
                            className="text-xs border border-sf-3 rounded-lg px-2 py-1.5 bg-sf-0 text-tx-sec focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            <option value="newest">{t('reviews.sortNewest') || 'Newest'}</option>
                            <option value="highest">{t('reviews.sortHighest') || 'Highest rated'}</option>
                            <option value="lowest">{t('reviews.sortLowest') || 'Lowest rated'}</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        {paginatedReviews.map((review) => (
                        <div key={review.id} className="glass rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-brand-subtle flex items-center justify-center text-brand text-xs font-bold">
                                        {review.author_name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-tx">
                                        {review.author_name}
                                    </span>
                                </div>
                                <span className="text-xs text-tx-muted">
                                    {new Date(review.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <StarRating value={review.rating} readonly size={14} />
                            {review.comment && (
                                <p className="text-sm text-tx-sec mt-2 leading-relaxed">
                                    {review.comment}
                                </p>
                            )}
                        </div>
                    ))}
                    </div>

                    {/* Review pagination */}
                    {totalReviewPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                                onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                                disabled={reviewPage <= 1}
                                className="p-1.5 rounded-lg border border-sf-3 disabled:opacity-30 hover:border-brand transition-colors"
                                aria-label="Previous reviews"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            {Array.from({ length: totalReviewPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setReviewPage(p)}
                                    className={`w-7 h-7 text-xs rounded-lg border transition-all ${
                                        reviewPage === p
                                            ? 'bg-brand text-white border-brand'
                                            : 'border-sf-3 hover:border-brand text-tx-sec'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setReviewPage((p) => Math.min(totalReviewPages, p + 1))}
                                disabled={reviewPage >= totalReviewPages}
                                className="p-1.5 rounded-lg border border-sf-3 disabled:opacity-30 hover:border-brand transition-colors"
                                aria-label="Next reviews"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </section>
    )
}
