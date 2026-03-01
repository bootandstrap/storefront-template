'use client'

interface CRMSegments {
    total: number
    withOrders: number
    recent: number
}

interface Labels {
    title: string
    subtitle: string
    totalContacts: string
    withOrders: string
    newLast30d: string
    usageOf: string
    segmentation: string
    segmentationDesc: string
    exportContacts: string
    exportDesc: string
    comingSoon: string
    noData: string
}

interface Props {
    segments: CRMSegments
    totalCustomers: number
    maxContacts: number
    enableSegmentation: boolean
    enableExport: boolean
    lang: string
    labels: Labels
}

export default function CRMClient({
    segments,
    totalCustomers,
    maxContacts,
    enableSegmentation,
    enableExport,
    labels,
}: Props) {
    const usagePercent = maxContacts > 0 ? Math.min((totalCustomers / maxContacts) * 100, 100) : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {labels.title}
                </h1>
                <p className="text-text-muted mt-1">{labels.subtitle}</p>
            </div>

            {/* Stats overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold font-display text-text-primary">
                        {segments.total}
                    </p>
                    <p className="text-sm text-text-muted mt-1">{labels.totalContacts}</p>
                </div>
                <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold font-display text-text-primary">
                        {segments.withOrders}
                    </p>
                    <p className="text-sm text-text-muted mt-1">{labels.withOrders}</p>
                </div>
                <div className="glass rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold font-display text-text-primary">
                        {segments.recent}
                    </p>
                    <p className="text-sm text-text-muted mt-1">{labels.newLast30d}</p>
                </div>
            </div>

            {/* Plan usage */}
            {maxContacts > 0 && (
                <div className="glass rounded-2xl p-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-text-secondary font-medium">
                            {labels.usageOf}
                        </span>
                        <span className="text-text-muted">
                            {totalCustomers} / {maxContacts}
                        </span>
                    </div>
                    <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${usagePercent > 90 ? 'bg-red-500' :
                                    usagePercent > 70 ? 'bg-amber-500' : 'bg-primary'
                                }`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* CRM Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Segmentation */}
                <div className={`glass rounded-2xl p-6 ${!enableSegmentation ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">🏷️</span>
                        <h3 className="text-lg font-bold font-display text-text-primary">
                            {labels.segmentation}
                        </h3>
                    </div>
                    <p className="text-sm text-text-muted mb-4">{labels.segmentationDesc}</p>
                    {enableSegmentation ? (
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                            {labels.comingSoon}
                        </span>
                    ) : (
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-surface-2 text-text-muted">
                            🔒 {labels.comingSoon}
                        </span>
                    )}
                </div>

                {/* Export */}
                <div className={`glass rounded-2xl p-6 ${!enableExport ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">📤</span>
                        <h3 className="text-lg font-bold font-display text-text-primary">
                            {labels.exportContacts}
                        </h3>
                    </div>
                    <p className="text-sm text-text-muted mb-4">{labels.exportDesc}</p>
                    {enableExport ? (
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                            {labels.comingSoon}
                        </span>
                    ) : (
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-surface-2 text-text-muted">
                            🔒 {labels.comingSoon}
                        </span>
                    )}
                </div>
            </div>

            {/* Empty state */}
            {segments.total === 0 && (
                <div className="glass rounded-2xl p-12 text-center">
                    <span className="text-5xl mb-4 block">📁</span>
                    <p className="text-text-muted text-lg">{labels.noData}</p>
                </div>
            )}
        </div>
    )
}
