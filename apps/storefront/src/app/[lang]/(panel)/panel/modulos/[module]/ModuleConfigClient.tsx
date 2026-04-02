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

// ── Friendly flag names ────────────────────────────────────────────────

const FLAG_DISPLAY_NAMES: Record<string, string> = {
  enable_ecommerce: 'E-Commerce',
  enable_product_badges: 'Insignias de producto',
  enable_carousel: 'Carrusel de imágenes',
  enable_reviews: 'Reseñas de clientes',
  enable_wishlist: 'Lista de deseos',
  enable_promotions: 'Promociones y descuentos',
  enable_related_products: 'Productos relacionados',
  enable_product_comparison: 'Comparador de productos',
  enable_cms_pages: 'Páginas CMS',
  enable_self_service_returns: 'Devoluciones self-service',
  enable_order_notes: 'Notas en pedidos',
  enable_order_tracking: 'Seguimiento de envío',
  enable_whatsapp_checkout: 'Checkout WhatsApp',
  enable_online_payments: 'Pagos online',
  enable_cash_on_delivery: 'Pago contra entrega',
  enable_bank_transfer: 'Transferencia bancaria',
  enable_analytics: 'Analíticas y métricas',
  enable_social_links: 'Redes sociales',
  enable_i18n: 'Multi-idioma',
  enable_email_marketing: 'Email marketing',
  enable_newsletter: 'Newsletter',
  enable_chatbot: 'Chatbot IA',
  enable_user_registration: 'Registro de usuarios',
  enable_customer_accounts: 'Cuentas de cliente',
  enable_address_management: 'Gestión de direcciones',
  enable_crm: 'CRM',
  enable_admin_api: 'API de administración',
}

// ── Config field metadata ──────────────────────────────────────────────

interface ConfigFieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'url' | 'email' | 'tel' | 'textarea' | 'toggle' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
}

const MODULE_CONFIG_FIELD_DEFS: Record<string, ConfigFieldDef[]> = {
  ecommerce: [
    { key: 'stock_mode', label: 'Modo de stock', type: 'select', options: [
      { value: 'enabled', label: 'Activado' },
      { value: 'disabled', label: 'Desactivado' },
      { value: 'display_only', label: 'Solo mostrar' },
    ]},
    { key: 'low_stock_threshold', label: 'Umbral de stock bajo', type: 'number', placeholder: '5' },
    { key: 'free_shipping_threshold', label: 'Envío gratis desde (€)', type: 'number', placeholder: '50' },
    { key: 'tax_display_mode', label: 'Mostrar impuestos', type: 'select', options: [
      { value: 'included', label: 'Incluidos en precio' },
      { value: 'excluded', label: 'Añadidos al final' },
    ]},
  ],
  sales_channels: [
    { key: 'whatsapp_number', label: 'WhatsApp', type: 'tel', placeholder: '+34 600 000 000' },
    { key: 'default_country_prefix', label: 'Prefijo país', type: 'text', placeholder: '+34' },
    { key: 'bank_name', label: 'Banco', type: 'text', placeholder: 'Nombre del banco' },
    { key: 'bank_account_type', label: 'Tipo de cuenta', type: 'text', placeholder: 'Corriente / Ahorros' },
    { key: 'bank_account_number', label: 'Número de cuenta', type: 'text', placeholder: 'IBAN' },
    { key: 'bank_account_holder', label: 'Titular', type: 'text', placeholder: 'Nombre del titular' },
    { key: 'bank_id_number', label: 'NIF/CIF titular', type: 'text', placeholder: 'Documento de identidad' },
    { key: 'sales_whatsapp_greeting', label: 'Saludo WhatsApp', type: 'textarea', placeholder: '¡Hola! Bienvenido a nuestra tienda…' },
    { key: 'sales_preferred_contact', label: 'Contacto preferido', type: 'select', options: [
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'phone', label: 'Teléfono' },
      { value: 'email', label: 'Email' },
    ]},
    { key: 'sales_business_hours_display', label: 'Mostrar horario', type: 'select', options: [
      { value: 'not_shown', label: 'No mostrar' },
      { value: 'weekdays', label: 'Lunes a viernes' },
      { value: 'full_week', label: 'Semana completa' },
      { value: 'custom', label: 'Personalizado' },
    ]},
    { key: 'sales_highlight_free_shipping', label: 'Destacar envío gratis', type: 'toggle' },
  ],
  seo_analytics: [
    { key: 'meta_title', label: 'Meta Título', type: 'text', placeholder: 'Mi Tienda Online' },
    { key: 'meta_description', label: 'Meta Descripción', type: 'textarea', placeholder: 'Descripción para buscadores…' },
    { key: 'google_analytics_id', label: 'Google Analytics ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
    { key: 'facebook_pixel_id', label: 'Facebook Pixel ID', type: 'text', placeholder: '123456789' },
    { key: 'sentry_dsn', label: 'Sentry DSN', type: 'url', placeholder: 'https://xxx@sentry.io/xxx' },
  ],
  social_media: [
    { key: 'social_facebook', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/…' },
    { key: 'social_instagram', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/…' },
    { key: 'social_tiktok', label: 'TikTok', type: 'url', placeholder: 'https://tiktok.com/@…' },
    { key: 'social_twitter', label: 'X / Twitter', type: 'url', placeholder: 'https://x.com/…' },
  ],
  i18n_currency: [
    { key: 'language', label: 'Idioma principal', type: 'select', options: [
      { value: 'es', label: 'Español' },
      { value: 'en', label: 'English' },
      { value: 'de', label: 'Deutsch' },
      { value: 'fr', label: 'Français' },
      { value: 'it', label: 'Italiano' },
    ]},
    { key: 'default_currency', label: 'Moneda principal', type: 'select', options: [
      { value: 'eur', label: 'EUR (€)' },
      { value: 'chf', label: 'CHF' },
      { value: 'usd', label: 'USD ($)' },
      { value: 'gbp', label: 'GBP (£)' },
    ]},
    { key: 'timezone', label: 'Zona horaria', type: 'select', options: [
      { value: 'Europe/Madrid', label: 'Madrid (CET)' },
      { value: 'Europe/Zurich', label: 'Zurich (CET)' },
      { value: 'Europe/London', label: 'London (GMT)' },
      { value: 'Europe/Paris', label: 'Paris (CET)' },
      { value: 'America/New_York', label: 'New York (EST)' },
    ]},
  ],
  // ── Chatbot ──────────────────────────────────────────────────────────────
  chatbot: [
    { key: 'chatbot_name', label: 'Nombre del asistente', type: 'text', placeholder: 'Asistente IA' },
    { key: 'chatbot_tone', label: 'Tono de comunicación', type: 'select', options: [
      { value: 'formal', label: 'Formal' },
      { value: 'friendly', label: 'Amigable' },
      { value: 'casual', label: 'Casual' },
    ]},
    { key: 'chatbot_welcome_message', label: 'Mensaje de bienvenida', type: 'textarea', placeholder: '¡Hola! ¿En qué puedo ayudarte?' },
    { key: 'chatbot_auto_open_delay', label: 'Apertura automática (segundos)', type: 'number', placeholder: '0 = desactivado' },
    { key: 'chatbot_knowledge_scope', label: 'Alcance de conocimiento', type: 'select', options: [
      { value: 'products_only', label: 'Solo productos' },
      { value: 'products_and_faq', label: 'Productos + FAQ' },
      { value: 'full_catalog', label: 'Catálogo completo' },
    ]},
  ],
  // ── POS ──────────────────────────────────────────────────────────────────
  pos: [
    { key: 'pos_receipt_header', label: 'Cabecera del ticket', type: 'textarea', placeholder: 'Nombre del negocio\nDirección…' },
    { key: 'pos_receipt_footer', label: 'Pie del ticket', type: 'textarea', placeholder: '¡Gracias por su compra!' },
    { key: 'pos_default_payment_method', label: 'Método de pago por defecto', type: 'select', options: [
      { value: 'cash', label: 'Efectivo' },
      { value: 'card', label: 'Tarjeta' },
      { value: 'transfer', label: 'Transferencia' },
    ]},
    { key: 'pos_tax_display', label: 'Impuestos en ticket', type: 'select', options: [
      { value: 'tax_included', label: 'Incluidos en precio' },
      { value: 'tax_excluded', label: 'Desglosados' },
    ]},
    { key: 'pos_enable_tips', label: 'Permitir propinas', type: 'toggle' },
    { key: 'pos_tip_percentages', label: 'Porcentajes de propina', type: 'text', placeholder: '5,10,15' },
    { key: 'pos_sound_enabled', label: 'Sonidos de notificación', type: 'toggle' },
  ],
  // ── CRM ──────────────────────────────────────────────────────────────────
  crm: [
    { key: 'crm_auto_tag_customers', label: 'Auto-etiquetar clientes nuevos', type: 'toggle' },
    { key: 'crm_new_customer_tag', label: 'Etiqueta para nuevos clientes', type: 'text', placeholder: 'nuevo' },
    { key: 'crm_notify_new_contact', label: 'Notificar nuevos contactos', type: 'toggle' },
    { key: 'crm_export_format', label: 'Formato de exportación', type: 'select', options: [
      { value: 'csv', label: 'CSV' },
      { value: 'excel', label: 'Excel' },
    ]},
  ],
  // ── Email Marketing ─────────────────────────────────────────────────────
  email_marketing: [
    { key: 'email_sender_name', label: 'Nombre del remitente', type: 'text', placeholder: 'Mi Tienda' },
    { key: 'email_reply_to', label: 'Responder a', type: 'email', placeholder: 'contacto@mitienda.com' },
    { key: 'email_footer_text', label: 'Pie de email', type: 'textarea', placeholder: 'Gracias por ser nuestro cliente' },
    { key: 'email_abandoned_cart_delay', label: 'Retraso carrito abandonado', type: 'select', options: [
      { value: '1h', label: '1 hora' },
      { value: '3h', label: '3 horas' },
      { value: '24h', label: '24 horas' },
    ]},
  ],
  // ── Automation ───────────────────────────────────────────────────────────
  automation: [
    { key: 'webhook_notification_email', label: 'Email de notificación', type: 'email', placeholder: 'admin@mitienda.com' },
  ],
  // ── Capacity ─────────────────────────────────────────────────────────────
  capacidad: [
    { key: 'traffic_alert_email', label: 'Email de alertas', type: 'email', placeholder: 'admin@mitienda.com' },
    { key: 'capacity_warning_threshold_pct', label: 'Umbral aviso (%)', type: 'number', placeholder: '70' },
    { key: 'capacity_critical_threshold_pct', label: 'Umbral crítico (%)', type: 'number', placeholder: '90' },
    { key: 'capacity_auto_upgrade_interest', label: 'Interés en auto-ampliación', type: 'toggle' },
  ],
}

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

  const fieldDefs = MODULE_CONFIG_FIELD_DEFS[moduleKey] || []
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
        <div className="glass rounded-2xl p-8 text-center space-y-4 border border-warning">
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
                    glass rounded-xl p-5 text-left border transition-all
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
            <div className="glass rounded-2xl p-6 space-y-4">
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
                          {FLAG_DISPLAY_NAMES[key] || key}
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
                          {FLAG_DISPLAY_NAMES[key] || key}
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
            <div className="glass rounded-2xl p-6 space-y-5">
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
            <div className="glass rounded-2xl p-6 text-center text-tx-muted">
              <Settings className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>{labels.noConfigAvailable}</p>
            </div>
          )}

          {/* Current Tier */}
          {context.activeTierKey && (
            <div className="glass rounded-2xl p-6">
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
