'use client'

/**
 * Module Config Client — Per-module config panel with feature flag indicators.
 *
 * Shows:
 * 1. Tier info + upgrade CTA for inactive modules
 * 2. Feature flags overview (enabled/disabled)
 * 3. Editable config fields (for modules with configurable settings)
 * 4. Save button with optimistic UI
 */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { ModuleConfigContext } from '@/lib/owner-config'
import { saveModuleConfigAction } from './actions'
import {
  Settings, Shield, Zap, Check, X as XIcon,
  ChevronRight, ArrowLeft, Sparkles,
} from 'lucide-react'
import { getModuleConfigSchema } from '@/lib/registries/module-config-schemas'
import { getFlagLabel } from '@/lib/registries/flag-display-names'

interface Labels {
  save: string
  saving: string
  saved: string
  activate: string
  upgrade: string
  currentPlan: string
  features: string
  configuration: string
  noConfigAvailable: string
  enabledFeatures: string
  disabledFeatures: string
  upgradeTip: string
  notActivated: string
  notActivatedDesc: string
  contactSupport: string
  monthly: string
  free: string
  recommended: string
  backToModules: string
}

interface Props {
  moduleKey: string
  context: ModuleConfigContext
  isActive: boolean
  locale: string
  labels: Labels
}

// Config schemas + flag labels loaded from centralized SSOT registries

export default function ModuleConfigClient({
  moduleKey,
  context,
  isActive,
  locale,
  labels,
}: Props) {
  const [formData, setFormData] = useState<Record<string, unknown>>(context.config)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fieldDefs = getModuleConfigSchema(moduleKey)
  const hasConfigFields = fieldDefs.length > 0

  const enabledFlags = Object.entries(context.featureFlags).filter(([, v]) => v)
  const disabledFlags = Object.entries(context.featureFlags).filter(([, v]) => !v)

  const update = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    setSaved(false)
    setSaveError(null)
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveModuleConfigAction(moduleKey, formData)
      if (result.success) {
        setSaved(true)
        setSaveError(null)
      } else {
        setSaveError(result.error ?? 'Error')
      }
    })
  }

  const inputClass =
    'w-full px-4 py-2.5 min-h-[44px] rounded-xl border border-sf-3 bg-sf-0 text-sm text-tx focus:outline-none focus:ring-2 focus:ring-soft focus:border-brand transition-all'
  const labelClass = 'block text-sm font-medium text-tx-sec mb-1'

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/panel/modulos`}
        className="inline-flex items-center gap-2 text-sm text-tx-muted hover:text-brand transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med rounded-lg px-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {labels.backToModules}
      </Link>

      {/* Not Active State */}
      {!isActive && (
        <div className="bg-sf-0/50 backdrop-blur-md border border-warning shadow-sm rounded-2xl p-8 text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold text-tx">{labels.notActivated}</h2>
          <p className="text-tx-muted max-w-md mx-auto">{labels.notActivatedDesc}</p>

          {/* Tier Cards */}
          {context.module.tiers && context.module.tiers.length > 0 && (
            <div className="grid gap-4 md:grid-cols-3 pt-4">
              {context.module.tiers.map((tier) => (
                <div
                  key={tier.key}
                  className={`
                    bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-xl p-5 text-left transition-all
                    ${tier.is_recommended
                      ? 'border-brand ring-2 ring-soft scale-[1.02]'
                      : 'border-sf-3 hover:border-brand'
                    }
                  `}
                >
                  {tier.is_recommended && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-brand mb-2">
                      <Sparkles className="w-3 h-3" />
                      {labels.recommended}
                    </div>
                  )}
                  <h3 className="font-bold text-tx">{tier.name}</h3>
                  <ul className="text-tx-muted text-sm mt-1 space-y-0.5">
                    {tier.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-success shrink-0" />
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 text-lg font-bold text-brand">
                    {tier.price > 0 ? `${tier.price} CHF${labels.monthly}` : labels.free}
                  </div>
                  <button className="btn btn-primary w-full mt-4 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2">
                    {labels.activate}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-tx-muted">
            {labels.contactSupport}: <a href="mailto:soporte@bootandstrap.com" className="text-brand underline">soporte@bootandstrap.com</a>
          </p>
        </div>
      )}

      {/* Active Module Content */}
      {isActive && (
        <>
          {/* Feature Flags */}
          {(enabledFlags.length > 0 || disabledFlags.length > 0) && (
            <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-tx font-semibold">
                <Shield className="w-5 h-5 text-brand" />
                {labels.features}
              </div>

              {enabledFlags.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-tx-muted uppercase tracking-wider mb-2">
                    {labels.enabledFeatures}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {enabledFlags.map(([key]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded-full bg-brand-subtle flex items-center justify-center">
                          <Check className="w-3 h-3 text-success" />
                        </div>
                        <span className="text-tx">
                          {getFlagLabel(key)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {disabledFlags.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-tx-muted uppercase tracking-wider mb-2">
                    {labels.disabledFeatures}
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {disabledFlags.map(([key]) => (
                      <div key={key} className="flex items-center gap-2 text-sm opacity-60">
                        <div className="w-5 h-5 rounded-full bg-sf-2 flex items-center justify-center">
                          <XIcon className="w-3 h-3 text-tx-muted" />
                        </div>
                        <span className="text-tx-muted">
                          {getFlagLabel(key)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 px-4 py-2 rounded-xl bg-brand-subtle border border-brand-soft text-sm text-tx-muted flex items-center gap-2">
                    <Zap className="w-4 h-4 text-brand shrink-0" />
                    {labels.upgradeTip}
                    <ChevronRight className="w-4 h-4 ml-auto text-brand" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Config Panel */}
          {hasConfigFields ? (
            <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-6 space-y-5">
              <div className="flex items-center gap-2 text-tx font-semibold">
                <Settings className="w-5 h-5 text-brand" />
                {labels.configuration}
              </div>

              {fieldDefs.map((field) => (
                <div key={field.key}>
                  <label className={labelClass}>{field.label}</label>
                  {field.type === 'toggle' ? (
                    <button
                      type="button"
                      onClick={() => update(field.key, !formData[field.key])}
                      className={`
                        relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200
                        focus:outline-none focus:ring-2 focus:ring-soft focus:ring-offset-2
                        ${formData[field.key] ? 'bg-brand' : 'bg-sf-3'}
                      `}
                      role="switch"
                      aria-checked={!!formData[field.key]}
                    >
                      <span
                        className={`
                          inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200
                          ${formData[field.key] ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  ) : field.type === 'select' ? (
                    <select
                      className={inputClass}
                      value={(formData[field.key] as string) ?? ''}
                      onChange={(e) => update(field.key, e.target.value)}
                    >
                      <option value="">—</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      className={inputClass}
                      rows={3}
                      value={(formData[field.key] as string) ?? ''}
                      onChange={(e) => update(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === 'number' ? (
                    <input
                      className={inputClass}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={(formData[field.key] as number) ?? ''}
                      onChange={(e) =>
                        update(field.key, e.target.value ? Number(e.target.value) : null)
                      }
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      className={inputClass}
                      type={field.type}
                      value={(formData[field.key] as string) ?? ''}
                      onChange={(e) => update(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}

              {/* Save */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="btn btn-primary min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                >
                  {isPending ? labels.saving : labels.save}
                </button>
                {saved && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" /> {labels.saved}
                  </span>
                )}
                {saveError && (
                  <span className="text-sm text-red-500">{saveError}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-6 text-center text-tx-muted">
              <Settings className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>{labels.noConfigAvailable}</p>
            </div>
          )}

          {/* Current Tier */}
          {context.activeTierKey && (
            <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-tx-muted uppercase tracking-wider">
                    {labels.currentPlan}
                  </div>
                  <div className="text-lg font-bold text-tx mt-1 capitalize">
                    {context.activeTierKey}
                  </div>
                </div>
                <button className="btn btn-sm btn-outline min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med">
                  {labels.upgrade}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
