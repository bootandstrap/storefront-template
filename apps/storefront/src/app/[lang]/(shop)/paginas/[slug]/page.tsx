import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import CMSPageRenderer from '@/components/cms/CMSPageRenderer'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ lang: string; slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug, lang } = await params
    const supabase = await createClient()
    const { data: page } = await supabase
        .from('cms_pages')
        .select('title, body')
        .eq('slug', slug)
        .eq('published', true)
        .single()

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

    const supabase = await createClient()
    const { data: page } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single()

    if (!page) notFound()

    return <CMSPageRenderer title={page.title} body={page.body} config={config} />
}
