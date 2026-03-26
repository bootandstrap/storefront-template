// ---------------------------------------------------------------------------
// Panel loading skeleton — shown while any panel page is loading
// Uses SkeletonPulse shimmer for SOTA polish
// ---------------------------------------------------------------------------

import { SkeletonPulse } from '@/components/panel/PanelAnimations'

export default function PanelLoading() {
    return (
        <div className="space-y-6" role="status" aria-label="Loading panel content">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2.5">
                    <SkeletonPulse width="w-48" height="h-7" rounded="rounded-lg" />
                    <SkeletonPulse width="w-64" height="h-4" rounded="rounded-md" />
                </div>
                <SkeletonPulse width="w-32" height="h-10" rounded="rounded-xl" />
            </div>

            {/* Search / filter bar skeleton */}
            <div className="flex gap-3">
                <SkeletonPulse width="flex-1" height="h-10" rounded="rounded-xl" />
                <SkeletonPulse width="w-28" height="h-10" rounded="rounded-xl" />
            </div>

            {/* Content cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-surface-2 p-4 space-y-3"
                    >
                        <SkeletonPulse width="w-3/4" height="h-5" />
                        <SkeletonPulse width="w-1/2" height="h-4" />
                        <SkeletonPulse height="h-4" />
                        <div className="flex gap-2 pt-2">
                            <SkeletonPulse width="w-16" height="h-8" rounded="rounded-lg" />
                            <SkeletonPulse width="w-16" height="h-8" rounded="rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
            <span className="sr-only">Loading…</span>
        </div>
    )
}
