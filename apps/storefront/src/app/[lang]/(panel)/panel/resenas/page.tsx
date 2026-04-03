/**
 * Reviews Moderation Page — Owner Panel
 *
 * Server component fetches all reviews via Medusa Admin API.
 * Gated by enable_reviews feature flag via withPanelGuard.
 * Tenant-scoped: all queries go through getTenantMedusaScope.
 */

import { Suspense } from 'react'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { isFeatureEnabled } from '@/lib/features'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Star } from 'lucide-react'
import ReviewsClient from './ReviewsClient'
import { getReviews } from './actions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.nav.reviews') }
}

// ─── Reviews content (Suspense-wrapped) ──────────────────────
async function ReviewsContent({ lang }: { lang: string }) {
    const dictionary = await getDictionary(lang as Locale)
    const { reviews, stats } = await getReviews()

    return (
        <ReviewsClient
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialReviews={reviews as any}
            initialStats={stats}
            dictionary={dictionary}
            lang={lang}
        />
    )
}

// ─── Loading skeleton ─────────────────────────────────────────
function ReviewsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="h-7 w-40 bg-text-muted/10 rounded animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-xl p-4 animate-pulse">
                        <div className="h-8 w-12 bg-text-muted/10 rounded mb-1" />
                        <div className="h-3 w-16 bg-text-muted/10 rounded" />
                    </div>
                ))}
            </div>
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-xl p-4 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-24 bg-text-muted/10 rounded" />
                            <div className="h-4 w-20 bg-text-muted/10 rounded" />
                            <div className="h-5 w-16 bg-text-muted/10 rounded-full" />
                        </div>
                        <div className="h-3 w-3/4 bg-text-muted/10 rounded mt-3" />
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────
export default async function ReviewsPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { appConfig } = await withPanelGuard()
    const { featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!isFeatureEnabled(featureFlags, 'enable_reviews')) {
        return <FeatureGate flag="enable_reviews" lang={lang} />
    }

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.nav.reviews') || 'Rese\u00f1as'}
                subtitle={t('panel.reviews.subtitle') || 'Modera las rese\u00f1as de tus productos'}
                icon={<Star className="w-5 h-5" />}
            />
            <Suspense fallback={<ReviewsSkeleton />}>
                <ReviewsContent lang={lang} />
            </Suspense>
        </div>
    )
}
