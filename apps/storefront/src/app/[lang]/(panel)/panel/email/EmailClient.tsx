'use client'

/**
 * EmailClient — Owner Panel (SOTA rewrite)
 *
 * Features:
 * - PageEntrance animation
 * - StatCard for dashboard metrics (replaces hand-rolled cards)
 * - Animated tabs with motion indicator
 * - Animated usage bar (motion width)
 * - Feature-gated tab styling
 * - Animated automation cards
 * - Per-template toggle control (Notifications tab)
 * - Real-time stats breakdown per email type
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { Mail, Send, Clock, BarChart3, ShoppingCart, Star, Palette, Lock, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ABANDONED_CART_DELAY_OPTIONS, REVIEW_REQUEST_DELAY_OPTIONS, type AutomationConfig } from '@/lib/email-automations-shared'

import StatCard from '@/components/panel/StatCard'
import { PageEntrance } from '@/components/panel/PanelAnimations'
import ModuleConfigSection from '@/components/panel/ModuleConfigSection'
import { getModuleConfigSchema } from '@/lib/registries/module-config-schemas'

import { EmailLogEntry } from '@/lib/email-log'
import EmailLogsGrid from './EmailLogsGrid'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailStats {
    sent_this_month: number
    monthly_limit: number
    open_rate: number
    bounce_rate: number
    breakdown?: Record<string, number>
}

interface Labels {
    title: string
    subtitle: string
    dashboard: string
    logs: string
    automations: string
    templates: string
    campaigns: string
    sentThisMonth: string
    openRate: string
    bounceRate: string
    abandonedCart: string
    abandonedCartDesc: string
    reviewRequest: string
    reviewRequestDesc: string
    delay: string
    enabled: string
    disabled: string
    save: string
    upgradeRequired: string
    emailsRemaining: string
    providerWarning: string
    providerWarningAction: string
    templatesPlaceholder: string
    campaignsPlaceholder: string
}

interface Props {
    config: AutomationConfig
    stats: EmailStats
    flags: {
        enable_email_notifications: boolean
        enable_abandoned_cart_emails: boolean
        enable_email_campaigns: boolean
        enable_email_templates: boolean
    }
    hasProvider: boolean
    labels: Labels
    saveAction: (config: AutomationConfig) => Promise<{ success: boolean; error?: string }>
    savePreferencesAction?: (prefs: EmailPreferences) => Promise<{ success: boolean; error?: string }>
    emailPreferences?: EmailPreferences
    emailSenderConfig?: Record<string, unknown>
    logsData: { logs: EmailLogEntry[]; count: number }
    queryParams: {
        currentPage: number
        pageSize: number
        status: 'all' | 'sent' | 'delivered' | 'bounced' | 'opened' | 'clicked' | 'failed'
        search: string
    }
}

import type { EmailPreferences } from './actions'

type TabKey = 'dashboard' | 'notifications' | 'logs' | 'automations' | 'templates' | 'campaigns'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmailClient({ config, stats, flags, hasProvider, labels, saveAction, savePreferencesAction, emailPreferences, emailSenderConfig, logsData, queryParams }: Props) {
    const emailConfigFields = getModuleConfigSchema('email_marketing')
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()

    const [automationConfig, setAutomationConfig] = useState<AutomationConfig>(config)
    const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
    const [prefs, setPrefs] = useState<EmailPreferences>(emailPreferences || {
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
    })
    const [prefsSaving, startPrefsSaving] = useTransition()

    const handleSave = () => {
        startTransition(async () => {
            const result = await saveAction(automationConfig)
            if (result.success) {
                toast.success('✓')
                router.refresh()
            } else {
                toast.error(result.error ?? 'Error')
            }
        })
    }

    const usagePercent = stats.monthly_limit > 0
        ? Math.round((stats.sent_this_month / stats.monthly_limit) * 100)
        : 0

    const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; gated: boolean }[] = [
        { key: 'dashboard', label: labels.dashboard, icon: BarChart3, gated: false },
        { key: 'notifications', label: 'Notificaciones', icon: Mail, gated: false },
        { key: 'logs', label: labels.logs || 'Logs', icon: Mail, gated: false },
        { key: 'automations', label: labels.automations, icon: Clock, gated: false },
        { key: 'templates', label: labels.templates, icon: Palette, gated: !flags.enable_email_templates },
        { key: 'campaigns', label: labels.campaigns, icon: Send, gated: !flags.enable_email_campaigns },
    ]

    return (
        <PageEntrance className="space-y-5">


            {/* Provider warning */}
            <AnimatePresence>
                {!hasProvider && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-xl border border-amber-400/40 bg-amber-50/80 dark:bg-amber-950/30 px-5 py-4 flex items-start gap-3"
                    >
                        <Mail className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                {labels.providerWarning}
                            </p>
                            <a
                                href="/panel/ajustes?tab=tienda"
                                className="text-sm text-brand hover:underline mt-1 inline-block"
                            >
                                {labels.providerWarningAction} →
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs with animated indicator */}
            <div className="flex gap-1 bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-xl w-fit p-1">
                {tabs.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.key}
                            onClick={() => !tab.gated && setActiveTab(tab.key)}
                            aria-pressed={activeTab === tab.key}
                            aria-disabled={tab.gated}
                            className={`relative px-4 py-2.5 min-h-[44px] text-sm font-medium flex items-center gap-2 transition-all rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${
                                activeTab === tab.key
                                    ? 'text-brand'
                                    : tab.gated
                                        ? 'text-tx-muted cursor-not-allowed opacity-50'
                                        : 'text-tx-sec hover:text-tx'
                            }`}
                        >
                            {activeTab === tab.key && (
                                <motion.div
                                    layoutId="email-tab-indicator"
                                    className="absolute inset-0 bg-white dark:bg-sf-2 rounded-lg shadow-sm"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {tab.gated && <Lock className="w-3 h-3" />}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Dashboard Tab */}
            <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <StatCard
                                    label={labels.sentThisMonth}
                                    value={stats.sent_this_month.toLocaleString()}
                                    icon={<Send className="w-4 h-4" />}
                                    stagger={0}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <StatCard
                                    label={labels.openRate}
                                    value={`${stats.open_rate}%`}
                                    icon={<BarChart3 className="w-4 h-4" />}
                                    stagger={1}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <StatCard
                                    label={labels.bounceRate}
                                    value={`${stats.bounce_rate}%`}
                                    icon={<Mail className="w-4 h-4" />}
                                    stagger={2}
                                />
                            </div>
                        </div>

                        {/* ── Governance-aware usage card ── */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl px-5 py-5"
                        >
                            {/* Header with tier badge */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-brand" />
                                    <span className="font-semibold text-sm text-tx">
                                        {stats.monthly_limit > 0 ? 'Email Marketing' : 'Emails Gratuitos'}
                                    </span>
                                    {stats.monthly_limit > 0 && (
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                                            {stats.monthly_limit >= 10000 ? 'Enterprise' : stats.monthly_limit >= 2000 ? 'Pro' : 'Basic'}
                                        </span>
                                    )}
                                </div>
                                <span className="font-semibold text-sm text-tx">
                                    {stats.sent_this_month.toLocaleString()} / {(stats.monthly_limit > 0 ? stats.monthly_limit : 100).toLocaleString()}
                                </span>
                            </div>

                            {/* Usage bar */}
                            <div className="h-2.5 bg-sf-2 rounded-full overflow-hidden mb-3">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(usagePercent > 0 ? usagePercent : Math.round((stats.sent_this_month / 100) * 100), 100)}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                                    className={`h-full rounded-full ${usagePercent > 90 || (stats.monthly_limit === 0 && stats.sent_this_month > 80) ? 'bg-red-500' : usagePercent > 70 || (stats.monthly_limit === 0 && stats.sent_this_month > 60) ? 'bg-amber-500' : 'bg-brand'}`}
                                />
                            </div>

                            {/* Category breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                {/* Essential */}
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-3 py-2.5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">Esenciales</span>
                                    </div>
                                    <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">
                                        Confirmación pedido, pago fallido
                                    </p>
                                    <p className="text-emerald-700 dark:text-emerald-300 font-bold mt-1">
                                        ✓ Gratis
                                    </p>
                                </div>

                                {/* Transactional */}
                                <div className={`rounded-xl px-3 py-2.5 ${flags.enable_email_notifications ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-sf-1/50'}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className={`w-2 h-2 rounded-full ${flags.enable_email_notifications ? 'bg-blue-500' : 'bg-gray-400'}`} />
                                        <span className={`font-medium ${flags.enable_email_notifications ? 'text-blue-700 dark:text-blue-400' : 'text-tx-muted'}`}>
                                            Transaccional
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-tx-muted">
                                        Envío, entrega, reembolso, stock
                                    </p>
                                    <p className={`font-bold mt-1 ${flags.enable_email_notifications ? 'text-blue-700 dark:text-blue-300' : 'text-tx-muted'}`}>
                                        {flags.enable_email_notifications ? '✓ Activo' : <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Basic</span>}
                                    </p>
                                </div>

                                {/* Marketing */}
                                <div className={`rounded-xl px-3 py-2.5 ${flags.enable_abandoned_cart_emails ? 'bg-orange-50 dark:bg-orange-500/10' : 'bg-sf-1/50'}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className={`w-2 h-2 rounded-full ${flags.enable_abandoned_cart_emails ? 'bg-orange-500' : 'bg-gray-400'}`} />
                                        <span className={`font-medium ${flags.enable_abandoned_cart_emails ? 'text-orange-700 dark:text-orange-400' : 'text-tx-muted'}`}>
                                            Marketing
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-tx-muted">
                                        Carrito abandonado, reseñas
                                    </p>
                                    <p className={`font-bold mt-1 ${flags.enable_abandoned_cart_emails ? 'text-orange-700 dark:text-orange-300' : 'text-tx-muted'}`}>
                                        {flags.enable_abandoned_cart_emails ? '✓ Activo' : <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Pro</span>}
                                    </p>
                                </div>

                                {/* Campaigns */}
                                <div className={`rounded-xl px-3 py-2.5 ${flags.enable_email_campaigns ? 'bg-purple-50 dark:bg-purple-500/10' : 'bg-sf-1/50'}`}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className={`w-2 h-2 rounded-full ${flags.enable_email_campaigns ? 'bg-purple-500' : 'bg-gray-400'}`} />
                                        <span className={`font-medium ${flags.enable_email_campaigns ? 'text-purple-700 dark:text-purple-400' : 'text-tx-muted'}`}>
                                            Campañas
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-tx-muted">
                                        Newsletter, segmentación
                                    </p>
                                    <p className={`font-bold mt-1 ${flags.enable_email_campaigns ? 'text-purple-700 dark:text-purple-300' : 'text-tx-muted'}`}>
                                        {flags.enable_email_campaigns ? '✓ Activo' : <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Enterprise</span>}
                                    </p>
                                </div>
                            </div>

                            {/* Upsell strip */}
                            {stats.monthly_limit === 0 && (
                                <div className="mt-3 pt-3 border-t border-sf-2 flex items-center justify-between text-xs">
                                    <span className="text-tx-muted">
                                        ⬆️ Amplía a 500/mes con Email Marketing
                                    </span>
                                    <a
                                        href="/panel/modulos"
                                        className="text-brand hover:underline font-medium"
                                    >
                                        Ver módulo →
                                    </a>
                                </div>
                            )}
                            {stats.monthly_limit > 0 && stats.monthly_limit < 10000 && (
                                <div className="mt-3 pt-3 border-t border-sf-2 flex items-center justify-between text-xs">
                                    <span className="text-tx-muted">
                                        ⬆️ {stats.monthly_limit < 2000 ? 'Pro: 2.000/mes + automatizaciones' : 'Enterprise: 10.000/mes + dominio propio'}
                                    </span>
                                    <a
                                        href="/panel/modulos"
                                        className="text-brand hover:underline font-medium"
                                    >
                                        Mejorar →
                                    </a>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}\n\n                {/* Notifications Tab — Per-template toggles */}
                {activeTab === 'notifications' && (
                    <motion.div
                        key="notifications"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-4"
                    >
                        <p className="text-sm text-tx-muted">
                            Controla qué emails se envían desde tu tienda. Los emails esenciales están siempre disponibles.
                        </p>

                        {/* Toggle Grid */}
                        {(() => {
                            const categories: { title: string; color: string; dot: string; items: { key: keyof EmailPreferences; label: string; desc: string; gated: boolean; gateLabel?: string; audience: string; count: number }[] }[] = [
                                {
                                    title: 'Esenciales (gratis)',
                                    color: 'emerald',
                                    dot: 'bg-emerald-500',
                                    items: [
                                        { key: 'send_order_confirmation', label: 'Confirmación de pedido', desc: 'Al cliente tras completar compra', gated: false, audience: '→ Cliente', count: stats.breakdown?.order_confirmation ?? 0 },
                                        { key: 'send_payment_failed', label: 'Pago fallido', desc: 'Al cliente si el pago no se procesa', gated: false, audience: '→ Cliente', count: stats.breakdown?.payment_failed ?? 0 },
                                    ],
                                },
                                {
                                    title: 'Transaccional',
                                    color: 'blue',
                                    dot: 'bg-blue-500',
                                    items: [
                                        { key: 'send_order_shipped', label: 'Pedido enviado', desc: 'Al cliente cuando se envía', gated: !flags.enable_email_notifications, gateLabel: 'Basic', audience: '→ Cliente', count: stats.breakdown?.order_shipped ?? 0 },
                                        { key: 'send_order_delivered', label: 'Pedido entregado', desc: 'Al cliente cuando se entrega', gated: !flags.enable_email_notifications, gateLabel: 'Basic', audience: '→ Cliente', count: stats.breakdown?.order_delivered ?? 0 },
                                        { key: 'send_order_cancelled', label: 'Pedido cancelado', desc: 'Al cliente si se cancela', gated: !flags.enable_email_notifications, gateLabel: 'Basic', audience: '→ Cliente', count: stats.breakdown?.order_cancelled ?? 0 },
                                        { key: 'send_refund_processed', label: 'Reembolso procesado', desc: 'Al cliente al procesar devolución', gated: !flags.enable_email_notifications, gateLabel: 'Basic', audience: '→ Cliente', count: stats.breakdown?.refund_processed ?? 0 },
                                        { key: 'send_welcome', label: 'Bienvenida', desc: 'Al cliente al crear cuenta', gated: !flags.enable_email_notifications, gateLabel: 'Basic', audience: '→ Cliente', count: stats.breakdown?.welcome ?? 0 },
                                        { key: 'send_low_stock_alert', label: 'Alerta stock bajo', desc: 'A ti cuando un producto tiene poco stock', gated: !flags.enable_email_notifications, gateLabel: 'Basic', audience: '→ Tú', count: stats.breakdown?.low_stock_alert ?? 0 },
                                    ],
                                },
                                {
                                    title: 'Marketing',
                                    color: 'orange',
                                    dot: 'bg-orange-500',
                                    items: [
                                        { key: 'send_abandoned_cart', label: 'Carrito abandonado', desc: 'Al cliente que deja items en carrito', gated: !flags.enable_abandoned_cart_emails, gateLabel: 'Pro', audience: '→ Cliente', count: stats.breakdown?.abandoned_cart ?? 0 },
                                        { key: 'send_review_request', label: 'Solicitud de reseña', desc: 'Al cliente tras recibir pedido', gated: !flags.enable_abandoned_cart_emails, gateLabel: 'Pro', audience: '→ Cliente', count: stats.breakdown?.review_request ?? 0 },
                                    ],
                                },
                            ]

                            return categories.map(cat => (
                                <div key={cat.title} className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl overflow-hidden">
                                    <div className="px-5 py-3 border-b border-sf-2 flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${cat.dot}`} />
                                        <span className="text-sm font-semibold text-tx">{cat.title}</span>
                                    </div>
                                    <div className="divide-y divide-sf-2/50">
                                        {cat.items.map(item => (
                                            <div key={item.key} className="flex items-center justify-between px-5 py-3.5 group">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-tx">{item.label}</span>
                                                        <span className="text-[10px] text-tx-muted bg-sf-1 px-1.5 py-0.5 rounded">{item.audience}</span>
                                                        {item.count > 0 && (
                                                            <span className="text-[10px] font-mono text-tx-muted">{item.count} este mes</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-tx-muted mt-0.5">{item.desc}</p>
                                                </div>
                                                <div className="flex items-center gap-2 ml-3">
                                                    {item.gated ? (
                                                        <span className="flex items-center gap-1 text-xs text-tx-muted">
                                                            <Lock className="w-3 h-3" />
                                                            {item.gateLabel}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={prefs[item.key] as boolean}
                                                            onClick={() => setPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                                                prefs[item.key] ? 'bg-brand' : 'bg-sf-3'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                                                    prefs[item.key] ? 'translate-x-6' : 'translate-x-1'
                                                                }`}
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        })()}

                        {/* Save button */}
                        {savePreferencesAction && (
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => {
                                    startPrefsSaving(async () => {
                                        const result = await savePreferencesAction(prefs)
                                        if (result.success) {
                                            toast.success('Preferencias guardadas')
                                            router.refresh()
                                        } else {
                                            toast.error(result.error ?? 'Error')
                                        }
                                    })
                                }}
                                disabled={prefsSaving}
                                className="w-full py-3 rounded-xl bg-brand text-white font-semibold hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {prefsSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {labels.save}
                            </motion.button>
                        )}
                    </motion.div>
                )}

                {/* Logs Tab */}
                {activeTab === 'logs' && (
                    <motion.div
                        key="logs"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <EmailLogsGrid logsData={logsData} queryParams={queryParams} />
                    </motion.div>
                )}

                {/* Automations Tab */}
                {activeTab === 'automations' && (
                    <motion.div
                        key="automations"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-4"
                    >
                        {/* Abandoned Cart */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -1 }}
                            className={`bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-6 transition-shadow hover:shadow-lg ${!flags.enable_abandoned_cart_emails ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-tx">{labels.abandonedCart}</h3>
                                        <p className="text-xs text-tx-muted">{labels.abandonedCartDesc}</p>
                                    </div>
                                </div>
                                {flags.enable_abandoned_cart_emails ? (
                                    <button
                                        onClick={() => setAutomationConfig(prev => ({
                                            ...prev,
                                            abandoned_cart_enabled: !prev.abandoned_cart_enabled,
                                        }))}
                                        aria-pressed={automationConfig.abandoned_cart_enabled}
                                        className={`px-4 py-2 min-h-[40px] rounded-xl text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${automationConfig.abandoned_cart_enabled
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                            : 'border-sf-3 text-tx-sec'
                                            }`}
                                    >
                                        {automationConfig.abandoned_cart_enabled ? labels.enabled : labels.disabled}
                                    </button>
                                ) : (
                                    <span className="text-xs text-tx-muted flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> {labels.upgradeRequired}
                                    </span>
                                )}
                            </div>
                            <AnimatePresence>
                                {flags.enable_abandoned_cart_emails && automationConfig.abandoned_cart_enabled && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-4 pt-4 border-t border-sf-2">
                                            <label className="text-sm font-medium text-tx-sec block mb-2">{labels.delay}</label>
                                            <div className="flex gap-2">
                                                {ABANDONED_CART_DELAY_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setAutomationConfig(prev => ({
                                                            ...prev,
                                                            abandoned_cart_delay_hours: opt.value,
                                                        }))}
                                                        aria-pressed={automationConfig.abandoned_cart_delay_hours === opt.value}
                                                        className={`relative px-3 py-2 min-h-[40px] rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${automationConfig.abandoned_cart_delay_hours === opt.value
                                                            ? 'text-white'
                                                            : 'border border-sf-3 text-tx-sec hover:bg-sf-1'
                                                            }`}
                                                    >
                                                        {automationConfig.abandoned_cart_delay_hours === opt.value && (
                                                            <motion.div
                                                                layoutId="cart-delay-indicator"
                                                                className="absolute inset-0 bg-brand rounded-xl"
                                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                                            />
                                                        )}
                                                        <span className="relative z-10">{opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Review Requests */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            whileHover={{ y: -1 }}
                            className={`bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-6 transition-shadow hover:shadow-lg ${!flags.enable_email_notifications ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                                        <Star className="w-5 h-5 text-yellow-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-tx">{labels.reviewRequest}</h3>
                                        <p className="text-xs text-tx-muted">{labels.reviewRequestDesc}</p>
                                    </div>
                                </div>
                                {flags.enable_email_notifications ? (
                                    <button
                                        onClick={() => setAutomationConfig(prev => ({
                                            ...prev,
                                            review_request_enabled: !prev.review_request_enabled,
                                        }))}
                                        aria-pressed={automationConfig.review_request_enabled}
                                        className={`px-4 py-2 min-h-[40px] rounded-xl text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${automationConfig.review_request_enabled
                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                            : 'border-sf-3 text-tx-sec'
                                            }`}
                                    >
                                        {automationConfig.review_request_enabled ? labels.enabled : labels.disabled}
                                    </button>
                                ) : (
                                    <span className="text-xs text-tx-muted flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> {labels.upgradeRequired}
                                    </span>
                                )}
                            </div>
                            <AnimatePresence>
                                {flags.enable_email_notifications && automationConfig.review_request_enabled && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-4 pt-4 border-t border-sf-2">
                                            <label className="text-sm font-medium text-tx-sec block mb-2">{labels.delay}</label>
                                            <div className="flex gap-2">
                                                {REVIEW_REQUEST_DELAY_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setAutomationConfig(prev => ({
                                                            ...prev,
                                                            review_request_delay_days: opt.value,
                                                        }))}
                                                        aria-pressed={automationConfig.review_request_delay_days === opt.value}
                                                        className={`relative px-3 py-2 min-h-[40px] rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${automationConfig.review_request_delay_days === opt.value
                                                            ? 'text-white'
                                                            : 'border border-sf-3 text-tx-sec hover:bg-sf-1'
                                                            }`}
                                                    >
                                                        {automationConfig.review_request_delay_days === opt.value && (
                                                            <motion.div
                                                                layoutId="review-delay-indicator"
                                                                className="absolute inset-0 bg-brand rounded-xl"
                                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                                            />
                                                        )}
                                                        <span className="relative z-10">{opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* Save button */}
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            onClick={handleSave}
                            disabled={isPending}
                            className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isPending ? '...' : labels.save}
                        </motion.button>
                    </motion.div>
                )}

                {/* Templates Tab (gated) */}
                {activeTab === 'templates' && (
                    <motion.div
                        key="templates"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl"
                    >
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Palette className="w-8 h-8 text-tx-muted" />
                            </div>
                            <p className="text-tx-muted">{labels.templatesPlaceholder}</p>
                        </div>
                    </motion.div>
                )}

                {/* Campaigns Tab (gated) */}
                {activeTab === 'campaigns' && (
                    <motion.div
                        key="campaigns"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl"
                    >
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Send className="w-8 h-8 text-tx-muted" />
                            </div>
                            <p className="text-tx-muted">{labels.campaignsPlaceholder}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Email Sender Config Section */}
            {emailSenderConfig && (
                <ModuleConfigSection
                    fields={emailConfigFields}
                    initialValues={emailSenderConfig}
                    title="Email Sender Settings"
                    collapsible
                />
            )}
        </PageEntrance>
    )
}
