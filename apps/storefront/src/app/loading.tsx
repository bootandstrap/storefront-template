import { HeroSkeleton, ProductGridSkeleton, CategoryGridSkeleton } from '@/components/ui/Skeleton'

export default function RootLoading() {
    return (
        <div className="container-page py-6 space-y-12">
            <HeroSkeleton />
            <CategoryGridSkeleton />
            <ProductGridSkeleton />
        </div>
    )
}
