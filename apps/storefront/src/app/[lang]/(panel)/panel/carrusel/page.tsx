/**
 * Carousel Manager — Owner Panel
 *
 * Server component fetches slides + plan limits, delegates to CarouselClient.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { checkLimit } from '@/lib/limits'
import FeatureGate from '@/components/ui/FeatureGate'
import CarouselClient from './CarouselClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.carousel.title') }
}

export default async function CarouselManagerPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId, appConfig } = await withPanelGuard()
    const { planLimits, featureFlags } = appConfig

    if (!featureFlags.enable_carousel) {
        return <FeatureGate flag="enable_carousel" lang={lang} />
    }

    const supabase = await createClient()
    const { data: slides } = await supabase
        .from('carousel_slides')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true })

    const slideList = slides ?? []
    const limitCheck = checkLimit(planLimits, 'max_carousel_slides', slideList.length)

    return (
        <div className="space-y-6">
            <CarouselClient
                slides={slideList}
                canAdd={limitCheck.allowed}
                slideCount={slideList.length}
                maxSlides={planLimits.max_carousel_slides}
            />
        </div>
    )
}
