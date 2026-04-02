/**
 * CRM Dashboard — Owner Panel
 *
 * Displays customer segments, quick stats, and CRM actions.
 * Gated by enable_crm feature flag (module: CRM).
 * Data from Medusa customers + Supabase analytics.
 * Tenant-scoped: all Medusa queries are scoped to the authenticated tenant.
 *
 * B4 fix: migrated from getConfig() to withPanelGuard() for proper auth.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminCustomers } from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { withPanelGuard } from '@/lib/panel-guard'
import FeatureGate from '@/components/ui/FeatureGate'
import PanelPageHeader from '@/components/panel/PanelPageHeader'
import { Users } from 'lucide-react'
import CRMClient from './CRMClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    return { title: t('panel.crm.title') }
}

export default async function CRMPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { tenantId, appConfig } = await withPanelGuard()
    const { featureFlags, planLimits, config } = appConfig
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    if (!featureFlags.enable_crm) {
        return <FeatureGate flag="enable_crm" lang={lang} />
    }

    // Resolve tenant scope — all admin queries MUST be scoped
    const scope = await getTenantMedusaScope(tenantId)

    // Fetch total customers for quick stat
    const { customers, count } = await getAdminCustomers({ limit: 10, offset: 0 }, scope)

    // Build segments from customer data
    const segments = {
        total: count,
        withOrders: customers.filter(c => c.orders && c.orders.length > 0).length,
        recent: customers.filter(c => {
            if (!c.created_at) return false
            // eslint-disable-next-line react-hooks/purity
            const days30Ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            return new Date(c.created_at) > days30Ago
        }).length,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cfgAny = config as unknown as Record<string, unknown>

    return (
        <div className="space-y-6">
            <PanelPageHeader
                title={t('panel.crm.title')}
                subtitle={t('panel.crm.subtitle')}
                icon={<Users className="w-5 h-5" />}
                badge={count}
            />
            <CRMClient
                segments={segments}
                totalCustomers={count}
                maxContacts={planLimits.max_crm_contacts}
                enableSegmentation={featureFlags.enable_crm_segmentation}
                enableExport={featureFlags.enable_crm_export}
                crmConfig={{
                    crm_auto_tag_customers: cfgAny.crm_auto_tag_customers ?? false,
                    crm_new_customer_tag: cfgAny.crm_new_customer_tag ?? '',
                    crm_notify_new_contact: cfgAny.crm_notify_new_contact ?? false,
                    crm_export_format: cfgAny.crm_export_format ?? 'csv',
                }}
                customers={customers.map(c => ({
                    id: c.id,
                    email: c.email,
                    firstName: c.first_name ?? '',
                    lastName: c.last_name ?? '',
                    orderCount: c.orders?.length ?? 0,
                    createdAt: c.created_at,
                }))}
                lang={lang}
                labels={{
                    title: t('panel.crm.title'),
                    subtitle: t('panel.crm.subtitle'),
                    totalContacts: t('panel.crm.totalContacts'),
                    withOrders: t('panel.crm.withOrders'),
                    newLast30d: t('panel.crm.newLast30d'),
                    usageOf: t('panel.crm.usageOf'),
                    segmentation: t('panel.crm.segmentation'),
                    segmentationDesc: t('panel.crm.segmentationDesc'),
                    exportContacts: t('panel.crm.exportContacts'),
                    exportDesc: t('panel.crm.exportDesc'),
                    comingSoon: t('panel.crm.comingSoon'),
                    noData: t('panel.crm.noData'),
                    contactHeader: t('panel.crm.contactHeader'),
                    emailHeader: t('panel.crm.emailHeader'),
                    ordersHeader: t('panel.crm.ordersHeader'),
                    joinedHeader: t('panel.crm.joinedHeader'),
                    searchPlaceholder: t('panel.crm.searchPlaceholder'),
                    downloading: t('panel.crm.downloading'),
                    exportSuccess: t('panel.crm.exportSuccess'),
                    allContacts: t('panel.crm.allContacts'),
                }}
            />
        </div>
    )
}
