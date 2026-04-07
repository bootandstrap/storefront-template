// ---------------------------------------------------------------------------
// Panel / Pedidos loading skeleton
// Mimics the header, tabs, and list structure of OrdersClient
// ---------------------------------------------------------------------------

import { SkeletonPulse } from '@/components/panel/PanelAnimations'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { ShoppingBag } from 'lucide-react'

export default function PedidosLoading() {
    return (
        <div className="space-y-6" role="status" aria-label="Loading orders">
            {/* Standard Header (with a standard dictionary translation if possible, or visually generic) */}
            <PanelPageHeader
                title="Pedidos"
                subtitle="Cargando información..."
                icon={<ShoppingBag className="w-5 h-5" />}
            />

            {/* KPI Metrics Mock */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-4">
                    <div className="relative overflow-hidden rounded-[20px] p-5 shadow-sm border border-sf-3/30 bg-sf-0/50 backdrop-blur-xl space-y-2">
                        <SkeletonPulse width="w-24" height="h-3" />
                        <SkeletonPulse width="w-32" height="h-8" />
                    </div>
                </div>
                <div className="col-span-12 sm:col-span-4">
                    <div className="relative overflow-hidden rounded-[20px] p-5 shadow-sm border border-sf-3/30 bg-sf-0/50 backdrop-blur-xl space-y-2">
                        <SkeletonPulse width="w-24" height="h-3" />
                        <SkeletonPulse width="w-20" height="h-8" />
                    </div>
                </div>
                <div className="col-span-12 sm:col-span-4">
                    <div className="relative overflow-hidden rounded-[20px] p-5 shadow-sm border border-sf-3/30 bg-sf-0/50 backdrop-blur-xl space-y-2">
                        <SkeletonPulse width="w-24" height="h-3" />
                        <SkeletonPulse width="w-20" height="h-8" />
                    </div>
                </div>
            </div>

            {/* List and Tabs skeleton */}
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 space-y-4">
                    {/* Tabs / Filters mock */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="flex gap-2">
                            <SkeletonPulse width="w-16" height="h-10" rounded="rounded-xl" />
                            <SkeletonPulse width="w-20" height="h-10" rounded="rounded-xl" />
                            <SkeletonPulse width="w-24" height="h-10" rounded="rounded-xl" />
                        </div>
                        <SkeletonPulse width="w-full sm:w-64" height="h-10" rounded="rounded-xl" />
                    </div>

                    {/* Order Rows */}
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="relative overflow-hidden rounded-[20px] min-h-[56px] p-4 shadow-sm border border-sf-3/30 bg-sf-0/50 backdrop-blur-xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <SkeletonPulse width="w-16" height="h-4" rounded="rounded-md" />
                                    <SkeletonPulse width="w-14" height="h-5" rounded="rounded-full" />
                                    <SkeletonPulse width="w-24" height="h-4" />
                                    <SkeletonPulse width="w-28" height="h-3" className="hidden sm:block" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <SkeletonPulse width="w-16" height="h-4" rounded="rounded-md" />
                                    <SkeletonPulse width="w-20" height="h-6" rounded="rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
