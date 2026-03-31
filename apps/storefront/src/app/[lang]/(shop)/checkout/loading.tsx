export default function CheckoutLoading() {
    return (
        <div className="container-page py-12 animate-pulse">
            <div className="max-w-4xl mx-auto">
                {/* Title */}
                <div className="h-8 w-56 bg-sf-2 rounded-lg mb-8" />

                <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-8">
                    {/* Form skeleton */}
                    <div className="space-y-6">
                        <div className="glass rounded-2xl p-6 space-y-4">
                            <div className="h-5 w-32 bg-sf-2 rounded" />
                            <div className="h-10 w-full bg-sf-2 rounded-xl" />
                            <div className="h-10 w-full bg-sf-2 rounded-xl" />
                            <div className="h-10 w-full bg-sf-2 rounded-xl" />
                        </div>
                    </div>

                    {/* Summary skeleton */}
                    <div className="glass rounded-2xl p-6 space-y-4">
                        <div className="h-5 w-40 bg-sf-2 rounded" />
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-sf-2 rounded-lg" />
                                <div className="flex-1 space-y-1">
                                    <div className="h-3 w-24 bg-sf-2 rounded" />
                                    <div className="h-3 w-16 bg-sf-2 rounded" />
                                </div>
                            </div>
                        ))}
                        <div className="border-t border-sf-3 pt-4 space-y-2">
                            <div className="h-4 w-full bg-sf-2 rounded" />
                            <div className="h-6 w-24 bg-sf-2 rounded ml-auto" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
