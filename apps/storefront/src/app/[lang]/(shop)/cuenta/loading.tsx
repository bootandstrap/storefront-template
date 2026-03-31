export default function AccountLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Title skeleton */}
            <div className="h-8 w-48 bg-sf-2 rounded-lg" />

            {/* Content skeleton */}
            <div className="glass rounded-2xl p-6 space-y-4">
                <div className="h-4 w-32 bg-sf-2 rounded" />
                <div className="h-10 w-full bg-sf-2 rounded-xl" />
                <div className="h-4 w-24 bg-sf-2 rounded" />
                <div className="h-10 w-full bg-sf-2 rounded-xl" />
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass rounded-xl p-4 space-y-2">
                        <div className="h-3 w-20 bg-sf-2 rounded" />
                        <div className="h-6 w-12 bg-sf-2 rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}
