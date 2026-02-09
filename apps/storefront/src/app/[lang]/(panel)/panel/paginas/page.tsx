/**
 * CMS Pages Editor — Owner Panel
 *
 * Server component fetches pages + plan limits, delegates to PagesClient.
 */

import { getConfig, getRequiredTenantId } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { checkLimit } from '@/lib/limits'
import PagesClient from './PagesClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.pages.title') }
}

export default async function CMSPagesPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    await params
    const { planLimits } = await getConfig()

    const supabase = await createClient()
    const { data: pages } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('tenant_id', getRequiredTenantId())
        .order('created_at', { ascending: false })

    const pageList = (pages ?? []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        slug: p.slug as string,
        title: p.title as string,
        body: p.body as string,
        published: p.published as boolean,
    }))
    const limitCheck = checkLimit(planLimits, 'max_cms_pages', pageList.length)

    return (
        <div className="space-y-6">
            <PagesClient
                pages={pageList}
                canAdd={limitCheck.allowed}
                pageCount={pageList.length}
                maxPages={planLimits.max_cms_pages}
            />
        </div>
    )
}
