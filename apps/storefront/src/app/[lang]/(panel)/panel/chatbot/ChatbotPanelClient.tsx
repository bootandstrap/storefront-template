'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, TrendingUp, Cpu, Coins, Save, Loader2 } from 'lucide-react'

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

interface Setting {
    key: string
    value: string
    description?: string
}

const MODEL_OPTIONS = [
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano — Rápido y económico' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini — Mejor balance' },
]

const TEMPERATURE_OPTIONS = [
    { value: '0.3', label: 'Preciso (0.3)' },
    { value: '0.5', label: 'Equilibrado (0.5)' },
    { value: '0.7', label: 'Natural (0.7)' },
]

const MODEL_DISPLAY: Record<string, string> = {
    'gpt-4.1-nano': 'GPT-4.1 Nano',
    'gpt-4.1-mini': 'GPT-4.1 Mini',
    'gpt-4.1': 'GPT-4.1',
}

// ── Component ──────────────────────────────────────────────
export function ChatbotPanelClient({ locale }: { locale: string }) {
    const [stats, setStats] = useState<ChatStats | null>(null)
    const [settings, setSettings] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)

    // Fetch stats + settings
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
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    const maxTokens = stats ? Math.max(...stats.daily.map(d => d.total_tokens), 100) : 100

    return (
        <div className="space-y-6">
            {/* ── Usage Stats ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-3 text-primary mb-2">
                        <Cpu className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Modelo</span>
                    </div>
                    <p className="text-lg font-bold text-text-primary truncate">
                        {MODEL_DISPLAY[stats?.activeModel || ''] || stats?.activeModel || '—'}
                    </p>
                </div>

                <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-3 text-text-secondary mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Mensajes</span>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">{stats?.summary.messages ?? 0}</p>
                </div>

                <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-3 text-text-secondary mb-2">
                        <Cpu className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Tokens</span>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">
                        {(stats?.summary.tokens ?? 0) > 1000
                            ? `${((stats?.summary.tokens ?? 0) / 1000).toFixed(1)}k`
                            : stats?.summary.tokens ?? 0}
                    </p>
                </div>

                <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-3 text-text-secondary mb-2">
                        <Coins className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Coste</span>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">
                        ${(stats?.summary.cost ?? 0).toFixed(4)}
                    </p>
                </div>
            </div>

            {/* ── Usage Chart ──────────────────────────────────────── */}
            {stats && stats.daily.length > 0 && (
                <div className="glass rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-text-primary mb-6 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Uso de Tokens (Últimos 30 días)
                    </h3>

                    <div className="h-40 flex items-end gap-1 px-2">
                        {stats.daily.map(day => {
                            const height = (day.total_tokens / maxTokens) * 100
                            return (
                                <div key={day.date} className="flex-1 group relative" style={{ height: '100%' }}>
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-primary/20 group-hover:bg-primary/40 transition-all rounded-t-sm"
                                        style={{ height: `${height}%`, minHeight: '4px' }}
                                    />
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-text-primary text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                                        {new Date(day.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}: {day.total_tokens} tokens
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-2 border-t border-surface-2 pt-2 flex justify-between text-[10px] text-text-muted font-bold uppercase tracking-widest">
                        <span>{stats.daily[0]?.date ? new Date(stats.daily[0].date).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''}</span>
                        <span>Hoy</span>
                    </div>
                </div>
            )}

            {/* ── Settings ──────────────────────────────────────── */}
            <div className="glass rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                    Configuración del Chatbot
                </h3>

                {/* Model */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Modelo IA</label>
                    <div className="flex gap-2">
                        <select
                            value={settings.model || 'gpt-4.1-nano'}
                            onChange={e => updateSetting('model', e.target.value)}
                            disabled={saving === 'model'}
                            className="flex-1 text-sm px-3 py-2 rounded-xl border border-surface-2 bg-surface-0 text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
                        >
                            {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {saving === 'model' && <Loader2 className="w-5 h-5 animate-spin text-primary self-center" />}
                    </div>
                </div>

                {/* Temperature */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Temperatura</label>
                    <select
                        value={settings.temperature || '0.7'}
                        onChange={e => updateSetting('temperature', e.target.value)}
                        disabled={saving === 'temperature'}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-surface-2 bg-surface-0 text-text-primary focus:border-primary focus:outline-none disabled:opacity-50"
                    >
                        {TEMPERATURE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                {/* Welcome Message */}
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                        Mensaje de Bienvenida ({locale.toUpperCase()})
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={settings[`welcome_message_${locale}`] || ''}
                            onChange={e => setSettings(prev => ({ ...prev, [`welcome_message_${locale}`]: e.target.value }))}
                            placeholder="¡Hola! ¿En qué puedo ayudarte?"
                            className="flex-1 text-sm px-3 py-2 rounded-xl border border-surface-2 bg-surface-0 text-text-primary focus:border-primary focus:outline-none"
                        />
                        <button
                            onClick={() => updateSetting(`welcome_message_${locale}`, settings[`welcome_message_${locale}`] || '')}
                            disabled={saving === `welcome_message_${locale}`}
                            className="px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                        >
                            {saving === `welcome_message_${locale}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Rate Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { key: 'anonymous_message_limit', label: 'Anónimos', default: '5' },
                        { key: 'registered_message_limit', label: 'Registrados', default: '10' },
                        { key: 'paying_message_limit', label: 'De pago', default: '1000' },
                    ].map(({ key, label, default: def }) => (
                        <div key={key}>
                            <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
                            <div className="flex gap-1">
                                <input
                                    type="number"
                                    value={settings[key] || def}
                                    onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                                    className="flex-1 text-sm px-3 py-2 rounded-xl border border-surface-2 bg-surface-0 text-text-primary focus:border-primary focus:outline-none w-full"
                                />
                                <button
                                    onClick={() => updateSetting(key, settings[key] || def)}
                                    disabled={saving === key}
                                    className="px-2 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {saving === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
