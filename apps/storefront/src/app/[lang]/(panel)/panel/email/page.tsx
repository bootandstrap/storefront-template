/**
 * Email Marketing — Owner Panel Page (Server Component)
 *
 * Feature-gated: requires enable_email_notifications flag.
 * Loads automation config, email stats, and flags for the tenant.
 *
 * Zone: 🟡 EXTEND — new panel page, uses locked auth/config APIs
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getConfigForTenant } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Mail } from 'lucide-react'
import EmailClient from './EmailClient'
import { DEFAULT_AUTOMATION_CONFIG, type AutomationConfig } from '@/lib/email-automations-shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveAutomationConfig } from './actions'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.email.title') }
}

/**
 * Loads automation config from email_automation_config table.
 * Falls back to defaults if row doesn't exist (shouldn't happen — auto-created by trigger).
 */
async function loadAutomationConfig(tenantId: string): Promise<AutomationConfig> {
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    const { data, error } = await (supabase as any)
        .from('email_automation_config')
        .select('abandoned_cart_enabled, abandoned_cart_delay_hours, review_request_enabled, review_request_delay_days')
        .eq('tenant_id', tenantId)
        .maybeSingle()

    if (error || !data) {
        console.warn(`[email] Could not load automation config for tenant ${tenantId}: ${error?.message ?? 'no row'}`)
        return DEFAULT_AUTOMATION_CONFIG
    }

    return {
        abandoned_cart_enabled: data.abandoned_cart_enabled ?? false,
        abandoned_cart_delay_hours: data.abandoned_cart_delay_hours ?? 3,
        review_request_enabled: data.review_request_enabled ?? false,
        review_request_delay_days: data.review_request_delay_days ?? 7,
    }
}

/**
 * Loads email stats from email_log table for the current month.
 * Returns sent count, open rate, and bounce rate.
 */
async function loadEmailStats(tenantId: string): Promise<{
    sent_this_month: number
    open_rate: number
    bounce_rate: number
}> {
    const supabase = createAdminClient()

    // Count emails sent this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    const { count: sentCount } = await (supabase as any)
        .from('email_log')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('sent_at', startOfMonth.toISOString())

    // Count opens and bounces for rate calculation
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

export default async function EmailMarketingPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId } = await withPanelGuard()

    const { featureFlags, planLimits, config: storeConfig } = await getConfigForTenant(tenantId)

    // Detect email provider configuration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- config row has dynamic keys
    const cfgAny = storeConfig as unknown as Record<string, unknown>
    const hasProvider = !!cfgAny.email_provider && !!cfgAny.email_api_key

    // Gate: show upsell if base email flag not enabled
    if (!isFeatureEnabled(featureFlags, 'enable_email_notifications')) {
        return <FeatureGate flag="enable_email_notifications" lang={lang} />
    }

    // Check individual tier flags
    const abandonedCartFlag = isFeatureEnabled(featureFlags, 'enable_abandoned_cart_emails')
    const campaignsFlag = isFeatureEnabled(featureFlags, 'enable_email_campaigns')
    const templatesFlag = isFeatureEnabled(featureFlags, 'enable_email_templates')

    // Load real data from DB (concurrent)
    const [automationConfig, emailStats] = await Promise.all([
        loadAutomationConfig(tenantId),
        loadEmailStats(tenantId),
    ])

    const monthlyLimit = 'max_email_sends_month' in planLimits
        ? (planLimits as unknown as Record<string, number>).max_email_sends_month
        : 500

    const stats = {
        ...emailStats,
        monthly_limit: monthlyLimit,
    }

    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const labels = {
        title: t('panel.email.title'),
        subtitle: t('panel.email.subtitle'),
        dashboard: t('panel.email.dashboard'),
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
        <div className="space-y-6">
            <PanelPageHeader
                title={labels.title}
                subtitle={labels.subtitle}
                icon={<Mail className="w-5 h-5" />}
            />
            <EmailClient
                config={automationConfig}
                stats={stats}
                flags={{
                    enable_email_notifications: true, // already checked above
                    enable_abandoned_cart_emails: abandonedCartFlag,
                    enable_email_campaigns: campaignsFlag,
                    enable_email_templates: templatesFlag,
                }}
                hasProvider={hasProvider}
                labels={labels}
                saveAction={saveAutomationConfig}
                emailSenderConfig={{
                    email_sender_name: cfgAny.email_sender_name ?? '',
                    email_reply_to: cfgAny.email_reply_to ?? '',
                    email_footer_text: cfgAny.email_footer_text ?? '',
                }}
            />
        </div>
    )
}
