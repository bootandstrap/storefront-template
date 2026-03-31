// ---------------------------------------------------------------------------
// Skeleton primitives with CSS shimmer animation
// Uses the `skeleton` CSS class from globals.css (shimmer @keyframes)
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
// Composite skeletons — staggered entrance for premium feel
// ---------------------------------------------------------------------------

export function ProductCardSkeleton({ index = 0 }: { index?: number }) {
    return (
        <div
            className={`product-card p-0 animate-slide-up-stagger stagger-${Math.min(index + 1, 8)}`}
        >
            <SkeletonImage />
            <div className="p-4 space-y-2.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-3/4" />
                <div className="flex items-baseline gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-14 opacity-50" />
                </div>
            </div>
        </div>
    )
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} index={i} />
            ))}
        </div>
    )
}

export function CategoryGridSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={`flex flex-col items-center gap-2 animate-slide-up-stagger stagger-${Math.min(i + 1, 8)}`}
                >
                    <Skeleton className="w-20 h-20 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                </div>
            ))}
        </div>
    )
}

export function HeroSkeleton() {
    return (
        <div className="skeleton w-full h-[420px] md:h-[520px] rounded-2xl animate-fade-in" />
    )
}

export function ProductDetailSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
            {/* Image gallery */}
            <div className="space-y-3">
                <SkeletonImage className="rounded-xl" />
                <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="w-16 h-16 rounded-lg flex-shrink-0" />
                    ))}
                </div>
            </div>
            {/* Details */}
            <div className="space-y-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-7 w-28" />
                <SkeletonText lines={4} />
                <div className="pt-4 space-y-3">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}

export function CartItemSkeleton() {
    return (
        <div className="flex gap-4 animate-fade-in">
            <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
            </div>
        </div>
    )
}
