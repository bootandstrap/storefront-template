'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toaster'
import { Mail, Send, Clock, BarChart3, ShoppingCart, Star, Palette, Lock } from 'lucide-react'
import { ABANDONED_CART_DELAY_OPTIONS, REVIEW_REQUEST_DELAY_OPTIONS, type AutomationConfig } from '@/lib/email-automations-shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailStats {
    sent_this_month: number
    monthly_limit: number
    open_rate: number
    bounce_rate: number
}

interface Labels {
    title: string
    subtitle: string
    dashboard: string
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
    labels: Labels
    saveAction: (config: AutomationConfig) => Promise<{ success: boolean; error?: string }>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmailClient({ config, stats, flags, labels, saveAction }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const toast = useToast()

    const [automationConfig, setAutomationConfig] = useState<AutomationConfig>(config)
    const [activeTab, setActiveTab] = useState<'dashboard' | 'automations' | 'templates' | 'campaigns'>('dashboard')

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

    const tabs = [
        { key: 'dashboard' as const, label: labels.dashboard, icon: BarChart3, gated: false },
        { key: 'automations' as const, label: labels.automations, icon: Clock, gated: false },
        { key: 'templates' as const, label: labels.templates, icon: Palette, gated: !flags.enable_email_templates },
        { key: 'campaigns' as const, label: labels.campaigns, icon: Send, gated: !flags.enable_email_campaigns },
    ]

    return (
        <>
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
                    <Mail className="w-6 h-6 text-primary" />
                    {labels.title}
                </h1>
                <p className="text-text-muted mt-1">{labels.subtitle}</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl border border-surface-3 overflow-hidden w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => !tab.gated && setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === tab.key
                            ? 'bg-primary text-white'
                            : tab.gated
                                ? 'text-text-muted cursor-not-allowed opacity-50'
                                : 'text-text-secondary hover:bg-surface-1'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {tab.gated && <Lock className="w-3 h-3" />}
                    </button>
                ))}
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Emails Sent */}
                    <div className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Send className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium text-text-secondary">{labels.sentThisMonth}</span>
                        </div>
                        <div className="text-3xl font-bold text-text-primary">
                            {stats.sent_this_month.toLocaleString()}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                            <div className="flex-1 bg-surface-2 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-primary'
                                        }`}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                />
                            </div>
                            {usagePercent}% · {labels.emailsRemaining}: {(stats.monthly_limit - stats.sent_this_month).toLocaleString()}
                        </div>
                    </div>

                    {/* Open Rate */}
                    <div className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <BarChart3 className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-medium text-text-secondary">{labels.openRate}</span>
                        </div>
                        <div className="text-3xl font-bold text-text-primary">
                            {stats.open_rate}%
                        </div>
                    </div>

                    {/* Bounce Rate */}
                    <div className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <Mail className="w-5 h-5 text-red-400" />
                            <span className="text-sm font-medium text-text-secondary">{labels.bounceRate}</span>
                        </div>
                        <div className="text-3xl font-bold text-text-primary">
                            {stats.bounce_rate}%
                        </div>
                    </div>
                </div>
            )}

            {/* Automations Tab */}
            {activeTab === 'automations' && (
                <div className="space-y-4">
                    {/* Abandoned Cart */}
                    <div className={`glass rounded-2xl p-6 ${!flags.enable_abandoned_cart_emails ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="w-5 h-5 text-orange-500" />
                                <div>
                                    <h3 className="font-bold text-text-primary">{labels.abandonedCart}</h3>
                                    <p className="text-xs text-text-muted">{labels.abandonedCartDesc}</p>
                                </div>
                            </div>
                            {flags.enable_abandoned_cart_emails ? (
                                <button
                                    onClick={() => setAutomationConfig(prev => ({
                                        ...prev,
                                        abandoned_cart_enabled: !prev.abandoned_cart_enabled,
                                    }))}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${automationConfig.abandoned_cart_enabled
                                        ? 'bg-green-50 border-green-300 text-green-700'
                                        : 'border-surface-3 text-text-secondary'
                                        }`}
                                >
                                    {automationConfig.abandoned_cart_enabled ? labels.enabled : labels.disabled}
                                </button>
                            ) : (
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> {labels.upgradeRequired}
                                </span>
                            )}
                        </div>
                        {flags.enable_abandoned_cart_emails && automationConfig.abandoned_cart_enabled && (
                            <div className="mt-4 pt-4 border-t border-surface-2">
                                <label className="text-sm font-medium text-text-secondary block mb-2">{labels.delay}</label>
                                <div className="flex gap-2">
                                    {ABANDONED_CART_DELAY_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setAutomationConfig(prev => ({
                                                ...prev,
                                                abandoned_cart_delay_hours: opt.value,
                                            }))}
                                            className={`px-3 py-2 rounded-xl text-sm border transition-all ${automationConfig.abandoned_cart_delay_hours === opt.value
                                                ? 'bg-primary text-white border-primary'
                                                : 'border-surface-3 text-text-secondary hover:bg-surface-1'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Review Requests */}
                    <div className={`glass rounded-2xl p-6 ${!flags.enable_abandoned_cart_emails ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Star className="w-5 h-5 text-yellow-500" />
                                <div>
                                    <h3 className="font-bold text-text-primary">{labels.reviewRequest}</h3>
                                    <p className="text-xs text-text-muted">{labels.reviewRequestDesc}</p>
                                </div>
                            </div>
                            {flags.enable_abandoned_cart_emails ? (
                                <button
                                    onClick={() => setAutomationConfig(prev => ({
                                        ...prev,
                                        review_request_enabled: !prev.review_request_enabled,
                                    }))}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${automationConfig.review_request_enabled
                                        ? 'bg-green-50 border-green-300 text-green-700'
                                        : 'border-surface-3 text-text-secondary'
                                        }`}
                                >
                                    {automationConfig.review_request_enabled ? labels.enabled : labels.disabled}
                                </button>
                            ) : (
                                <span className="text-xs text-text-muted flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> {labels.upgradeRequired}
                                </span>
                            )}
                        </div>
                        {flags.enable_abandoned_cart_emails && automationConfig.review_request_enabled && (
                            <div className="mt-4 pt-4 border-t border-surface-2">
                                <label className="text-sm font-medium text-text-secondary block mb-2">{labels.delay}</label>
                                <div className="flex gap-2">
                                    {REVIEW_REQUEST_DELAY_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setAutomationConfig(prev => ({
                                                ...prev,
                                                review_request_delay_days: opt.value,
                                            }))}
                                            className={`px-3 py-2 rounded-xl text-sm border transition-all ${automationConfig.review_request_delay_days === opt.value
                                                ? 'bg-primary text-white border-primary'
                                                : 'border-surface-3 text-text-secondary hover:bg-surface-1'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save button */}
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="btn btn-primary"
                    >
                        {isPending ? '...' : labels.save}
                    </button>
                </div>
            )}

            {/* Templates Tab (gated) */}
            {activeTab === 'templates' && (
                <div className="glass rounded-2xl p-12 text-center">
                    <Palette className="w-12 h-12 mx-auto text-text-muted mb-3" />
                    <p className="text-text-muted">Custom template editor — coming in Enterprise tier</p>
                </div>
            )}

            {/* Campaigns Tab (gated) */}
            {activeTab === 'campaigns' && (
                <div className="glass rounded-2xl p-12 text-center">
                    <Send className="w-12 h-12 mx-auto text-text-muted mb-3" />
                    <p className="text-text-muted">Campaign manager — coming in Enterprise tier</p>
                </div>
            )}
        </>
    )
}
