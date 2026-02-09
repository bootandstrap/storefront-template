import { Skeleton } from '@/components/ui/Skeleton'

export default function ProductDetailLoading() {
    return (
        <div className="container-page py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <Skeleton className="aspect-square rounded-2xl" />
                <div className="space-y-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}
