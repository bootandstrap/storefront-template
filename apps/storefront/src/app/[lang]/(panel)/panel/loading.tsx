// ---------------------------------------------------------------------------
// Panel loading skeleton — shown while any panel page is loading
// ---------------------------------------------------------------------------

import { Skeleton } from '@/components/ui/Skeleton'

export default function PanelLoading() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32 rounded-xl" />
            </div>

            {/* Search / filter bar skeleton */}
            <div className="flex gap-3">
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
            </div>

            {/* Content cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-surface-2 p-4 space-y-3"
                    >
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex gap-2 pt-2">
                            <Skeleton className="h-8 w-16 rounded-lg" />
                            <Skeleton className="h-8 w-16 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
