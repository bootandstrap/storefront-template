import { Skeleton } from '@/components/ui/Skeleton'

export default function CarritoLoading() {
    return (
        <div className="container-page py-8">
            <div className="flex items-center gap-3 mb-8">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="h-8 w-40" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-64 rounded-2xl" />
            </div>
        </div>
    )
}
