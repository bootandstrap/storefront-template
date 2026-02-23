import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConfig, getRequiredTenantId } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import CMSPageRenderer from '@/components/cms/CMSPageRenderer'

export const dynamic = 'force-dynamic'

/** Shape of a CMS page row from Supabase */
interface CMSPageRow {
    title: string
    body: string
    slug: string
    published: boolean
    tenant_id: string
}

interface PageProps {
    params: Promise<{ lang: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, lang } = await params
    const tenantId = getRequiredTenantId()

    // Use admin client (service-role) — bypasses RLS.
    // Safe because we enforce: published=true + tenant_id scope.
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('cms_pages')
        .select('title, body')
        .eq('tenant_id', tenantId)
        .eq('slug', slug)
        .eq('published', true)
        .single()

    const page = data as CMSPageRow | null

    if (!page) {
        const dictionary = await getDictionary(lang as Locale)
        const t = createTranslator(dictionary)
        return { title: t('common.pageNotFound') }
    }

    return {
        title: page.title,
        description: page.body?.substring(0, 160).replace(/<[^>]*>/g, '') || undefined,
    }
}

export default async function CMSPage({ params }: PageProps) {
    const { slug } = await params
    const { featureFlags, config } = await getConfig()

    // Gate behind feature flag
    if (!isFeatureEnabled(featureFlags, 'enable_cms_pages')) {
        notFound()
    }

    const tenantId = getRequiredTenantId()

    // Use admin client (service-role) — bypasses RLS.
    // Safe because we enforce: published=true + tenant_id scope.
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('slug', slug)
        .eq('published', true)
        .single()

    const page = data as CMSPageRow | null

    if (!page) notFound()

    return <CMSPageRenderer title={page.title} body={page.body} config={config} />
}
