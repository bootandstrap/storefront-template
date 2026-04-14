'use client'

import { useState, useCallback, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────
interface DnsRecord {
    record: string
    name: string
    value: string
    type: string
    status: string
    ttl: string
    priority?: number
}

interface DomainConfig {
    enabled: boolean
    domain: string | null
    status: 'none' | 'pending' | 'verified' | 'failed'
    domainId?: string
    records: DnsRecord[]
    message?: string
    upsell?: {
        module: string
        tier: string
        price_chf: number
    }
}

// ── Translations ──────────────────────────────────────────
const t: Record<string, Record<string, string>> = {
    es: {
        title: 'Dominio de Email Personalizado',
        subtitle: 'Envía emails desde tu propio dominio',
        currentSender: 'Remitente actual',
        addDomain: 'Añadir dominio',
        domainPlaceholder: 'campifruit.co',
        addButton: 'Registrar dominio',
        removing: 'Eliminando...',
        verifyButton: 'Verificar DNS',
        verifying: 'Verificando...',
        removeButton: 'Eliminar dominio',
        dnsRecords: 'Registros DNS necesarios',
        dnsInstructions: 'Añade estos registros en tu proveedor de DNS (Cloudflare, Namecheap, etc.)',
        type: 'Tipo',
        name: 'Host / Nombre',
        value: 'Valor',
        priority: 'Prioridad',
        recordStatus: 'Estado',
        statusVerified: '✅ Verificado',
        statusPending: '⏳ Pendiente',
        statusFailed: '❌ Fallido',
        statusNone: 'Sin configurar',
        copied: '¡Copiado!',
        copy: 'Copiar',
        defaultFrom: 'Tu Tienda <noreply@bootandstrap.com>',
        customFrom: 'Tu Tienda <noreply@{domain}>',
        upsellTitle: 'Dominio personalizado',
        upsellDesc: 'Envía emails desde tu propio dominio. Disponible en el plan Enterprise de Email Marketing.',
        upsellPrice: '{price} CHF/mes',
        upsellButton: 'Contratar Enterprise',
        successMsg: 'Dominio registrado correctamente',
        errorMsg: 'Error al registrar el dominio',
        verifySuccess: 'Dominio verificado correctamente',
        verifyPending: 'DNS aún no propagado. Inténtalo en unos minutos.',
        deleteSuccess: 'Dominio eliminado correctamente',
    },
    en: {
        title: 'Custom Email Domain',
        subtitle: 'Send emails from your own domain',
        currentSender: 'Current sender',
        addDomain: 'Add domain',
        domainPlaceholder: 'campifruit.co',
        addButton: 'Register domain',
        removing: 'Removing...',
        verifyButton: 'Verify DNS',
        verifying: 'Verifying...',
        removeButton: 'Remove domain',
        dnsRecords: 'Required DNS Records',
        dnsInstructions: 'Add these records in your DNS provider (Cloudflare, Namecheap, etc.)',
        type: 'Type',
        name: 'Host / Name',
        value: 'Value',
        priority: 'Priority',
        recordStatus: 'Status',
        statusVerified: '✅ Verified',
        statusPending: '⏳ Pending',
        statusFailed: '❌ Failed',
        statusNone: 'Not configured',
        copied: 'Copied!',
        copy: 'Copy',
        defaultFrom: 'Your Store <noreply@bootandstrap.com>',
        customFrom: 'Your Store <noreply@{domain}>',
        upsellTitle: 'Custom Domain',
        upsellDesc: 'Send emails from your own domain. Available on Enterprise Email Marketing plan.',
        upsellPrice: '{price} CHF/month',
        upsellButton: 'Upgrade to Enterprise',
        successMsg: 'Domain registered successfully',
        errorMsg: 'Failed to register domain',
        verifySuccess: 'Domain verified successfully',
        verifyPending: 'DNS not yet propagated. Try again in a few minutes.',
        deleteSuccess: 'Domain removed successfully',
    },
}

// ── Component ──────────────────────────────────────────────
export default function EmailDomainClient({ lang }: { lang: string }) {
    const s = t[lang] || t.en

    const [config, setConfig] = useState<DomainConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [domain, setDomain] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [removing, setRemoving] = useState(false)
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

    // ── Fetch current config ──
    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/panel/email-domain')
            if (res.ok) {
                setConfig(await res.json())
            }
        } catch (e) {
            console.error('Failed to load email domain config:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchConfig()
    }, [fetchConfig])

    // ── Add domain ──
    const handleAdd = async () => {
        if (!domain.trim()) return
        setSubmitting(true)
        try {
            const res = await fetch('/api/panel/email-domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: domain.trim() }),
            })
            const data = await res.json()
            if (res.ok) {
                setToast({ msg: s.successMsg, type: 'ok' })
                setDomain('')
                await fetchConfig()
            } else {
                setToast({ msg: data.error || s.errorMsg, type: 'err' })
            }
        } finally {
            setSubmitting(false)
        }
    }

    // ── Verify domain ──
    const handleVerify = async () => {
        setVerifying(true)
        try {
            const res = await fetch('/api/panel/email-domain/verify', { method: 'POST' })
            const data = await res.json()
            if (data.status === 'verified') {
                setToast({ msg: s.verifySuccess, type: 'ok' })
            } else {
                setToast({ msg: s.verifyPending, type: 'err' })
            }
            await fetchConfig()
        } finally {
            setVerifying(false)
        }
    }

    // ── Remove domain ──
    const handleRemove = async () => {
        setRemoving(true)
        try {
            const res = await fetch('/api/panel/email-domain', { method: 'DELETE' })
            if (res.ok) {
                setToast({ msg: s.deleteSuccess, type: 'ok' })
                await fetchConfig()
            }
        } finally {
            setRemoving(false)
        }
    }

    // ── Copy to clipboard ──
    const copyValue = (value: string, idx: number) => {
        navigator.clipboard.writeText(value)
        setCopiedIdx(idx)
        setTimeout(() => setCopiedIdx(null), 1500)
    }

    // ── Auto-hide toast ──
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    if (loading) {
        return <div className="animate-pulse space-y-4 p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
    }

    if (!config) return null

    // ── Upsell card (feature not enabled) ──
    if (!config.enabled) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <h2 className="text-xl font-bold mb-2">{s.title}</h2>
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl p-8 border border-rose-200 dark:border-rose-800/40">
                    <div className="text-4xl mb-4">📧</div>
                    <h3 className="text-lg font-semibold mb-2">{s.upsellTitle}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{s.upsellDesc}</p>
                    <p className="text-2xl font-bold text-rose-600 mb-4">
                        {s.upsellPrice.replace('{price}', String(config.upsell?.price_chf || 50))}
                    </p>
                    <button
                        onClick={() => window.location.href = `/${lang}/panel/modulos`}
                        className="px-6 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-700 transition-colors"
                    >
                        {s.upsellButton}
                    </button>
                </div>
            </div>
        )
    }

    const statusBadge = (st: string) => {
        switch (st) {
            case 'verified': return <span className="text-green-600 font-medium">{s.statusVerified}</span>
            case 'pending': return <span className="text-amber-600 font-medium">{s.statusPending}</span>
            case 'failed': return <span className="text-red-600 font-medium">{s.statusFailed}</span>
            default: return <span className="text-gray-500">{s.statusNone}</span>
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-white font-medium transition-all
                    ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.msg}
                </div>
            )}

            <div>
                <h2 className="text-xl font-bold">{s.title}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{s.subtitle}</p>
            </div>

            {/* Current sender */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 mb-1">{s.currentSender}</p>
                <p className="font-mono text-sm bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded-lg">
                    {config.domain && config.status === 'verified'
                        ? s.customFrom.replace('{domain}', config.domain)
                        : s.defaultFrom}
                </p>
            </div>

            {/* No domain configured — show add form */}
            {!config.domain && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">{s.addDomain}</h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={domain}
                            onChange={e => setDomain(e.target.value)}
                            placeholder={s.domainPlaceholder}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                       bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={submitting || !domain.trim()}
                            className="px-5 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700
                                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                            {submitting ? '...' : s.addButton}
                        </button>
                    </div>
                </div>
            )}

            {/* Domain configured — show status + DNS records */}
            {config.domain && (
                <>
                    {/* Status card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-lg">{config.domain}</p>
                                <div className="mt-1">{statusBadge(config.status)}</div>
                            </div>
                            <div className="flex gap-2">
                                {config.status !== 'verified' && (
                                    <button
                                        onClick={handleVerify}
                                        disabled={verifying}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                                                   hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {verifying ? s.verifying : s.verifyButton}
                                    </button>
                                )}
                                <button
                                    onClick={handleRemove}
                                    disabled={removing}
                                    className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400
                                               rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/40
                                               disabled:opacity-50 transition-colors"
                                >
                                    {removing ? s.removing : s.removeButton}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* DNS Records table */}
                    {config.records.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold mb-2">{s.dnsRecords}</h3>
                            <p className="text-sm text-gray-500 mb-4">{s.dnsInstructions}</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-2 px-2 font-medium">{s.type}</th>
                                            <th className="text-left py-2 px-2 font-medium">{s.name}</th>
                                            <th className="text-left py-2 px-2 font-medium">{s.value}</th>
                                            <th className="text-left py-2 px-2 font-medium">{s.recordStatus}</th>
                                            <th className="py-2 px-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {config.records
                                            .filter(r => r.record !== 'Receiving') // Don't show inbound MX
                                            .map((record, idx) => (
                                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                                                <td className="py-3 px-2">
                                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                                                        {record.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 font-mono text-xs">{record.name || '@'}</td>
                                                <td className="py-3 px-2">
                                                    <code className="text-xs bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded block max-w-md truncate">
                                                        {record.value}
                                                    </code>
                                                </td>
                                                <td className="py-3 px-2">{statusBadge(record.status)}</td>
                                                <td className="py-3 px-2">
                                                    <button
                                                        onClick={() => copyValue(record.value, idx)}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        {copiedIdx === idx ? s.copied : s.copy}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
