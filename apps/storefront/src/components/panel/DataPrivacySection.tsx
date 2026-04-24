'use client'

/**
 * DataPrivacySection — GDPR data export & account management
 *
 * Rendered in /panel/ajustes?tab=tienda
 *
 * Features:
 * - Request data export (reuses backup infrastructure)
 * - View export history & download links
 * - Account termination request with cooling period
 *
 * @module components/panel/DataPrivacySection
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Download, Shield, AlertTriangle, Clock, CheckCircle2,
    Loader2, FileArchive, Trash2,
} from 'lucide-react'

interface ExportRecord {
    id: string
    status: string
    requestedAt: string
    completedAt: string | null
    downloadUrl: string | null
}

interface DataPrivacySectionProps {
    lang?: string
}

export default function DataPrivacySection({ lang = 'es' }: DataPrivacySectionProps) {
    const [exports, setExports] = useState<ExportRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [requesting, setRequesting] = useState(false)
    const [terminating, setTerminating] = useState(false)
    const [showTermination, setShowTermination] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

    // Fetch export history
    const fetchExports = useCallback(async () => {
        try {
            const res = await fetch('/api/panel/data-export')
            if (res.ok) {
                const data = await res.json()
                setExports(data.exports || [])
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchExports() }, [fetchExports])

    // Request new export
    const handleRequestExport = async () => {
        setRequesting(true)
        setMessage(null)
        try {
            const res = await fetch('/api/panel/data-export', { method: 'POST' })
            const data = await res.json()

            if (res.ok) {
                setMessage({ type: 'success', text: 'Exportación iniciada. Recibirás un enlace de descarga por email.' })
                await fetchExports()
            } else if (data.cooldown) {
                setMessage({ type: 'info', text: 'Ya solicitaste una exportación en las últimas 24 horas.' })
            } else {
                setMessage({ type: 'error', text: data.error || 'Error al solicitar la exportación' })
            }
        } catch {
            setMessage({ type: 'error', text: 'Error de conexión' })
        } finally {
            setRequesting(false)
        }
    }

    // Request account termination
    const handleTermination = async () => {
        setTerminating(true)
        setMessage(null)
        try {
            const governanceDomain = process.env.NEXT_PUBLIC_GOVERNANCE_URL || 'https://bootandstrap.com'
            const res = await fetch(`${governanceDomain}/api/admin/tenant-termination`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // tenant_id is resolved server-side by BSWEB from the
                    // authenticated session — no need to expose env vars in client.
                    reason: 'Owner-initiated via panel',
                }),
            })
            const data = await res.json()

            if (res.ok) {
                setMessage({
                    type: 'success',
                    text: `Solicitud recibida. Período de enfriamiento hasta: ${new Date(data.cooling_period_ends).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })}. Recibirás un backup final por email.`,
                })
            } else if (res.status === 409) {
                setMessage({ type: 'info', text: 'Ya hay una solicitud de baja pendiente.' })
            } else {
                setMessage({ type: 'error', text: data.error || 'Error al procesar la solicitud' })
            }
        } catch {
            setMessage({ type: 'error', text: 'Error de conexión. Contacta a support@bootandstrap.com' })
        } finally {
            setTerminating(false)
            setShowTermination(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* ── Data Export ────────────────────────────────────────── */}
            <div className="rounded-2xl border border-brd-pri bg-sf-pri p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-tx-pri">Privacidad y datos</h3>
                        <p className="text-sm text-tx-sec mt-0.5">
                            Exporta todos tus datos o gestiona tu cuenta según GDPR.
                        </p>
                    </div>
                </div>

                {/* Request export */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-sf-sec/50 border border-brd-pri">
                    <div className="flex items-center gap-3">
                        <FileArchive className="w-5 h-5 text-tx-ter" />
                        <div>
                            <p className="text-sm font-medium text-tx-pri">Descargar mis datos</p>
                            <p className="text-xs text-tx-ter">Exportación completa en formato JSON</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRequestExport}
                        disabled={requesting}
                        className="px-4 py-2 text-sm font-medium rounded-xl bg-brand text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                    >
                        {requesting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Solicitar exportación
                    </button>
                </div>

                {/* Message */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`mt-3 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
                                message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' :
                                message.type === 'error' ? 'bg-red-500/10 text-red-600' :
                                'bg-blue-500/10 text-blue-600'
                            }`}
                        >
                            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                             message.type === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                             <Clock className="w-4 h-4" />}
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Export history */}
                {!loading && exports.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <h4 className="text-xs font-semibold text-tx-ter uppercase tracking-wider">
                            Historial de exportaciones
                        </h4>
                        {exports.map(exp => (
                            <div
                                key={exp.id}
                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-sf-ter/30"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                        exp.status === 'completed' ? 'bg-emerald-500' :
                                        exp.status === 'running' ? 'bg-amber-500 animate-pulse' :
                                        exp.status === 'pending' ? 'bg-blue-500' :
                                        'bg-red-500'
                                    }`} />
                                    <span className="text-xs text-tx-sec">
                                        {new Date(exp.requestedAt).toLocaleDateString(lang, {
                                            day: 'numeric', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                                {exp.downloadUrl ? (
                                    <a
                                        href={exp.downloadUrl}
                                        className="text-xs text-brand hover:underline flex items-center gap-1"
                                        download
                                    >
                                        <Download className="w-3 h-3" /> Descargar
                                    </a>
                                ) : (
                                    <span className="text-xs text-tx-ter capitalize">{exp.status}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Account Termination ──────────────────────────────── */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-tx-pri">Eliminar cuenta</h3>
                        <p className="text-sm text-tx-sec mt-0.5">
                            Solicita la eliminación permanente de tu tienda y todos sus datos.
                        </p>
                    </div>
                </div>

                {!showTermination ? (
                    <button
                        onClick={() => setShowTermination(true)}
                        className="px-4 py-2 text-sm font-medium rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors"
                    >
                        Solicitar baja
                    </button>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                    >
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-tx-sec space-y-2">
                                    <p><strong className="text-red-600">Esta acción es irreversible.</strong></p>
                                    <ul className="list-disc list-inside space-y-1 text-xs">
                                        <li>Tu tienda dejará de estar accesible inmediatamente</li>
                                        <li>Todos los datos serán eliminados después de 30 días de enfriamiento</li>
                                        <li>Se cancelarán todas las suscripciones de Stripe</li>
                                        <li>Recibirás un backup final por email antes de la eliminación</li>
                                        <li>Se generará un certificado de eliminación GDPR</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowTermination(false)}
                                disabled={terminating}
                                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl border border-brd-pri text-tx-sec hover:bg-sf-sec transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleTermination}
                                disabled={terminating}
                                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {terminating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar solicitud de baja
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
