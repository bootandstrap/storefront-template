/**
 * Módulos — Owner Panel Module Marketplace
 *
 * Shows all available modules with their activation status.
 * Owners can browse, compare tiers, and request module activation.
 * Gated as essential route (always accessible).
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getOwnerModuleStatus } from '@/lib/owner-modules'
import { getActiveModulesForTenant } from '@/lib/active-modules'
import ModulesMarketplaceClient from './ModulesMarketplaceClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const dictionary = await getDictionary(lang as Locale)
  const t = createTranslator(dictionary)
  return { title: t('panel.modules.title') || 'Módulos' }
}

export default async function ModulosPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const { tenantId } = await withPanelGuard()
  const dictionary = await getDictionary(lang as Locale)
  const t = createTranslator(dictionary)

  // Fetch module data
  const moduleStatus = await getOwnerModuleStatus(lang)

  // Compute recently activated modules (within last 7 days)
  let recentlyActivated: string[] = []
  try {
    const activeModules = await getActiveModulesForTenant(tenantId)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    recentlyActivated = activeModules
      .filter(m => new Date(m.activatedAt).getTime() > sevenDaysAgo)
      .map(m => m.moduleKey)
  } catch { /* degrade */ }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">
          {t('panel.modules.title') || 'Centro de Control'}
        </h1>
        <p className="text-text-muted mt-1">
          {t('panel.modules.subtitle') || 'Gestiona y amplía las funcionalidades de tu tienda'}
        </p>
      </div>
      <ModulesMarketplaceClient
        catalog={moduleStatus.catalog}
        activeModules={moduleStatus.activeModules}
        monthlySpend={moduleStatus.monthlySpend}
        locale={lang}
        recentlyActivated={recentlyActivated}
        labels={{
          title: t('panel.modules.title') || 'Módulos',
          subtitle: t('panel.modules.subtitle') || 'Gestiona y amplía las funcionalidades de tu tienda',
          active: t('panel.modules.active') || 'Activo',
          inactive: t('panel.modules.inactive') || 'Disponible',
          activate: t('panel.modules.activate') || 'Activar',
          upgrade: t('panel.modules.upgrade') || 'Mejorar',
          manage: t('panel.modules.manage') || 'Gestionar',
          monthly: t('panel.modules.monthly') || '/mes',
          free: t('panel.modules.free') || 'Gratis',
          recommended: t('panel.modules.recommended') || 'Recomendado',
          currentPlan: t('panel.modules.currentPlan') || 'Plan actual',
          monthlySpend: t('panel.modules.monthlySpend') || 'Gasto mensual en módulos',
          activeModules: t('panel.modules.activeModules') || 'Módulos activos',
          availableModules: t('panel.modules.availableModules') || 'Módulos disponibles',
          allCategories: t('panel.modules.allCategories') || 'Todos',
          categorySell: t('panel.modules.categorySell') || 'Vender',
          categoryEngage: t('panel.modules.categoryEngage') || 'Conectar',
          categoryGrow: t('panel.modules.categoryGrow') || 'Crecer',
          categoryAutomate: t('panel.modules.categoryAutomate') || 'Automatizar',
          requires: t('panel.modules.requires') || 'Requiere',
          features: t('panel.modules.features') || 'Características',
          contactSupport: t('panel.modules.contactSupport') || 'Contactar soporte',
          viewDetails: t('panel.modules.viewDetails') || 'Ver detalles',
          powerUserTitle: t('panel.modules.powerUserTitle') || 'Power User!',
          powerUserDesc: t('panel.modules.powerUserDesc') || '',
        }}
      />
    </div>
  )
}

