/**
 * WhatsApp Templates — Owner Panel
 *
 * Server component fetches templates + plan limits, delegates to MessagesClient.
 */

import { getConfig, getRequiredTenantId } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { checkLimit } from '@/lib/limits'
import FeatureGate from '@/components/ui/FeatureGate'
import MessagesClient from './MessagesClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.messages.title') }
}

export default async function WhatsAppTemplatesPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { planLimits, featureFlags } = await getConfig()

    if (!featureFlags.enable_whatsapp_checkout) {
        return <FeatureGate flag="enable_whatsapp_checkout" lang={lang} />
    }

    const supabase = await createClient()
    const { data: templates } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('tenant_id', getRequiredTenantId())
        .order('created_at', { ascending: false })

    const templateList = (templates ?? []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        name: t.name as string,
        template: t.template as string,
        is_default: t.is_default as boolean,
        variables: (t.variables as string[]) ?? [],
    }))
    const limitCheck = checkLimit(planLimits, 'max_whatsapp_templates', templateList.length)

    return (
        <div className="space-y-6">
            <MessagesClient
                templates={templateList}
                canAdd={limitCheck.allowed}
                templateCount={templateList.length}
                maxTemplates={planLimits.max_whatsapp_templates}
            />
        </div>
    )
}
