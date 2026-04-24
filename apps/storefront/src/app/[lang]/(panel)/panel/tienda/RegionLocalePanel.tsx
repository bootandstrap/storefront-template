'use client'

/**
 * RegionLocalePanel — Unified Currency & Language Management
 *
 * Consolidates default currency/language selection with additional
 * language/currency activation. Governance-native: respects module gates
 * (enable_multi_language) and plan limits (max_languages, max_currencies).
 *
 * UX States:
 * - Module OFF: Shows defaults + locked "Add more" with ghost upsell
 * - Module ON, under limit: Full toggle grid
 * - Module ON, at limit: Calm "all enabled" or upgrade prompt
 *
 * Replaces: separate "Región y moneda" box in StoreConfigClient
 * + standalone idiomas tab in Settings Hub
 *
 * @module RegionLocalePanel
 */

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Globe, Languages, DollarSign, CheckCircle2,
    Loader2, AlertCircle, Sparkles, X,
    ArrowRight, Settings2, Star, Shield, Lock,
} from 'lucide-react'
import Link from 'next/link'

import { CURRENCY_MAP } from '@/lib/i18n/currencies'
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { STATIC_EXCHANGE_RATES } from '@/lib/currency-engine'
import { saveActiveLanguagesAction, savePanelLanguageAction, saveActiveCurrenciesAction } from '../actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegionLocalePanelProps {
    /** Current default language */
    defaultLanguage: string
    /** Current default currency */
    defaultCurrency: string
    /** Currently active storefront languages */
    activeLanguages: string[]
    /** Currently active storefront currencies */
    activeCurrencies: string[]
    /** Max languages from plan limits */
    maxLanguages: number
    /** Max currencies from plan limits */
    maxCurrencies: number
    /** Whether i18n module is active */
    isMultiLanguageEnabled: boolean
    /** Owner's panel language */
    panelLang: string
    /** Current lang for routing */
    lang: string
    /** Callback when default currency changes (bubbles to parent form) */
    onDefaultCurrencyChange: (currency: string) => void
    /** Callback when default language changes (bubbles to parent form) */
    onDefaultLanguageChange: (language: string) => void
}

type ToastType = 'success' | 'error' | 'limit'

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

function Toggle({
    checked,
    onChange,
    disabled = false,
    ariaLabel,
}: {
    checked: boolean
    onChange: () => void
    disabled?: boolean
    ariaLabel: string
}) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={onChange}
            disabled={disabled}
            style={{
                width: '40px',
                height: '22px',
                borderRadius: '9999px',
                position: 'relative',
                backgroundColor: checked
                    ? 'var(--color-brand, #2d5016)'
                    : 'var(--color-sf-3, #d4d8cf)',
                transition: 'background-color 0.25s ease',
                opacity: disabled ? 0.5 : 1,
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                flexShrink: 0,
                outline: 'none',
            }}
            className="focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
            <div
                style={{
                    position: 'absolute',
                    top: '2px',
                    left: checked ? '20px' : '2px',
                    width: '18px',
                    height: '18px',
                    backgroundColor: '#fff',
                    borderRadius: '9999px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)',
                }}
            />
        </button>
    )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RegionLocalePanel({
    defaultLanguage,
    defaultCurrency,
    activeLanguages: initialActiveLanguages,
    activeCurrencies: initialActiveCurrencies,
    maxLanguages,
    maxCurrencies,
    isMultiLanguageEnabled,
    panelLang: panelLangProp,
    lang,
    onDefaultCurrencyChange,
    onDefaultLanguageChange,
}: RegionLocalePanelProps) {
    const router = useRouter()
    const TOTAL_SUPPORTED = SUPPORTED_LOCALES.length

    // ── Storefront languages (optimistic) ──
    const [enabledLanguages, setEnabledLanguages] = useState<string[]>(
        initialActiveLanguages.filter(l => l in LOCALE_LABELS)
    )
    const [isPendingLang, startLangTransition] = useTransition()

    // ── Storefront currencies (optimistic) ──
    const [activeCurrencies, setActiveCurrencies] = useState<string[]>(initialActiveCurrencies)
    const [isPendingCurrency, startCurrencyTransition] = useTransition()

    // ── Panel language ──
    const [selectedPanelLang, setSelectedPanelLang] = useState(
        panelLangProp in LOCALE_LABELS ? panelLangProp : defaultLanguage in LOCALE_LABELS ? defaultLanguage : 'es'
    )
    const [isPendingPanel, startPanelTransition] = useTransition()

    // ── UI feedback ──
    const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)

    // Effective constraints
    const effectiveMaxLangs = Math.min(maxLanguages, TOTAL_SUPPORTED)
    const allLangSlotsUsed = enabledLanguages.length >= effectiveMaxLangs
    const isLangConstrained = maxLanguages < TOTAL_SUPPORTED && enabledLanguages.length >= maxLanguages

    const showToast = useCallback((type: ToastType, message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 3500)
    }, [])

    // ── Language toggle ──
    function toggleLanguage(code: string) {
        const isActive = enabledLanguages.includes(code)

        if (!isActive) {
            if (enabledLanguages.length >= effectiveMaxLangs) {
                showToast('limit', 'Language limit reached')
                return
            }
            const next = [...enabledLanguages, code]
            setEnabledLanguages(next)
            startLangTransition(async () => {
                const result = await saveActiveLanguagesAction(next)
                if (!result.success) {
                    setEnabledLanguages(enabledLanguages)
                    showToast('error', 'Failed to save')
                } else {
                    showToast('success', 'Saved')
                }
            })
        } else {
            if (enabledLanguages.length <= 1) {
                showToast('error', 'At least one language required')
                return
            }
            const next = enabledLanguages.filter(l => l !== code)
            setEnabledLanguages(next)
            startLangTransition(async () => {
                const result = await saveActiveLanguagesAction(next)
                if (!result.success) {
                    setEnabledLanguages(enabledLanguages)
                    showToast('error', 'Failed to save')
                } else {
                    showToast('success', 'Saved')
                }
            })
        }
    }

    // ── Panel language change ──
    function changePanelLang(newLang: string) {
        if (!(newLang in LOCALE_LABELS)) return
        const prev = selectedPanelLang
        setSelectedPanelLang(newLang)
        startPanelTransition(async () => {
            const result = await savePanelLanguageAction(newLang)
            if (!result.success) {
                setSelectedPanelLang(prev)
                showToast('error', 'Failed to save')
            } else {
                router.push(`/${newLang}/panel/ajustes?tab=tienda`)
            }
        })
    }

    // ── Currency toggle ──
    function toggleCurrency(code: string) {
        if (code === defaultCurrency) return
        const isActive = activeCurrencies.includes(code)

        if (!isActive && activeCurrencies.length >= maxCurrencies) {
            showToast('limit', 'Currency limit reached')
            return
        }

        const next = isActive
            ? activeCurrencies.filter(c => c !== code)
            : [...activeCurrencies, code]
        setActiveCurrencies(next)
        startCurrencyTransition(async () => {
            const result = await saveActiveCurrenciesAction(next)
            showToast(
                result.success ? 'success' : 'error',
                result.success ? 'Saved' : (result.error ?? 'Failed')
            )
        })
    }

    const sectionStyle = {
        borderRadius: '16px',
        border: '1px solid var(--color-sf-3, #e8ede3)',
        backgroundColor: 'rgba(var(--color-sf-0-rgb, 255, 255, 255), 0.3)',
        padding: '20px',
    }

    return (
        <div className="space-y-5">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm ${
                            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                            : toast.type === 'limit' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                            : 'bg-red-500/10 border-red-500/30 text-red-700'
                        }`}
                    >
                        {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span className="text-sm font-semibold">{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
                            <X className="w-3 h-3" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════════
                Section 1: Defaults (always visible, no module gate)
            ═══════════════════════════════════════════════════════════════ */}
            <div style={sectionStyle}>
                <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-4 h-4 text-brand" />
                    <span className="text-sm font-bold text-tx">Región y localización</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Default Currency */}
                    <div>
                        <label className="block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5">
                            Moneda por defecto
                        </label>
                        <select
                            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all"
                            value={(defaultCurrency ?? 'eur').toLowerCase()}
                            onChange={(e) => onDefaultCurrencyChange(e.target.value)}
                        >
                            {Object.keys(STATIC_EXCHANGE_RATES).map(code => (
                                <option key={code} value={code}>{code.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Default Language */}
                    <div>
                        <label className="block text-xs font-semibold text-tx-muted uppercase tracking-wide mb-1.5">
                            Idioma de la tienda
                        </label>
                        <select
                            className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-soft transition-all"
                            value={defaultLanguage ?? 'es'}
                            onChange={(e) => onDefaultLanguageChange(e.target.value)}
                        >
                            {SUPPORTED_LOCALES.map(loc => (
                                <option key={loc} value={loc}>
                                    {loc === 'es' ? '🇪🇸 Español' : loc === 'en' ? '🇬🇧 English' : loc === 'de' ? '🇩🇪 Deutsch' : loc === 'fr' ? '🇫🇷 Français' : loc === 'it' ? '🇮🇹 Italiano' : loc}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Panel language (owner UI — always available) */}
                <div className="mt-4 pt-4 border-t border-sf-3/30">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings2 className="w-3.5 h-3.5 text-tx-muted" />
                        <span className="text-xs font-semibold text-tx-muted uppercase tracking-wide">
                            Idioma del panel
                        </span>
                        {isPendingPanel && <Loader2 className="w-3 h-3 animate-spin text-brand" />}
                    </div>
                    <select
                        value={selectedPanelLang}
                        onChange={e => changePanelLang(e.target.value)}
                        disabled={isPendingPanel}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sf-1/80 border border-sf-3/50 text-sm font-semibold text-tx focus:outline-none focus:border-brand focus:ring-1 focus:ring-soft transition-all cursor-pointer disabled:opacity-60"
                    >
                        {Object.entries(LOCALE_LABELS).map(([code, info]) => (
                            <option key={code} value={code}>{info.flag} {info.label}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-tx-faint mt-1.5">
                        Solo cambia el idioma de este panel, no afecta a la tienda.
                    </p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                Section 2: Additional Languages (module-gated)
            ═══════════════════════════════════════════════════════════════ */}
            <div style={sectionStyle}>
                <div className="flex items-center gap-2 mb-1">
                    <Languages className="w-4 h-4 text-brand" />
                    <span className="text-sm font-bold text-tx flex-1">Idiomas de la tienda</span>
                    <span className="text-xs text-tx-muted font-mono">
                        {enabledLanguages.length}/{effectiveMaxLangs}
                    </span>
                </div>
                <p className="text-[11px] text-tx-faint mb-4">
                    Los clientes verán la tienda en estos idiomas.
                </p>

                {!isMultiLanguageEnabled ? (
                    /* ── Module OFF: ghost upsell ── */
                    <div className="relative overflow-hidden rounded-xl">
                        {/* Blurred preview */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-40 blur-[2px] pointer-events-none select-none" aria-hidden="true">
                            {Object.entries(LOCALE_LABELS).slice(0, 6).map(([code, info]) => (
                                <div key={code} className="flex items-center gap-3 p-3 rounded-xl border border-sf-3/30">
                                    <span className="text-xl">{info.flag}</span>
                                    <span className="text-sm font-medium text-tx truncate">{info.label}</span>
                                </div>
                            ))}
                        </div>
                        {/* Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-sf-0/60 backdrop-blur-[4px] rounded-xl">
                            <div className="text-center space-y-3 px-4">
                                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                                    <Lock className="w-5 h-5 text-amber-600" />
                                </div>
                                <p className="text-sm font-semibold text-tx">Módulo Multiidioma</p>
                                <p className="text-xs text-tx-sec max-w-xs">
                                    Activa el módulo i18n para ofrecer tu tienda en múltiples idiomas.
                                </p>
                                <Link
                                    href={`/${lang}/panel/modulos`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand/90 transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Activar módulo
                                    <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── Module ON: full toggle grid ── */
                    <div className="space-y-3">
                        {/* Constraint banners */}
                        {isLangConstrained && (
                            <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/25 flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                <span className="text-xs font-semibold text-amber-700 flex-1">
                                    Límite de idiomas alcanzado
                                </span>
                                <Link
                                    href={`/${lang}/panel/modulos`}
                                    className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 whitespace-nowrap"
                                >
                                    Ampliar <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        )}
                        {allLangSlotsUsed && !isLangConstrained && (
                            <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-center gap-3">
                                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="text-xs font-medium text-emerald-700">
                                    Todos los idiomas soportados están activos.
                                </span>
                            </div>
                        )}

                        {/* Language cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {Object.entries(LOCALE_LABELS).map(([code, info]) => {
                                const isActive = enabledLanguages.includes(code)
                                const isDefault = defaultLanguage === code

                                return (
                                    <div
                                        key={code}
                                        className="flex items-center gap-3 p-3 rounded-xl border transition-all duration-200"
                                        style={{
                                            borderColor: isActive
                                                ? 'var(--color-brand, #2d5016)'
                                                : 'var(--color-sf-3, #e8ede3)',
                                            backgroundColor: isActive ? 'rgba(45, 80, 22, 0.04)' : 'transparent',
                                            opacity: isActive ? 1 : 0.65,
                                        }}
                                    >
                                        <span className="text-2xl leading-none select-none">{info.flag}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-tx truncate">{info.label}</span>
                                                {isDefault && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-500/12 text-amber-700">
                                                        <Star className="w-2 h-2 fill-current" />
                                                        Base
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-tx-muted font-mono">{code.toUpperCase()}</span>
                                        </div>
                                        <Toggle
                                            checked={isActive}
                                            onChange={() => toggleLanguage(code)}
                                            disabled={isPendingLang}
                                            ariaLabel={`Toggle ${info.label}`}
                                        />
                                    </div>
                                )
                            })}
                        </div>

                        {isPendingLang && (
                            <div className="flex items-center justify-center gap-2 py-1 text-xs text-tx-muted">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Guardando…</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                Section 3: Currencies (always visible, limit-gated)
            ═══════════════════════════════════════════════════════════════ */}
            <div style={sectionStyle}>
                <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="w-4 h-4 text-brand" />
                    <span className="text-sm font-bold text-tx flex-1">Monedas disponibles</span>
                    <span className="text-xs text-tx-muted font-mono">
                        {activeCurrencies.length}/{maxCurrencies}
                    </span>
                </div>
                <p className="text-[11px] text-tx-faint mb-4">
                    Los precios se mostrarán en estas monedas. La conversión es automática.
                </p>

                <div className="divide-y divide-sf-3/20">
                    {Object.entries(CURRENCY_MAP).map(([code, info]) => {
                        const isActive = activeCurrencies.includes(code)
                        const isDefault = defaultCurrency === code

                        return (
                            <div
                                key={code}
                                className={`flex items-center gap-3 py-3 transition-opacity ${!isActive && !isDefault ? 'opacity-40' : ''}`}
                            >
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center border shrink-0"
                                    style={{
                                        backgroundColor: isActive ? 'rgba(45, 80, 22, 0.06)' : 'var(--color-sf-1, #f5f5f0)',
                                        borderColor: isActive ? 'rgba(45, 80, 22, 0.15)' : 'var(--color-sf-3, #e8ede3)',
                                    }}
                                >
                                    <span className="text-sm font-bold font-mono text-tx">{info.symbol}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-tx">{info.name}</span>
                                        {isDefault && (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-500/12 text-amber-700">
                                                <Star className="w-2 h-2 fill-current" />
                                                Base
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-tx-muted">
                                        <span className="font-mono">{code.toUpperCase()}</span> · {info.region}
                                    </span>
                                </div>
                                <Toggle
                                    checked={isActive}
                                    disabled={isDefault || isPendingCurrency}
                                    ariaLabel={`Toggle ${info.name}`}
                                    onChange={() => toggleCurrency(code)}
                                />
                            </div>
                        )
                    })}
                </div>

                {isPendingCurrency && (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-tx-muted">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Guardando…</span>
                    </div>
                )}
            </div>
        </div>
    )
}
