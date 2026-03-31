'use client'

import { Star } from 'lucide-react'

// ---------------------------------------------------------------------------
// Rating Distribution Chart — 5-bar horizontal display
// ---------------------------------------------------------------------------

interface RatingDistributionProps {
    /** Array of counts per star: [1-star, 2-star, 3-star, 4-star, 5-star] */
    distribution: number[]
    totalCount: number
    avgRating: number
}

/**
 * RatingDistribution — compact visual summary of review ratings.
 *
 * Shows:
 * - Large average rating number with star icon
 * - 5 horizontal bars showing distribution
 * - Count labels per star level
 */
export default function RatingDistribution({
    distribution,
    totalCount,
    avgRating,
}: RatingDistributionProps) {
    const maxCount = Math.max(...distribution, 1)

    return (
        <div className="flex items-start gap-6">
            {/* Average rating — big number */}
            <div className="text-center shrink-0">
                <div className="text-4xl font-bold text-tx mb-1">
                    {avgRating.toFixed(1)}
                </div>
                <div className="flex justify-center gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map(star => (
                        <Star
                            key={star}
                            size={14}
                            className={`${
                                star <= Math.round(avgRating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'fill-none text-sf-3'
                            }`}
                        />
                    ))}
                </div>
                <div className="text-xs text-tx-muted">
                    {totalCount} {totalCount === 1 ? 'review' : 'reviews'}
                </div>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                    const count = distribution[star - 1] || 0
                    const pct = totalCount > 0 ? (count / maxCount) * 100 : 0

                    return (
                        <div key={star} className="flex items-center gap-2">
                            <span className="text-xs text-tx-muted w-3 text-right shrink-0">
                                {star}
                            </span>
                            <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                            <div className="flex-1 h-2 bg-sf-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span className="text-xs text-tx-muted w-6 text-right shrink-0">
                                {count}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
