/**
 * Email Tab Content — Server component for the Ajustes hub email tab.
 *
 * UPDATED: No longer gates the ENTIRE page behind enable_email_notifications.
 * Free tenants see the dashboard (100/mo) + essential toggles.
 * Gated features (automations, campaigns) show upsell inline.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfigForTenant } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { createAdminClient } from '@/lib/supabase/admin'
import EmailClient from '../email/EmailClient'
import { saveAutomationConfig, saveEmailPreferences } from '../email/actions'
import { DEFAULT_AUTOMATION_CONFIG, type AutomationConfig } from '@/lib/email-automations-shared'
import type { EmailPreferences } from '../email/actions'

// ---------------------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------------------

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

const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
    send_order_confirmation: true,
    send_payment_failed: true,
    send_order_shipped: true,
    send_order_delivered: true,
    send_order_cancelled: true,
    send_refund_processed: true,
    send_welcome: true,
    send_low_stock_alert: true,
    send_abandoned_cart: true,
    send_review_request: true,
    template_design: 'minimal',
}

async function loadEmailPreferences(tenantId: string): Promise<EmailPreferences> {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('email_preferences')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error || !data) return DEFAULT_EMAIL_PREFERENCES
    return {
        send_order_confirmation: data.send_order_confirmation ?? true,
        send_payment_failed: data.send_payment_failed ?? true,
        send_order_shipped: data.send_order_shipped ?? true,
        send_order_delivered: data.send_order_delivered ?? true,
        send_order_cancelled: data.send_order_cancelled ?? true,
        send_refund_processed: data.send_refund_processed ?? true,
        send_welcome: data.send_welcome ?? true,
        send_low_stock_alert: data.send_low_stock_alert ?? true,
        send_abandoned_cart: data.send_abandoned_cart ?? true,
        send_review_request: data.send_review_request ?? true,
        template_design: data.template_design ?? 'minimal',
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
        .in('status', ['opened', 'clicked'])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: bounceCount } = await (supabase as any)
        .from('email_log')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('sent_at', startOfMonth.toISOString())
        .eq('status', 'bounced')

    // Per-template breakdown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: breakdownData } = await (supabase as any)
        .from('email_log')
        .select('email_type')
        .eq('tenant_id', tenantId)
        .gte('sent_at', startOfMonth.toISOString())

    const breakdown: Record<string, number> = {}
    if (breakdownData) {
        for (const row of breakdownData as { email_type: string }[]) {
            breakdown[row.email_type] = (breakdown[row.email_type] || 0) + 1
        }
    }

    const sent = sentCount ?? 0
    return {
        sent_this_month: sent,
        open_rate: sent > 0 ? Math.round(((openCount ?? 0) / sent) * 100) : 0,
        bounce_rate: sent > 0 ? Math.round(((bounceCount ?? 0) / sent) * 100) : 0,
        breakdown,
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

    // NO hard gate — all tenants see the email dashboard
    const emailNotificationsFlag = isFeatureEnabled(featureFlags, 'enable_email_notifications')
    const abandonedCartFlag = isFeatureEnabled(featureFlags, 'enable_abandoned_cart_emails')
    const campaignsFlag = isFeatureEnabled(featureFlags, 'enable_email_campaigns')
    const templatesFlag = isFeatureEnabled(featureFlags, 'enable_email_templates')
    const segmentationFlag = isFeatureEnabled(featureFlags, 'enable_email_segmentation')

    const { getEmailLogs } = await import('@/lib/email-log')
    const [automationConfig, emailPreferences, emailStats, emailLogsData] = await Promise.all([
        loadAutomationConfig(tenantId),
        loadEmailPreferences(tenantId),
        loadEmailStats(tenantId),
        getEmailLogs(tenantId, { limit: 15, offset: 0, status: 'all', q: '' }),
    ])

    const monthlyLimit = 'max_email_sends_month' in planLimits
        ? (planLimits as unknown as Record<string, number>).max_email_sends_month
        : 0  // 0 = free tier (100/mo handled by governance engine)

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
                enable_email_notifications: emailNotificationsFlag,
                enable_abandoned_cart_emails: abandonedCartFlag,
                enable_email_campaigns: campaignsFlag,
                enable_email_templates: templatesFlag,
                enable_email_segmentation: segmentationFlag,
            }}
            hasProvider={hasProvider}
            labels={labels}
            saveAction={saveAutomationConfig}
            savePreferencesAction={saveEmailPreferences}
            emailPreferences={emailPreferences}
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
