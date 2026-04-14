// ---------------------------------------------------------------------------
// Panel loading skeleton — SOTA 2026 Revamp
// Features:
// - Brand-colored progress bar at top
// - Staggered skeleton cards with brand-tinted shimmer
// - Content-aware shimmer matching different page types
// ---------------------------------------------------------------------------

import { SkeletonPulse } from '@/components/panel/PanelAnimations'

export default function PanelLoading() {
    return (
        <>
            {/* Top loading bar */}
            <div className="loading-bar-top" />

            <div className="space-y-6 panel-page-enter" role="status" aria-label="Loading panel content">
                {/* Header skeleton */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <SkeletonPulse width="w-10" height="h-10" rounded="rounded-xl" />
                        <div className="space-y-2">
                            <SkeletonPulse width="w-48" height="h-7" rounded="rounded-lg" />
                            <SkeletonPulse width="w-64" height="h-4" rounded="rounded-md" />
                        </div>
                    </div>
                    <SkeletonPulse width="w-32" height="h-10" rounded="rounded-xl" />
                </div>

                {/* Tab bar skeleton */}
                <div className="flex gap-2 p-1.5 rounded-2xl bg-sf-1/50 border border-sf-3/30 w-fit">
                    <SkeletonPulse width="w-24" height="h-9" rounded="rounded-xl" />
                    <SkeletonPulse width="w-20" height="h-9" rounded="rounded-xl" />
                    <SkeletonPulse width="w-28" height="h-9" rounded="rounded-xl" />
                </div>

                {/* Content cards skeleton — staggered */}
                <div className="glass rounded-2xl p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bento-stagger">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-sf-2/50 bg-sf-0/30 p-4 space-y-3"
                            >
                                <div className="flex items-center gap-3">
                                    <SkeletonPulse width="w-10" height="h-10" rounded="rounded-xl" />
                                    <div className="flex-1 space-y-1.5">
                                        <SkeletonPulse width="w-3/4" height="h-4" />
                                        <SkeletonPulse width="w-1/2" height="h-3" />
                                    </div>
                                </div>
                                <SkeletonPulse height="h-4" />
                                <div className="flex gap-2 pt-2">
                                    <SkeletonPulse width="w-16" height="h-8" rounded="rounded-lg" />
                                    <SkeletonPulse width="w-16" height="h-8" rounded="rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <span className="sr-only">Loading…</span>
            </div>
        </>
    )
}
