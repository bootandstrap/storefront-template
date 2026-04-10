/**
 * Email Tab Content — Server component for the Ajustes hub email tab.
 *
 * This is a dedicated RSC that encapsulates all the email data fetching
 * logic from the original email/page.tsx, adapted for embedding as a tab.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfigForTenant } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { createAdminClient } from '@/lib/supabase/admin'
import FeatureGate from '@/components/ui/FeatureGate'
import EmailClient from '../email/EmailClient'
import { saveAutomationConfig } from '../email/actions'
import { DEFAULT_AUTOMATION_CONFIG, type AutomationConfig } from '@/lib/email-automations-shared'

async function loadAutomationConfig(tenantId: string): Promise<AutomationConfig> {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('email_automation_config')
        .select('abandoned_cart_enabled, abandoned_cart_delay_hours, review_request_enabled, review_request_delay_days')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error || !data) return DEFAULT_AUTOMATION_CONFIG
    return {
        abandoned_cart_enabled: data.abandoned_cart_enabled ?? false,
        abandoned_cart_delay_hours: data.abandoned_cart_delay_hours ?? 3,
        review_request_enabled: data.review_request_enabled ?? false,
        review_request_delay_days: data.review_request_delay_days ?? 7,
    }
}

async function loadEmailStats(tenantId: string) {
    const supabase = createAdminClient()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: sentCount } = await (supabase as any)
        .from('email_log')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('sent_at', startOfMonth.toISOString())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: openCount } = await (supabase as any)
        .from('email_log')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('sent_at', startOfMonth.toISOString())
        .eq('status', 'opened')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: bounceCount } = await (supabase as any)
        .from('email_log')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('sent_at', startOfMonth.toISOString())
        .eq('status', 'bounced')

    const sent = sentCount ?? 0
    return {
        sent_this_month: sent,
        open_rate: sent > 0 ? Math.round(((openCount ?? 0) / sent) * 100) : 0,
        bounce_rate: sent > 0 ? Math.round(((bounceCount ?? 0) / sent) * 100) : 0,
    }
}

export default async function EmailTabContent({
    lang,
    tenantId,
}: {
    lang: string
    tenantId: string
}) {
    const { featureFlags, planLimits, config: storeConfig } = await getConfigForTenant(tenantId)
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfgAny = storeConfig as unknown as Record<string, unknown>
    const hasProvider = !!cfgAny.email_provider && !!cfgAny.email_api_key

    if (!isFeatureEnabled(featureFlags, 'enable_email_notifications')) {
        return <FeatureGate flag="enable_email_notifications" lang={lang} />
    }

    const abandonedCartFlag = isFeatureEnabled(featureFlags, 'enable_abandoned_cart_emails')
    const campaignsFlag = isFeatureEnabled(featureFlags, 'enable_email_campaigns')
    const templatesFlag = isFeatureEnabled(featureFlags, 'enable_email_templates')

    const { getEmailLogs } = await import('@/lib/email-log')
    const [automationConfig, emailStats, emailLogsData] = await Promise.all([
        loadAutomationConfig(tenantId),
        loadEmailStats(tenantId),
        getEmailLogs(tenantId, { limit: 15, offset: 0, status: 'all', q: '' }),
    ])

    const monthlyLimit = 'max_email_sends_month' in planLimits
        ? (planLimits as unknown as Record<string, number>).max_email_sends_month
        : 500

    const labels = {
        title: t('panel.email.title'),
        subtitle: t('panel.email.subtitle'),
        dashboard: t('panel.email.dashboard'),
        logs: t('panel.email.logs') ?? 'Logs',
        automations: t('panel.email.automations'),
        templates: t('panel.email.templates'),
        campaigns: t('panel.email.campaigns'),
        sentThisMonth: t('panel.email.sentThisMonth'),
        openRate: t('panel.email.openRate'),
        bounceRate: t('panel.email.bounceRate'),
        abandonedCart: t('panel.email.abandonedCart'),
        abandonedCartDesc: t('panel.email.abandonedCartDesc'),
        reviewRequest: t('panel.email.reviewRequest'),
        reviewRequestDesc: t('panel.email.reviewRequestDesc'),
        delay: t('panel.email.delay'),
        enabled: t('common.enabled'),
        disabled: t('common.disabled'),
        save: t('common.save'),
        upgradeRequired: t('panel.email.upgradeRequired'),
        emailsRemaining: t('panel.email.emailsRemaining'),
        providerWarning: t('panel.email.providerWarning'),
        providerWarningAction: t('panel.email.providerWarningAction'),
        templatesPlaceholder: t('panel.email.templatesPlaceholder'),
        campaignsPlaceholder: t('panel.email.campaignsPlaceholder'),
    }

    return (
        <EmailClient
            config={automationConfig}
            stats={{ ...emailStats, monthly_limit: monthlyLimit }}
            flags={{
                enable_email_notifications: true,
                enable_abandoned_cart_emails: abandonedCartFlag,
                enable_email_campaigns: campaignsFlag,
                enable_email_templates: templatesFlag,
            }}
            hasProvider={hasProvider}
            labels={labels}
            saveAction={saveAutomationConfig}
            emailSenderConfig={{
                email_sender_name: (cfgAny.email_sender_name ?? '') as string,
                email_reply_to: (cfgAny.email_reply_to ?? '') as string,
                email_footer_text: (cfgAny.email_footer_text ?? '') as string,
            }}
            logsData={emailLogsData}
            queryParams={{
                currentPage: 1,
                pageSize: 15,
                status: 'all',
                search: '',
            }}
        />
    )
}
