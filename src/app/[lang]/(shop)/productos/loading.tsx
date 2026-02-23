import { ProductGridSkeleton } from '@/components/ui/Skeleton'

export default function ProductsLoading() {
    return (
        <div className="container-page py-8">
            <div className="skeleton h-10 w-48 mb-8" />
            <ProductGridSkeleton count={12} />
        </div>
    )
}
