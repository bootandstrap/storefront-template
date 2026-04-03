/**
 * Module Detail & Config — Dynamic route per module
 *
 * Shows module detail (tier info, features) + config panel for active modules.
 * Route: /panel/modulos/[module]
 */

import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { withPanelGuard } from '@/lib/panel-guard'
import { getOwnerModuleStatus } from '@/lib/owner-modules'
import { getModuleConfigContext } from '@/lib/owner-config'
import ModuleConfigClient from './ModuleConfigClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; module: string }>
}) {
  const { lang, module: moduleKey } = await params
  const dictionary = await getDictionary(lang as Locale)
  const t = createTranslator(dictionary)
  return {
    title: `${t('panel.modules.title')} — ${moduleKey}`,
  }
}

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ lang: string; module: string }>
}) {
  const { lang, module: moduleKey } = await params
  const { appConfig } = await withPanelGuard()
  const { config, featureFlags } = appConfig
  const dictionary = await getDictionary(lang as Locale)
  const t = createTranslator(dictionary)

  // Get module data
  const moduleStatus = await getOwnerModuleStatus(lang)
  const configContext = await getModuleConfigContext(
    moduleKey,
    moduleStatus.catalog,
    moduleStatus.activeModules,
    config as unknown as Record<string, unknown>,
    featureFlags as unknown as Record<string, boolean>,
  )

  if (!configContext) {
    return (
      <div className="space-y-6">
        <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-tx">
            {t('panel.moduleConfig.notFound') || 'Módulo no encontrado'}
          </h2>
          <p className="text-tx-muted mt-2">
            {t('panel.moduleConfig.notFoundDesc') || 'El módulo solicitado no existe o no está disponible.'}
          </p>
        </div>
      </div>
    )
  }

  const isActive = moduleKey in moduleStatus.activeModules

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-start gap-4">
        <div className={`
          text-3xl w-14 h-14 flex items-center justify-center rounded-xl
          bg-gradient-to-br ${configContext.module.color_gradient} bg-opacity-10
        `}>
          {configContext.module.emoji}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display text-tx">
              {configContext.module.name}
            </h1>
            {isActive && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-brand-subtle text-success">
                ✓ {t('panel.modules.active') || 'Activo'}
              </span>
            )}
          </div>
          <p className="text-tx-muted mt-1">{configContext.module.description}</p>
        </div>
      </div>

      <ModuleConfigClient
        moduleKey={moduleKey}
        context={configContext}
        isActive={isActive}
        locale={lang}
        labels={{
          save: t('common.saveChanges') || 'Guardar cambios',
          saving: t('common.saving') || 'Guardando…',
          saved: t('common.saved') || 'Guardado',
          activate: t('panel.modules.activate') || 'Activar',
          upgrade: t('panel.modules.upgrade') || 'Mejorar',
          currentPlan: t('panel.modules.currentPlan') || 'Plan actual',
          features: t('panel.modules.features') || 'Características',
          configuration: t('panel.moduleConfig.configuration') || 'Configuración',
          noConfigAvailable: t('panel.moduleConfig.noConfig') || 'Este módulo no requiere configuración adicional.',
          enabledFeatures: t('panel.moduleConfig.enabledFeatures') || 'Funciones habilitadas',
          disabledFeatures: t('panel.moduleConfig.disabledFeatures') || 'Funciones no disponibles',
          upgradeTip: t('panel.moduleConfig.upgradeTip') || 'Mejora tu plan para desbloquear más funciones',
          notActivated: t('panel.moduleConfig.notActivated') || 'Este módulo no está activo',
          notActivatedDesc: t('panel.moduleConfig.notActivatedDesc') || 'Activa este módulo para acceder a su configuración y funcionalidades.',
          contactSupport: t('panel.modules.contactSupport') || 'Contactar soporte',
          monthly: t('panel.modules.monthly') || '/mes',
          free: t('panel.modules.free') || 'Gratis',
          recommended: t('panel.modules.recommended') || 'Recomendado',
          backToModules: t('panel.moduleConfig.backToModules') || '← Volver a módulos',
        }}
      />
    </div>
  )
}
