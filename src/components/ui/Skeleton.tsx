// ---------------------------------------------------------------------------
// Skeleton primitives with CSS shimmer animation
// ---------------------------------------------------------------------------

export function Skeleton({
    className = '',
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`skeleton ${className}`} {...props} />
}

export function SkeletonText({
    lines = 3,
    className = '',
}: {
    lines?: number
    className?: string
}) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton h-4"
                    style={{ width: i === lines - 1 ? '60%' : '100%' }}
                />
            ))}
        </div>
    )
}

export function SkeletonImage({ className = '' }: { className?: string }) {
    return <div className={`skeleton aspect-square w-full ${className}`} />
}

// ---------------------------------------------------------------------------
// Composite skeletons
// ---------------------------------------------------------------------------

export function ProductCardSkeleton() {
    return (
        <div className="product-card p-0">
            <SkeletonImage />
            <div className="p-4 space-y-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-6 w-20" />
            </div>
        </div>
    )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </div>
    )
}

export function CategoryGridSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                    <Skeleton className="w-20 h-20 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                </div>
            ))}
        </div>
    )
}

export function HeroSkeleton() {
    return (
        <div className="skeleton w-full h-[400px] md:h-[500px] rounded-2xl" />
    )
}
