/**
 * Email Marketing — Owner Panel Page (Server Component)
 *
 * Feature-gated: requires enable_email_notifications flag.
 * Loads automation config, email stats, and flags for the tenant.
 *
 * Zone: 🟡 EXTEND — new panel page, uses locked auth/config APIs
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { requirePanelAuth } from '@/lib/panel-auth'
import { getConfigForTenant } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'
import { redirect } from 'next/navigation'
import EmailClient from './EmailClient'
import { DEFAULT_AUTOMATION_CONFIG, type AutomationConfig } from '@/lib/email-automations'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.email.title') }
}

export default async function EmailMarketingPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId } = await requirePanelAuth()

    const { featureFlags, planLimits } = await getConfigForTenant(tenantId)

    // Gate: redirect if base email flag not enabled
    if (!isFeatureEnabled(featureFlags, 'enable_email_notifications')) {
        redirect(`/${lang}/panel`)
    }

    // Check individual tier flags
    const abandonedCartFlag = isFeatureEnabled(featureFlags, 'enable_abandoned_cart_emails')
    const campaignsFlag = isFeatureEnabled(featureFlags, 'enable_email_campaigns')
    const templatesFlag = isFeatureEnabled(featureFlags, 'enable_email_templates')

    // TODO: Load from email_automation_config table when migration is applied
    const automationConfig: AutomationConfig = DEFAULT_AUTOMATION_CONFIG

    // TODO: Load from email_log table aggregation when migration is applied
    const monthlyLimit = 'max_email_sends_month' in planLimits
        ? (planLimits as unknown as Record<string, number>).max_email_sends_month
        : 500
    const stats = {
        sent_this_month: 0,
        monthly_limit: monthlyLimit,
        open_rate: 0,
        bounce_rate: 0,
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
    }

    // Server action for saving config
    async function saveAutomationConfig(config: AutomationConfig) {
        'use server'
        // TODO: Save to email_automation_config table when migration is applied
        console.log('[email] Save config for tenant', tenantId, config)
        return { success: true }
    }

    return (
        <div className="space-y-6">
            <EmailClient
                config={automationConfig}
                stats={stats}
                flags={{
                    enable_email_notifications: true, // already checked above
                    enable_abandoned_cart_emails: abandonedCartFlag,
                    enable_email_campaigns: campaignsFlag,
                    enable_email_templates: templatesFlag,
                }}
                labels={labels}
                saveAction={saveAutomationConfig}
            />
        </div>
    )
}
