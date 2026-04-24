/**
 * CRM Dashboard — Owner Panel
 *
 * Displays customer segments, quick stats, and CRM actions.
 * Gated by enable_crm feature flag (module: CRM).
 * Data from Medusa customers + Supabase analytics.
 * Tenant-scoped: all Medusa queries are scoped to the authenticated tenant.
 *
 * SOTA 2026: ModuleShell wrapper, no mock data, proper types.
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getAdminCustomers } from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import { withPanelGuard } from '@/lib/panel-guard'
import ModuleShell from '@/components/panel/ModuleShell'
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

    const isLocked = !featureFlags.enable_crm
    const maxContacts = planLimits.max_crm_contacts ?? 200

    // Resolve tier info
    const tierInfo = {
        currentTier: featureFlags.enable_crm_segmentation ? 'Pro' : featureFlags.enable_crm ? 'Básico' : 'Free',
        moduleKey: 'crm',
        nextTierFeatures: isLocked ? [
            t('panel.crm.feat.contacts') || 'Lista de contactos + notas',
            t('panel.crm.feat.interactions') || 'Historial de interacciones',
            t('panel.crm.feat.export') || 'Exportar CSV',
        ] : featureFlags.enable_crm && !featureFlags.enable_crm_segmentation ? [
            t('panel.crm.feat.segmentation') || 'Segmentación / etiquetas',
            t('panel.crm.feat.moreContacts') || 'Hasta 5.000 contactos',
            t('panel.crm.feat.export') || 'Exportar CSV',
        ] : undefined,
        nextTierName: isLocked ? 'CRM Básico' : !featureFlags.enable_crm_segmentation ? 'CRM Pro' : undefined,
        nextTierPrice: isLocked ? 15 : !featureFlags.enable_crm_segmentation ? 30 : undefined,
    }

    let count = 0
    let customers: {
        id: string
        email: string
        firstName: string
        lastName: string
        orderCount: number
        createdAt: string
    }[] = []

    if (!isLocked) {
        const scope = await getTenantMedusaScope(tenantId)
        // Fetch a meaningful batch — not just 10
        const res = await getAdminCustomers({ limit: 50, offset: 0 }, scope)
        count = res.count
        customers = res.customers.map(c => ({
            id: c.id,
            email: c.email,
            firstName: c.first_name ?? '',
            lastName: c.last_name ?? '',
            orderCount: c.orders?.length ?? 0,
            createdAt: c.created_at,
        }))
    }

    // Build segments from REAL customer data only
    const segments = {
        total: count,
        withOrders: customers.filter(c => c.orderCount > 0).length,
        recent: customers.filter(c => {
            if (!c.createdAt) return false
            const days30Ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            return new Date(c.createdAt) > days30Ago
        }).length,
    }

    const cfgAny = config as unknown as Record<string, unknown>

    return (
        <ModuleShell
            icon={<Users className="w-5 h-5" />}
            title={t('panel.crm.title') || 'CRM'}
            subtitle={t('panel.crm.subtitle') || 'Gestión de clientes y relaciones comerciales'}
            isLocked={isLocked}
            gateFlag="enable_crm"
            tierInfo={tierInfo}
            usageMeter={!isLocked ? {
                current: count,
                max: maxContacts,
                label: t('panel.crm.contacts') || 'contactos',
            } : undefined}
            lang={lang}
        >
            <CRMClient
                segments={segments}
                totalCustomers={count}
                maxContacts={maxContacts}
                enableSegmentation={featureFlags.enable_crm_segmentation}
                enableExport={featureFlags.enable_crm_export}
                enableContacts={featureFlags.enable_crm_contacts}
                enableInteractions={featureFlags.enable_crm_interactions}
                crmConfig={{
                    crm_auto_tag_customers: cfgAny.crm_auto_tag_customers ?? false,
                    crm_new_customer_tag: cfgAny.crm_new_customer_tag ?? '',
                    crm_notify_new_contact: cfgAny.crm_notify_new_contact ?? false,
                    crm_export_format: cfgAny.crm_export_format ?? 'csv',
                }}
                customers={customers}
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
        </ModuleShell>
    )
}

