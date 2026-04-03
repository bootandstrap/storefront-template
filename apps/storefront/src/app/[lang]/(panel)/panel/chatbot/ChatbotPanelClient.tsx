'use client'

/**
 * ChatbotPanelClient — Owner Panel (SOTA rewrite)
 *
 * Features:
 * - PageEntrance animation
 * - StatCard for summary metrics (replaces inline cards)
 * - Animated settings toggles with motion indicator
 * - Animated chart with motion path drawing
 * - Loading skeleton instead of bare spinner
 */

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Coins, Save, Loader2, Bot, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

import { PageEntrance } from '@/components/panel/PanelAnimations'
import { PageSkeleton } from '@/components/panel/PanelSkeleton'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaMetric } from '@/components/panel/sota/SotaMetric'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'
import ModuleConfigSection, { type ConfigFieldDef } from '@/components/panel/ModuleConfigSection'

// ── Types ──────────────────────────────────────────────────
interface DailyStat {
    date: string
    total_messages: number
    total_tokens: number
    total_cost: number
}

interface ChatStats {
    daily: DailyStat[]
    summary: { messages: number; tokens: number; cost: number }
    activeModel: string
}

export interface ChatbotLabels {
    model: string
    messages: string
    cost: string
    today: string
    usageChart: string
    settings: string
    aiModel: string
    temperature: string
    welcomeMessage: string
    welcomePlaceholder: string
    modelNano: string
    modelMini: string
    tempPrecise: string
    tempBalanced: string
    tempNatural: string
    rateAnonymous: string
    rateRegistered: string
    ratePaying: string
}

const MODEL_DISPLAY: Record<string, string> = {
    'gpt-4.1-nano': 'GPT-4.1 Nano',
    'gpt-4.1-mini': 'GPT-4.1 Mini',
    'gpt-4.1': 'GPT-4.1',
}

// ── Component ──────────────────────────────────────────────
export function ChatbotPanelClient({ locale, labels, chatbotConfig }: { locale: string; labels: ChatbotLabels; chatbotConfig?: Record<string, unknown> }) {
    const configFields: ConfigFieldDef[] = [
        { key: 'chatbot_name', label: 'Bot name', type: 'text', placeholder: 'e.g. ShopBot' },
        { key: 'chatbot_tone', label: 'Tone', type: 'select', options: [
            { value: 'friendly', label: '🤗 Friendly' },
            { value: 'professional', label: '👔 Professional' },
            { value: 'casual', label: '😎 Casual' },
        ] },
        { key: 'chatbot_welcome_message', label: 'Welcome message', type: 'textarea', placeholder: 'Hi! How can I help you?' },
        { key: 'chatbot_auto_open_delay', label: 'Auto-open delay (seconds)', type: 'number', placeholder: '0 = disabled' },
        { key: 'chatbot_knowledge_scope', label: 'Knowledge scope', type: 'select', options: [
            { value: 'full_catalog', label: 'Full catalog' },
            { value: 'faq_only', label: 'FAQ only' },
            { value: 'support_only', label: 'Support only' },
        ] },
    ]
    const MODEL_OPTIONS = [
        { value: 'gpt-4.1-nano', label: labels.modelNano },
        { value: 'gpt-4.1-mini', label: labels.modelMini },
    ]
    const TEMPERATURE_OPTIONS = [
        { value: '0.3', label: labels.tempPrecise, sub: '0.3' },
        { value: '0.5', label: labels.tempBalanced, sub: '0.5' },
        { value: '0.7', label: labels.tempNatural, sub: '0.7' },
    ]
    const [stats, setStats] = useState<ChatStats | null>(null)
    const [settings, setSettings] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([
            fetch('/api/chat/stats').then(r => r.ok ? r.json() : null),
            fetch('/api/chat/settings').then(r => r.ok ? r.json() : null),
        ]).then(([statsData, settingsData]) => {
            if (statsData) setStats(statsData)
            if (settingsData?.settings) setSettings(settingsData.settings)
        }).finally(() => setLoading(false))
    }, [])

    const updateSetting = useCallback(async (key: string, value: string) => {
        setSaving(key)
        try {
            const res = await fetch('/api/chat/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value })
            })
            if (res.ok) {
                setSettings(prev => ({ ...prev, [key]: value }))
            }
        } catch {
            // silent fail
        } finally {
            setSaving(null)
        }
    }, [])

    if (loading) {
        return <PageSkeleton />
    }

    // Chart geometry
    const vbW = 800
    const vbH = 200
    const maxTokens = stats && stats.daily.length > 0
        ? Math.max(...stats.daily.map(d => d.total_tokens), 100)
        : 100
    const paddedDaily = stats?.daily.length
        ? stats.daily
        : Array(7).fill({ total_tokens: 0, date: new Date().toISOString() })

    const points = paddedDaily.map((d, i) => ({
        x: (i / Math.max(paddedDaily.length - 1, 1)) * vbW,
        y: vbH - (d.total_tokens / (maxTokens * 1.1)) * vbH,
    }))

    const makePath = (pts: { x: number; y: number }[]) => {
        if (pts.length === 0) return ''
        let d = `M ${pts[0].x},${pts[0].y} `
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1]
            const p = pts[i]
            const cp1x = prev.x + (p.x - prev.x) / 3
            const cp2x = p.x - (p.x - prev.x) / 3
            d += `C ${cp1x},${prev.y} ${cp2x},${p.y} ${p.x},${p.y} `
        }
        return d
    }

    const pathD = makePath(points)
    const areaD = `${pathD} L ${vbW},${vbH} L 0,${vbH} Z`

    return (
        <PageEntrance className="space-y-6">


            {/* Summary Stats — StatCard */}
            <SotaBentoGrid>
                <SotaBentoItem colSpan={3}>
                    <SotaMetric
                        label={labels.model}
                        value={MODEL_DISPLAY[stats?.activeModel || ''] || stats?.activeModel || '—'}
                        icon={<Bot className="w-4 h-4" />}
                    />
                </SotaBentoItem>
                <SotaBentoItem colSpan={3}>
                    <SotaMetric
                        label={labels.messages}
                        value={(stats?.summary.messages ?? 0).toLocaleString()}
                        icon={<MessageSquare className="w-4 h-4" />}
                    />
                </SotaBentoItem>
                <SotaBentoItem colSpan={3}>
                    <SotaMetric
                        label="Tokens"
                        value={
                            (stats?.summary.tokens ?? 0) > 1000
                                ? `${((stats?.summary.tokens ?? 0) / 1000).toFixed(1)}k`
                                : String(stats?.summary.tokens ?? 0)
                        }
                        icon={<TrendingUp className="w-4 h-4" />}
                    />
                </SotaBentoItem>
                <SotaBentoItem colSpan={3}>
                    <SotaMetric
                        label={labels.cost}
                        value={`$${(stats?.summary.cost ?? 0).toFixed(4)}`}
                        icon={<Coins className="w-4 h-4" />}
                    />
                </SotaBentoItem>
            </SotaBentoGrid>

            {/* Usage Chart */}
            <SotaBentoGrid>
                <SotaBentoItem colSpan={12}>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <SotaGlassCard glowColor="none" className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-sm font-semibold text-tx">
                            {labels.usageChart}
                        </h3>
                        <p className="text-xs text-tx-muted mt-0.5">
                            {labels.today}
                        </p>
                    </div>
                    <span className="text-xs font-mono text-tx-muted">
                        {maxTokens.toLocaleString()} max
                    </span>
                </div>

                <div className="relative w-full" style={{ aspectRatio: '4/1' }}>
                    {/* Horizontal grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="w-full border-t border-sf-2" />
                        ))}
                    </div>

                    <svg
                        viewBox={`0 0 ${vbW} ${vbH}`}
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full"
                    >
                        <defs>
                            <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.12" />
                                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <motion.path
                            d={areaD}
                            fill="url(#area-fill)"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                        />
                        <motion.path
                            d={pathD}
                            fill="none"
                            stroke="var(--color-primary)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
                        />
                        {points.map((p, i) => (
                            <g key={i} className="group cursor-default">
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="4"
                                    className="fill-surface-0 stroke-primary stroke-[2]"
                                />
                                <foreignObject
                                    x={p.x - 40}
                                    y={p.y - 36}
                                    width="80"
                                    height="28"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none overflow-visible"
                                >
                                    <div className="flex justify-center">
                                        <div className="bg-text-brand text-sf-0 text-[9px] font-semibold px-2 py-0.5 rounded whitespace-nowrap">
                                            {paddedDaily[i]?.total_tokens.toLocaleString()} tokens
                                        </div>
                                    </div>
                                </foreignObject>
                            </g>
                        ))}
                    </svg>
                </div>

                {/* X-axis */}
                <div className="mt-3 flex justify-between text-[10px] text-tx-muted">
                    <span>
                        {paddedDaily[0]?.date
                            ? new Date(paddedDaily[0].date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                            : ''}
                    </span>
                    <span>
                        {new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                    </span>
                </div>
                </SotaGlassCard>
            </motion.div>
                </SotaBentoItem>

            {/* Settings */}
                <SotaBentoItem colSpan={12}>
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <SotaGlassCard glowColor="none" className="p-6">
                <h3 className="text-sm font-semibold text-tx mb-6">
                    {labels.settings}
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: AI Model + Temperature toggles */}
                    <div className="space-y-6">
                        {/* Model toggle */}
                        <div>
                            <label className="block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-3">
                                {labels.aiModel}
                            </label>
                            <SotaGlassCard glowColor="none" className="inline-flex p-1">
                                {MODEL_OPTIONS.map(o => (
                                    <button
                                        key={o.value}
                                        onClick={() => updateSetting('model', o.value)}
                                        disabled={saving === 'model'}
                                        className={`relative px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${
                                            settings.model === o.value
                                                ? 'text-brand'
                                                : 'text-tx-muted hover:text-tx-sec'
                                        }`}
                                    >
                                        {settings.model === o.value && (
                                            <motion.div
                                                layoutId="model-indicator"
                                                className="absolute inset-0 bg-white dark:bg-sf-2 rounded-lg shadow-sm"
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center gap-1.5">
                                            {o.label}
                                            {saving === 'model' && settings.model === o.value && (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            )}
                                        </span>
                                    </button>
                                ))}
                            </SotaGlassCard>
                        </div>

                        {/* Temperature toggle */}
                        <div>
                            <label className="block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-3">
                                {labels.temperature}
                            </label>
                            <SotaGlassCard glowColor="none" className="inline-flex p-1">
                                {TEMPERATURE_OPTIONS.map(o => (
                                    <button
                                        key={o.value}
                                        onClick={() => updateSetting('temperature', o.value)}
                                        disabled={saving === 'temperature'}
                                        className={`relative px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all flex flex-col items-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med ${
                                            settings.temperature === o.value
                                                ? 'text-brand'
                                                : 'text-tx-muted hover:text-tx-sec'
                                        }`}
                                    >
                                        {settings.temperature === o.value && (
                                            <motion.div
                                                layoutId="temp-indicator"
                                                className="absolute inset-0 bg-white dark:bg-sf-2 rounded-lg shadow-sm"
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10">{o.label}</span>
                                        <span className="relative z-10 text-[10px] opacity-60">{o.sub}</span>
                                    </button>
                                ))}
                            </SotaGlassCard>
                        </div>

                        {/* Rate limits */}
                        <div>
                            <label className="block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-3">
                                Mensajes / día
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { key: 'anonymous_message_limit', label: labels.rateAnonymous, default: '5' },
                                    { key: 'registered_message_limit', label: labels.rateRegistered, default: '10' },
                                    { key: 'paying_message_limit', label: labels.ratePaying, default: '1000' },
                                ].map(({ key, label, default: def }) => (
                                    <SotaGlassCard
                                        glowColor="none"
                                        key={key}
                                        className="p-3 focus-within:ring-2 focus-within:ring-soft transition-all ring-0"
                                    >
                                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-tx-muted mb-1">
                                            {label}
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                value={settings[key] || def}
                                                onChange={e =>
                                                    setSettings(prev => ({ ...prev, [key]: e.target.value }))
                                                }
                                                className="w-full bg-transparent text-base font-semibold text-tx outline-none appearance-none min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soft rounded-lg"
                                            />
                                            <button
                                                onClick={() => updateSetting(key, settings[key] || def)}
                                                disabled={saving === key}
                                                className="w-7 h-7 min-h-[28px] rounded-lg flex items-center justify-center text-tx-muted hover:text-brand transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                            >
                                                {saving === key
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <Save className="w-3 h-3" />
                                                }
                                            </button>
                                        </div>
                                    </SotaGlassCard>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Welcome message */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-xs font-semibold text-tx-muted uppercase tracking-wide">
                                {labels.welcomeMessage}
                            </label>
                            <span className="text-[10px] text-tx-muted uppercase tracking-wide">
                                {locale.toUpperCase()}
                            </span>
                        </div>
                        <div className="relative">
                            <SotaGlassCard glowColor="none" className="p-0">
                            <textarea
                                value={settings[`welcome_message_${locale}`] || ''}
                                onChange={e =>
                                    setSettings(prev => ({
                                        ...prev,
                                        [`welcome_message_${locale}`]: e.target.value,
                                    }))
                                }
                                placeholder={labels.welcomePlaceholder}
                                rows={5}
                                className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-transparent text-tx text-sm focus:ring-2 focus:ring-soft transition-all outline-none resize-none"
                            />
                            </SotaGlassCard>
                            <button
                                onClick={() =>
                                    updateSetting(
                                        `welcome_message_${locale}`,
                                        settings[`welcome_message_${locale}`] || ''
                                    )
                                }
                                disabled={saving === `welcome_message_${locale}`}
                                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-light transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                            >
                                {saving === `welcome_message_${locale}`
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Save className="w-3 h-3" />
                                }
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
                </SotaGlassCard>
            </motion.div>
                </SotaBentoItem>
            {/* Module Config Section */}
            {chatbotConfig && (
                <SotaBentoItem colSpan={12}>
                <ModuleConfigSection
                    fields={configFields}
                    initialValues={chatbotConfig}
                    title="Chatbot Configuration"
                    collapsible
                />
                </SotaBentoItem>
            )}
            </SotaBentoGrid>
        </PageEntrance>
    )
}
