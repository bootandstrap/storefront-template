/**
 * WhatsApp Templates — Owner Panel
 *
 * Server component fetches templates + plan limits, delegates to MessagesClient.
 * SOTA 2026: ModuleShell wrapper with usage meter.
 */

import { withPanelGuard } from '@/lib/panel-guard'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { checkLimit } from '@/lib/limits'
import ModuleShell from '@/components/panel/ModuleShell'
import { MessageSquare } from 'lucide-react'
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
    const { tenantId, appConfig } = await withPanelGuard()
    const { planLimits, featureFlags } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const isLocked = !featureFlags.enable_whatsapp_checkout
    const maxTemplates = planLimits.max_whatsapp_templates ?? 5

    const tierInfo = {
        currentTier: isLocked ? 'Free' : 'Activo',
        moduleKey: 'automation',
        nextTierFeatures: isLocked ? [
            t('panel.messages.feat.templates') || 'Plantillas WhatsApp personalizadas',
            t('panel.messages.feat.variables') || 'Variables dinámicas (nombre, pedido)',
            t('panel.messages.feat.auto') || 'Envío automatizado en checkout',
        ] : undefined,
        nextTierName: isLocked ? 'Automation Básico' : undefined,
        nextTierPrice: isLocked ? 20 : undefined,
    }

    let templateList: { id: string; name: string; template: string; is_default: boolean; variables: string[] }[] = []
    let limitCheck = { allowed: false }

    if (!isLocked) {
        const supabase = await createClient()
        const { data: templates } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })

        templateList = (templates ?? []).map((tpl: Record<string, unknown>) => ({
            id: tpl.id as string,
            name: tpl.name as string,
            template: tpl.template as string,
            is_default: tpl.is_default as boolean,
            variables: (tpl.variables as string[]) ?? [],
        }))
        limitCheck = checkLimit(planLimits, 'max_whatsapp_templates', templateList.length)
    }

    return (
        <ModuleShell
            icon={<MessageSquare className="w-5 h-5" />}
            title={t('panel.messages.title') || 'Plantillas WhatsApp'}
            subtitle={t('panel.messages.subtitle') || 'Gestiona tus mensajes automáticos de WhatsApp'}
            isLocked={isLocked}
            gateFlag="enable_whatsapp_checkout"
            tierInfo={tierInfo}
            usageMeter={!isLocked ? {
                current: templateList.length,
                max: maxTemplates,
                label: t('panel.messages.templates') || 'plantillas',
            } : undefined}
            lang={lang}
        >
            <MessagesClient
                templates={templateList}
                canAdd={limitCheck.allowed}
                templateCount={templateList.length}
                maxTemplates={maxTemplates}
            />
        </ModuleShell>
    )
}
