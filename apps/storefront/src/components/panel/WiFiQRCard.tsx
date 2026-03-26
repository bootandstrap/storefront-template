'use client'

/**
 * WiFiQRCard — WiFi QR Code Generator for Physical Stores (v3)
 *
 * v3 upgrade:
 * - i18n: all strings via `labels` prop
 * - WiFi auto-detect: uses navigator.connection to detect WiFi
 * - "Use last saved" one-click shortcut
 * - Saved network selector (localStorage persistence)
 * - Default/preferred network marking
 *
 * QR Standard: WIFI:T:{type};S:{ssid};P:{password};;
 * Supported by iOS 11+, Android 10+
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Wifi, Download, Printer, Copy, Check, Plus, Star, Trash2, Eye, EyeOff, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ──

type WifiEncryption = 'WPA' | 'WEP' | 'nopass'

interface SavedNetwork {
    id: string
    ssid: string
    password: string
    encryption: WifiEncryption
    isDefault: boolean
    createdAt: string
}

export interface WifiQrLabels {
    title: string
    ssid: string
    password: string
    encryption: string
    save: string
    add: string
    delete: string
    setDefault: string
    print: string
    noNetworks: string
    detectHint: string
    useLast: string
}

interface WiFiQRCardProps {
    /** Pre-filled SSID for new network form */
    defaultSsid?: string
    /** Pre-filled password */
    defaultPassword?: string
    /** Business name for the printed card header */
    businessName?: string
    /** i18n labels — if omitted, Spanish fallbacks are used */
    labels?: WifiQrLabels
}

// ── Fallback labels (Spanish) ──

const FALLBACK_LABELS: WifiQrLabels = {
    title: 'WiFi QR Code',
    ssid: 'Nombre de red (SSID)',
    password: 'Contraseña',
    encryption: 'Seguridad',
    save: 'Guardar red',
    add: 'Añadir',
    delete: 'Eliminar',
    setDefault: 'Predeterminada',
    print: 'Imprimir cartel',
    noNetworks: 'Configura tu red',
    detectHint: 'Parece que estás en WiFi. Introduce el nombre de tu red.',
    useLast: 'Usar última guardada',
}

// ── localStorage helpers ──

const STORAGE_KEY = 'panel-wifi-networks'

function loadNetworks(): SavedNetwork[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveNetworks(networks: SavedNetwork[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(networks))
}

// ── QR generation ──

function generateWifiQR(ssid: string, password: string, encryption: WifiEncryption): string {
    const escapedSsid = ssid.replace(/[\\;,"]/g, c => `\\${c}`)
    const escapedPassword = password.replace(/[\\;,"]/g, c => `\\${c}`)

    if (encryption === 'nopass') {
        return `WIFI:T:nopass;S:${escapedSsid};;`
    }
    return `WIFI:T:${encryption};S:${escapedSsid};P:${escapedPassword};;`
}

// ── WiFi detection helper ──

function detectConnectionType(): 'wifi' | 'cellular' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown'
    const nav = navigator as unknown as {
        connection?: { type?: string; effectiveType?: string }
    }
    const conn = nav.connection
    if (!conn) return 'unknown'
    if (conn.type === 'wifi') return 'wifi'
    if (conn.type === 'cellular') return 'cellular'
    return 'unknown'
}

// ── Component ──

export default function WiFiQRCard({
    defaultSsid = '',
    defaultPassword = '',
    businessName = '',
    labels: externalLabels,
}: WiFiQRCardProps) {
    const l = externalLabels ?? FALLBACK_LABELS

    // Saved networks
    const [networks, setNetworks] = useState<SavedNetwork[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)

    // New network form
    const [showForm, setShowForm] = useState(false)
    const [formSsid, setFormSsid] = useState(defaultSsid)
    const [formPassword, setFormPassword] = useState(defaultPassword)
    const [formEncryption, setFormEncryption] = useState<WifiEncryption>('WPA')
    const [showPassword, setShowPassword] = useState(false)

    // WiFi detection
    const [connectionType, setConnectionType] = useState<'wifi' | 'cellular' | 'unknown'>('unknown')

    // UI state
    const [copied, setCopied] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    // Load saved networks + detect connection on mount
    useEffect(() => {
        const loaded = loadNetworks()
        setNetworks(loaded)
        // Auto-select: prefer default, then first network
        const defaultNet = loaded.find(n => n.isDefault) ?? loaded[0]
        if (defaultNet) {
            setSelectedId(defaultNet.id)
        } else {
            // No saved networks → show form
            setShowForm(true)
        }

        // Detect connection type
        setConnectionType(detectConnectionType())
    }, [])

    const selected = networks.find(n => n.id === selectedId)
    const qrValue = selected ? generateWifiQR(selected.ssid, selected.password, selected.encryption) : ''

    // ── Actions ──

    const handleSaveNetwork = useCallback(() => {
        if (!formSsid.trim()) return

        const newNetwork: SavedNetwork = {
            id: `wifi_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            ssid: formSsid.trim(),
            password: formPassword,
            encryption: formEncryption,
            isDefault: networks.length === 0, // First network auto-default
            createdAt: new Date().toISOString(),
        }

        const updated = [...networks, newNetwork]
        setNetworks(updated)
        saveNetworks(updated)
        setSelectedId(newNetwork.id)
        setShowForm(false)
        setFormSsid('')
        setFormPassword('')
        setFormEncryption('WPA')
    }, [formSsid, formPassword, formEncryption, networks])

    const handleSetDefault = useCallback((id: string) => {
        const updated = networks.map(n => ({ ...n, isDefault: n.id === id }))
        setNetworks(updated)
        saveNetworks(updated)
        setSelectedId(id)
    }, [networks])

    const handleDeleteNetwork = useCallback((id: string) => {
        const updated = networks.filter(n => n.id !== id)
        // If deleted was default, promote first remaining
        if (updated.length > 0 && !updated.some(n => n.isDefault)) {
            updated[0].isDefault = true
        }
        setNetworks(updated)
        saveNetworks(updated)
        if (selectedId === id) {
            setSelectedId(updated[0]?.id ?? null)
        }
        if (updated.length === 0) setShowForm(true)
    }, [networks, selectedId])

    const handleUseLast = useCallback(() => {
        const defaultNet = networks.find(n => n.isDefault) ?? networks[0]
        if (defaultNet) {
            setSelectedId(defaultNet.id)
            setShowForm(false)
        }
    }, [networks])

    const handleCopyPassword = useCallback(() => {
        if (!selected) return
        navigator.clipboard.writeText(selected.password)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [selected])

    const handlePrint = useCallback(() => {
        if (!cardRef.current || !selected) return
        const printWindow = window.open('', '', 'width=600,height=800')
        if (!printWindow) return

        printWindow.document.write(`
            <html>
                <head>
                    <title>WiFi QR - ${businessName}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: system-ui, -apple-system, sans-serif;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            padding: 20mm;
                        }
                        .card {
                            text-align: center;
                            padding: 32px;
                            border: 2px solid #e5e7eb;
                            border-radius: 16px;
                            max-width: 300px;
                        }
                        .icon { font-size: 32px; margin-bottom: 8px; }
                        h2 { font-size: 20px; margin-bottom: 4px; }
                        .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
                        .qr { margin: 16px auto; }
                        .info { font-size: 11px; color: #9ca3af; margin-top: 12px; }
                        .ssid { font-size: 14px; font-weight: 600; margin-top: 12px; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="icon">📶</div>
                        <h2>${businessName || 'Free WiFi'}</h2>
                        <p class="subtitle">Scan to connect</p>
                        ${cardRef.current.querySelector('.qr-container')?.innerHTML || ''}
                        <p class="ssid">${selected.ssid}</p>
                        <p class="info">Point your camera at the QR code</p>
                    </div>
                    <script>window.onload = function() { window.print(); window.close(); }</script>
                </body>
            </html>
        `)
        printWindow.document.close()
    }, [businessName, selected])

    const inputClass = 'w-full px-3 py-2 rounded-lg bg-surface-0 border border-surface-3 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/40'

    return (
        <div ref={cardRef} className="bg-surface-1 border border-surface-3 rounded-2xl p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Wifi className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-text-primary">{l.title}</h3>
                        <p className="text-xs text-text-muted">
                            {networks.length > 0
                                ? `${networks.length} ${networks.length === 1 ? 'network' : 'networks'}`
                                : l.noNetworks}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Use Last Saved shortcut */}
                    {networks.length > 0 && showForm && (
                        <button
                            type="button"
                            onClick={handleUseLast}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:bg-surface-2 transition-colors border border-surface-3"
                        >
                            <Star className="w-3 h-3" />
                            {l.useLast}
                        </button>
                    )}
                    {!showForm && (
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            {l.add}
                        </button>
                    )}
                </div>
            </div>

            {/* ── WiFi Detection Hint ── */}
            {connectionType === 'wifi' && showForm && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10"
                >
                    <Wifi className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-primary">{l.detectHint}</p>
                </motion.div>
            )}

            {connectionType === 'cellular' && showForm && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
                >
                    <WifiOff className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        Not connected to WiFi — connect first to verify network details.
                    </p>
                </motion.div>
            )}

            {/* ── Saved Network Selector ── */}
            {networks.length > 0 && !showForm && (
                <div className="space-y-1.5">
                    {networks.map(net => (
                        <motion.div
                            key={net.id}
                            layout
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all
                                ${selectedId === net.id
                                    ? 'bg-primary/10 border border-primary/20 ring-1 ring-primary/10'
                                    : 'bg-surface-0 border border-surface-3 hover:border-primary/30'}
                            `}
                            onClick={() => setSelectedId(net.id)}
                        >
                            {/* WiFi icon or star if default */}
                            <div className={`p-1.5 rounded-lg ${net.isDefault ? 'bg-amber-100 dark:bg-amber-500/10' : 'bg-surface-2'}`}>
                                {net.isDefault
                                    ? <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="currentColor" />
                                    : <Wifi className="w-3.5 h-3.5 text-text-muted" />
                                }
                            </div>

                            {/* Network info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate">{net.ssid}</p>
                                <p className="text-[10px] text-text-muted">
                                    {net.encryption === 'nopass' ? 'Open' : net.encryption}
                                    {net.isDefault && ` · ⭐ ${l.setDefault}`}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                {!net.isDefault && (
                                    <button
                                        type="button"
                                        onClick={() => handleSetDefault(net.id)}
                                        className="p-1.5 rounded-lg text-text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                        title={l.setDefault}
                                    >
                                        <Star className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleDeleteNetwork(net.id)}
                                    className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    title={l.delete}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── New Network Form ── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-3 p-3 rounded-xl bg-surface-0 border border-dashed border-primary/30">
                            <div>
                                <label className="text-xs font-medium text-text-muted mb-1 block">
                                    {l.ssid}
                                </label>
                                <input
                                    type="text"
                                    value={formSsid}
                                    onChange={e => setFormSsid(e.target.value)}
                                    placeholder="MyStore-WiFi"
                                    className={inputClass}
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-text-muted mb-1 block">
                                        {l.password}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formPassword}
                                            onChange={e => setFormPassword(e.target.value)}
                                            placeholder="••••••••"
                                            disabled={formEncryption === 'nopass'}
                                            className={`${inputClass} pr-9 disabled:opacity-50`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                        >
                                            {showPassword
                                                ? <EyeOff className="w-3.5 h-3.5" />
                                                : <Eye className="w-3.5 h-3.5" />
                                            }
                                        </button>
                                    </div>
                                </div>

                                <div className="w-24">
                                    <label className="text-xs font-medium text-text-muted mb-1 block">{l.encryption}</label>
                                    <select
                                        value={formEncryption}
                                        onChange={e => setFormEncryption(e.target.value as WifiEncryption)}
                                        className={inputClass}
                                    >
                                        <option value="WPA">WPA/2/3</option>
                                        <option value="WEP">WEP</option>
                                        <option value="nopass">Open</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleSaveNetwork}
                                    disabled={!formSsid.trim()}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-40"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {l.save}
                                </button>
                                {networks.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-3 py-2 rounded-lg border border-surface-3 text-text-secondary text-sm font-medium hover:bg-surface-1 transition-colors"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── QR Preview ── */}
            {selected && qrValue && (
                <>
                    <div className="flex flex-col items-center py-4">
                        <div className="qr-container p-4 bg-white rounded-2xl shadow-sm border border-surface-3">
                            <QRCodeSVG
                                value={qrValue}
                                size={160}
                                level="M"
                                includeMargin={false}
                            />
                        </div>
                        <p className="text-xs text-text-muted mt-2 font-medium">{selected.ssid}</p>
                        {selected.password && selected.encryption !== 'nopass' && (
                            <button
                                type="button"
                                onClick={handleCopyPassword}
                                className="mt-1 inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-text-primary transition-colors"
                            >
                                {copied
                                    ? <><Check className="w-3 h-3 text-emerald-500" /> ✓</>
                                    : <><Copy className="w-3 h-3" /> {l.password}</>
                                }
                            </button>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                            {l.print}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const svg = cardRef.current?.querySelector('.qr-container svg')
                                if (!svg) return
                                const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `wifi-qr-${selected.ssid}.svg`
                                a.click()
                                URL.revokeObjectURL(url)
                            }}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-surface-3 text-text-secondary text-sm font-medium hover:bg-surface-1 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
