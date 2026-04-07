'use client'

/**
 * AutomationsClient — Multi-channel notification management
 *
 * 3-tab interface:
 *   1. Channels: Configure Webhook, WhatsApp, Telegram, Email
 *   2. Events: Matrix mapping events → active channels
 *   3. Log: Placeholder for future notification log viewer
 *
 * All config persists via server actions to Supabase config table.
 */

import { useState, useTransition, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Zap, XCircle, RotateCcw, Truck,
    Webhook, MessageCircle, Send, Mail,
    Settings, Save, Loader2, Check, ChevronDown, ChevronUp,
    Bell, Activity, CheckCircle2,
} from 'lucide-react'
import { NOTIFICATION_EVENTS, NOTIFICATION_CHANNELS, type ChannelKey } from '@/lib/registries/notification-events'
import {
    saveNotificationChannelsAction,
    saveNotificationEventsAction,
    testNotificationChannelAction,
} from '../actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelConfigs {
    webhook: { enabled: boolean; url: string; secret: string }
    whatsapp: { enabled: boolean; phone_number_id: string; token: string; recipient: string }
    telegram: { enabled: boolean; bot_token: string; chat_id: string }
    email: { enabled: boolean }
}

interface AutomationsClientProps {
    channels: ChannelConfigs
    events: Record<string, string[]>
    labels: {
        tabChannels: string
        tabEvents: string
        tabLog: string
        saveSuccess: string
        saveError: string
    }
    lang: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Icon map for resolving icon keys from registry
const ICON_MAP: Record<string, typeof Zap> = {
    Zap, XCircle, RotateCcw, Truck,
    Webhook, MessageCircle, Send, Mail,
}

const EVENTS = NOTIFICATION_EVENTS.map(e => ({
    ...e,
    icon: ICON_MAP[e.iconKey] ?? Zap,
}))

const CHANNEL_META = Object.fromEntries(
    Object.entries(NOTIFICATION_CHANNELS).map(([key, meta]) => [
        key,
        { ...meta, icon: ICON_MAP[meta.iconKey] ?? Webhook },
    ])
) as Record<ChannelKey, typeof NOTIFICATION_CHANNELS[ChannelKey] & { icon: typeof Zap }>

type TabId = 'channels' | 'events' | 'log'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AutomationsClient({ channels: initialChannels, events: initialEvents, labels, lang }: AutomationsClientProps) {
    const [tab, setTab] = useState<TabId>('channels')
    const [channels, setChannels] = useState<ChannelConfigs>(initialChannels)
    const [events, setEvents] = useState<Record<string, string[]>>(initialEvents)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({})

    const showToast = useCallback((type: 'success' | 'error', msg: string) => {
        setToast({ type, msg })
        setTimeout(() => setToast(null), 3000)
    }, [])

    // ── Channel toggle ──
    function toggleChannel(ch: keyof ChannelConfigs) {
        if (ch === 'email') return // Email is always on
        const next = { ...channels, [ch]: { ...channels[ch], enabled: !channels[ch].enabled } }
        setChannels(next)
        startTransition(async () => {
            const r = await saveNotificationChannelsAction(next)
            showToast(r.success ? 'success' : 'error', r.success ? labels.saveSuccess : (r.error ?? labels.saveError))
        })
    }

    // ── Channel field update ──
    function updateField(ch: keyof ChannelConfigs, field: string, value: string) {
        setChannels(prev => ({
            ...prev,
            [ch]: { ...prev[ch], [field]: value },
        }))
    }

    // ── Save channel config (on blur) ──
    function saveChannel(ch: keyof ChannelConfigs) {
        startTransition(async () => {
            const r = await saveNotificationChannelsAction(channels)
            if (!r.success) showToast('error', r.error ?? labels.saveError)
        })
    }

    // ── Test channel ──
    function testChannel(ch: 'webhook' | 'whatsapp' | 'telegram') {
        setTestResult(prev => ({ ...prev, [ch]: { ok: false, msg: 'Enviando...' } }))
        startTransition(async () => {
            // Extract only string fields for the test action
            const raw = channels[ch] as Record<string, unknown>
            const config: Record<string, string> = {}
            for (const [k, v] of Object.entries(raw)) {
                if (typeof v === 'string') config[k] = v
            }
            const r = await testNotificationChannelAction(ch, config)
            setTestResult(prev => ({
                ...prev,
                [ch]: { ok: r.success, msg: r.success ? '✅ Enviado correctamente' : `❌ ${r.error ?? 'Error desconocido'}` },
            }))
        })
    }

    // ── Event toggle ──
    function toggleEventChannel(eventKey: string, channel: string) {
        const current = events[eventKey] ?? []
        const next = current.includes(channel)
            ? current.filter(c => c !== channel)
            : [...current, channel]
        const updated = { ...events, [eventKey]: next }
        setEvents(updated)
        startTransition(async () => {
            const r = await saveNotificationEventsAction(updated)
            showToast(r.success ? 'success' : 'error', r.success ? labels.saveSuccess : (r.error ?? labels.saveError))
        })
    }

    // ── Tab header ──
    const tabs: { id: TabId; label: string; icon: typeof Zap }[] = [
        { id: 'channels', label: labels.tabChannels, icon: Settings },
        { id: 'events', label: labels.tabEvents, icon: Bell },
        { id: 'log', label: labels.tabLog, icon: Activity },
    ]

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${
                    toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 p-1 rounded-xl bg-sf-1 border border-sf-3">
                {tabs.map(t => {
                    const Icon = t.icon
                    const active = tab === t.id
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                active
                                    ? 'bg-brand text-white shadow-sm'
                                    : 'text-tx-sec hover:text-tx hover:bg-sf-2'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab content */}
            {tab === 'channels' && (
                <div className="grid gap-4">
                    {(Object.keys(CHANNEL_META) as (keyof typeof CHANNEL_META)[]).map(ch => {
                        const meta = CHANNEL_META[ch]
                        const Icon = meta.icon
                        const isEnabled = channels[ch]?.enabled ?? false
                        const isExpanded = expanded === ch
                        const isEmail = ch === 'email'

                        return (
                            <div
                                key={ch}
                                className={`rounded-2xl border transition-all ${
                                    isEnabled ? 'border-brand/30 bg-brand-subtle/20' : 'border-sf-3 bg-sf-0'
                                }`}
                            >
                                {/* Card header */}
                                <div className="flex items-center gap-4 p-5">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-sm`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-tx">{meta.label}</h3>
                                            {isEnabled && (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                    Activo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-tx-muted mt-0.5">{meta.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Toggle */}
                                        <button
                                            onClick={() => toggleChannel(ch)}
                                            disabled={isEmail || isPending}
                                            className={`relative w-12 h-7 rounded-full transition-colors ${
                                                isEnabled ? 'bg-brand' : 'bg-sf-3'
                                            } ${isEmail ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            aria-label={`Toggle ${meta.label}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                                                isEnabled ? 'translate-x-5' : ''
                                            }`} />
                                        </button>
                                        {/* Expand (not for email) */}
                                        {!isEmail && (
                                            <button
                                                onClick={() => setExpanded(isExpanded ? null : ch)}
                                                className="p-1.5 rounded-lg hover:bg-sf-1 text-tx-muted"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded config */}
                                {isExpanded && !isEmail && (
                                    <div className="border-t border-sf-3 px-5 py-4 space-y-4 animate-slide-up">
                                        {ch === 'webhook' && (
                                            <>
                                                <Field label="URL" value={channels.webhook.url} placeholder="https://hooks.example.com/notify" onChange={v => updateField('webhook', 'url', v)} onBlur={() => saveChannel('webhook')} />
                                                <Field label="Secret (HMAC)" value={channels.webhook.secret} placeholder="whsec_..." onChange={v => updateField('webhook', 'secret', v)} onBlur={() => saveChannel('webhook')} type="password" />
                                            </>
                                        )}
                                        {ch === 'whatsapp' && (
                                            <>
                                                <Field label="Phone Number ID" value={channels.whatsapp.phone_number_id} placeholder="15551234567" onChange={v => updateField('whatsapp', 'phone_number_id', v)} onBlur={() => saveChannel('whatsapp')} />
                                                <Field label="Access Token" value={channels.whatsapp.token} placeholder="EAAx..." onChange={v => updateField('whatsapp', 'token', v)} onBlur={() => saveChannel('whatsapp')} type="password" />
                                                <Field label="Número destinatario" value={channels.whatsapp.recipient} placeholder="+41791234567" onChange={v => updateField('whatsapp', 'recipient', v)} onBlur={() => saveChannel('whatsapp')} />
                                            </>
                                        )}
                                        {ch === 'telegram' && (
                                            <>
                                                <Field label="Bot Token" value={channels.telegram.bot_token} placeholder="123456:ABC-DEF..." onChange={v => updateField('telegram', 'bot_token', v)} onBlur={() => saveChannel('telegram')} type="password" />
                                                <Field label="Chat ID" value={channels.telegram.chat_id} placeholder="-100123456789" onChange={v => updateField('telegram', 'chat_id', v)} onBlur={() => saveChannel('telegram')} />
                                            </>
                                        )}

                                        {/* Test button */}
                                        <div className="flex items-center gap-3 pt-2">
                                            <button
                                                onClick={() => testChannel(ch as 'webhook' | 'whatsapp' | 'telegram')}
                                                disabled={isPending}
                                                className="btn btn-secondary text-sm flex items-center gap-2"
                                            >
                                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                Enviar prueba
                                            </button>
                                            {testResult[ch] && (
                                                <span className={`text-sm ${testResult[ch].ok ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {testResult[ch].msg}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {tab === 'events' && (
                <div className="rounded-2xl border border-sf-3 overflow-hidden">
                    {/* Matrix header */}
                    <div className="grid grid-cols-[1fr_repeat(4,_80px)] bg-sf-1 border-b border-sf-3">
                        <div className="px-5 py-3 text-sm font-semibold text-tx-sec">Evento</div>
                        {(Object.keys(CHANNEL_META) as (keyof typeof CHANNEL_META)[]).map(ch => {
                            const meta = CHANNEL_META[ch]
                            const Icon = meta.icon
                            return (
                                <div key={ch} className="flex flex-col items-center justify-center py-3 text-xs text-tx-sec">
                                    <Icon className="w-4 h-4 mb-1" />
                                    {meta.label}
                                </div>
                            )
                        })}
                    </div>

                    {/* Event rows */}
                    {EVENTS.map(ev => {
                        const Icon = ev.icon
                        const activeChannels = events[ev.key] ?? []
                        return (
                            <div key={ev.key} className="grid grid-cols-[1fr_repeat(4,_80px)] border-b border-sf-3 last:border-b-0 hover:bg-sf-1/50 transition-colors">
                                <div className="flex items-center gap-3 px-5 py-4">
                                    <Icon className={`w-5 h-5 ${ev.color}`} />
                                    <span className="text-sm font-medium text-tx">{ev.label}</span>
                                </div>
                                {(Object.keys(CHANNEL_META) as (keyof typeof CHANNEL_META)[]).map(ch => {
                                    const isActive = activeChannels.includes(ch)
                                    const isChannelEnabled = channels[ch]?.enabled ?? false
                                    return (
                                        <div key={ch} className="flex items-center justify-center">
                                            <button
                                                onClick={() => toggleEventChannel(ev.key, ch)}
                                                disabled={!isChannelEnabled || isPending}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                                    isActive
                                                        ? 'bg-brand text-white shadow-sm'
                                                        : isChannelEnabled
                                                            ? 'bg-sf-2 text-tx-muted hover:bg-sf-3'
                                                            : 'bg-sf-1 text-tx-muted/30 cursor-not-allowed'
                                                }`}
                                            >
                                                {isActive ? (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                ) : (
                                                    <span className="w-2 h-2 rounded-full bg-current" />
                                                )}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            )}

            {tab === 'log' && (
                <div className="rounded-2xl border border-sf-3 p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-sf-1 flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-tx-muted" />
                    </div>
                    <h3 className="text-lg font-semibold text-tx mb-2">Log de notificaciones</h3>
                    <p className="text-sm text-tx-muted max-w-md mx-auto">
                        Los logs de notificaciones se registran en el servidor Medusa.
                        Pronto podrás visualizar el historial de envíos directamente desde aquí.
                    </p>
                    <div className="inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                        <Activity className="w-3 h-3" />
                        Disponible próximamente
                    </div>
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Reusable field component
// ---------------------------------------------------------------------------

function Field({
    label, value, placeholder, onChange, onBlur, type = 'text',
}: {
    label: string
    value: string
    placeholder: string
    onChange: (v: string) => void
    onBlur: () => void
    type?: string
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-tx-sec mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                className="w-full px-4 py-2.5 rounded-xl bg-sf-1 border border-sf-3 text-sm text-tx placeholder:text-tx-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-soft transition-all"
            />
        </div>
    )
}
