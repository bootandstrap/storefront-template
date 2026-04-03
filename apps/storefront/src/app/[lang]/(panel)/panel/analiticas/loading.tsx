
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsLoading() {
    return (
        <div className="space-y-6 max-w-4xl animate-pulse">
            {/* ── Header ── */}
            <PanelPageHeader
                title="Cargando analíticas..."
                subtitle="Calculando métricas de rendimiento y conversión"
                icon={<BarChart3 className="w-5 h-5 text-sf-3" />}
            />

            {/* ── Summary Stats Skeletons ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm p-5 rounded-2xl h-32 flex flex-col justify-between">
                        <div className="flex justify-between">
                            <div className="space-y-2">
                                <div className="h-4 w-24 bg-sf-3 rounded" />
                                <div className="h-8 w-16 bg-sf-4 rounded" />
                            </div>
                            <div className="w-10 h-10 bg-sf-3 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Conversion Funnel Skeleton ── */}
            <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-6">
                <div className="h-5 w-48 bg-sf-3 rounded mb-8" />

                <div className="space-y-8">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-sf-3 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between">
                                    <div className="h-4 w-32 bg-sf-3 rounded" />
                                    <div className="h-4 w-12 bg-sf-3 rounded" />
                                </div>
                                <div className="h-2 w-full bg-sf-2 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-5 border-t border-sf-2 flex justify-between">
                    <div className="h-3 w-32 bg-sf-2 rounded" />
                    <div className="h-3 w-40 bg-sf-2 rounded" />
                </div>
            </div>
        </div>
    )
}
