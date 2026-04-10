'use client'

/**
 * i18n Client — Owner Panel (SOTA v3 — 2026-04-04)
 *
 * v3 UX overhaul:
 * - Cleaner 2-tab layout (Languages + Currencies). Translations tab removed
 *   (was showing fake hardcoded % that confused users).
 * - Language cards: clear toggle with primary language badge, no redundant
 *   translation bar inside the card.
 * - Currency toggles are now functional (call saveActiveCurrenciesAction).
 * - Panel language selector moved to a standalone section below tabs.
 * - When at max tier with all slots used, show a calm "all enabled" state
 *   instead of an alarming upgrade banner.
 * - All user-facing strings use i18n labels (no hardcoded Spanish).
 */

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Globe, Languages, DollarSign, CheckCircle2,
    Loader2, AlertCircle, Sparkles, X, ArrowRight, Settings2, Star, Shield,
} from 'lucide-react'
import Link from 'next/link'

import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'
import { SotaMetric } from '@/components/panel/sota/SotaMetric'
import { CURRENCY_MAP } from '@/lib/i18n/currencies'
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { saveActiveLanguagesAction, savePanelLanguageAction, saveActiveCurrenciesAction } from '../actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface I18nData {
    activeLanguages: string[]
    activeCurrencies: string[]
    defaultCurrency: string
    defaultLanguage: string
    maxLanguages: number
    maxCurrencies: number
}

interface Labels {
    activeLanguages: string
    activeCurrencies: string
    defaultLanguage: string
    defaultCurrency: string
    translationProgress: string
    currencyConfig: string
    languageSettings: string
    usageOf: string
    addLanguage: string
    addCurrency: string
    tabLanguages: string
    tabCurrencies: string
    tabTranslations: string
    panelLanguage: string
    panelLangDescription: string
    saveSuccess: string
    saveError: string
    limitReached: string
    upgradePrompt: string
    cannotDeactivateLast: string
}

interface I18nClientProps {
    data: I18nData
    labels: Labels
    lang: string
    panelLang: string
}

// ---------------------------------------------------------------------------
// Data maps
// ---------------------------------------------------------------------------

type TabId = 'languages' | 'currencies'
type ToastType = 'success' | 'error' | 'limit'

// ---------------------------------------------------------------------------
// Reusable Toggle component
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
                width: '44px',
                height: '24px',
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
                    left: checked ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
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
// Toast
// ---------------------------------------------------------------------------

function Toast({ type, message, onClose }: { type: ToastType; message: string; onClose: () => void }) {
    const colors: Record<ToastType, string> = {
        success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
        error:   'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400',
        limit:   'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
    }
    const Icon = type === 'success' ? CheckCircle2 : AlertCircle
    return (
        <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,   scale: 1 }}
            exit={{   opacity: 0, y: -12,  scale: 0.95 }}
            className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm ${colors[type]}`}
        >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">{message}</span>
            <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    )
}

// ---------------------------------------------------------------------------
// Upgrade modal
// ---------------------------------------------------------------------------

function UpgradeModal({ labels, lang, onClose }: {
    labels: Pick<Labels, 'limitReached' | 'upgradePrompt'>
    lang: string
    onClose: () => void
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1,   y: 0 }}
                exit={{   opacity: 0, scale: 0.9,  y: 20 }}
                className="bg-sf-0 border border-sf-3 rounded-2xl shadow-2xl p-8 max-w-sm w-full space-y-5"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-amber-500" />
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-sf-1 transition-colors">
                        <X className="w-4 h-4 text-tx-muted" />
                    </button>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-tx">{labels.limitReached}</h3>
                    <p className="text-sm text-tx-sec mt-1">{labels.upgradePrompt}</p>
                </div>
                <Link
                    href={`/${lang}/panel/ajustes?tab=suscripcion&module=i18n`}
                    className="flex items-center justify-center gap-2 w-full btn btn-primary py-3 text-sm font-semibold"
                    onClick={onClose}
                >
                    <Sparkles className="w-4 h-4" />
                    Ver planes de idiomas
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </motion.div>
        </motion.div>
    )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function I18nClient({ data, labels, lang, panelLang: panelLangProp }: I18nClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabId>('languages')

    const TOTAL_SUPPORTED = SUPPORTED_LOCALES.length

    // Storefront active languages (optimistic)
    const [enabledLanguages, setEnabledLanguages] = useState<string[]>(
        data.activeLanguages.filter(l => l in LOCALE_LABELS)
    )
    const [isPendingLang, startLangTransition] = useTransition()

    // Storefront active currencies (optimistic)
    const [activeCurrencies, setActiveCurrencies] = useState<string[]>(data.activeCurrencies)
    const [isPendingCurrency, startCurrencyTransition] = useTransition()

    // Panel language (owner's UI language, independent)
    const [selectedPanelLang, setSelectedPanelLang] = useState(
        panelLangProp in LOCALE_LABELS ? panelLangProp : data.defaultLanguage in LOCALE_LABELS ? data.defaultLanguage : 'es'
    )
    const [isPendingPanel, startPanelTransition] = useTransition()

    // UI feedback
    const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)
    const [showUpgrade, setShowUpgrade] = useState(false)

    // Effective max = min(db limit, how many languages we actually support)
    const effectiveMax = Math.min(data.maxLanguages, TOTAL_SUPPORTED)
    const allSlotsUsed = enabledLanguages.length >= effectiveMax
    // "At limit" means the limit constrains below what's supported
    const isConstrained = data.maxLanguages < TOTAL_SUPPORTED && enabledLanguages.length >= data.maxLanguages

    const showToastMsg = useCallback((type: ToastType, message: string) => {
        setToast({ type, message })
        setTimeout(() => setToast(null), 3500)
    }, [])

    function toggleLanguage(code: string) {
        const isActive = enabledLanguages.includes(code)

        if (!isActive) {
            if (enabledLanguages.length >= effectiveMax) {
                if (isConstrained) {
                    setShowUpgrade(true)
                } else {
                    showToastMsg('limit', labels.limitReached)
                }
                return
            }
            const next = [...enabledLanguages, code]
            setEnabledLanguages(next)
            startLangTransition(async () => {
                const result = await saveActiveLanguagesAction(next)
                if (!result.success) {
                    setEnabledLanguages(enabledLanguages)
                    showToastMsg('error', labels.saveError)
                } else {
                    showToastMsg('success', labels.saveSuccess)
                }
            })
        } else {
            if (enabledLanguages.length <= 1) {
                showToastMsg('error', labels.cannotDeactivateLast)
                return
            }
            const next = enabledLanguages.filter(l => l !== code)
            setEnabledLanguages(next)
            startLangTransition(async () => {
                const result = await saveActiveLanguagesAction(next)
                if (!result.success) {
                    setEnabledLanguages(enabledLanguages)
                    showToastMsg('error', labels.saveError)
                } else {
                    showToastMsg('success', labels.saveSuccess)
                }
            })
        }
    }

    function changePanelLang(newLang: string) {
        if (!(newLang in LOCALE_LABELS)) return
        const prev = selectedPanelLang
        setSelectedPanelLang(newLang)
        startPanelTransition(async () => {
            const result = await savePanelLanguageAction(newLang)
            if (!result.success) {
                setSelectedPanelLang(prev)
                showToastMsg('error', labels.saveError)
            } else {
                router.push(`/${newLang}/panel/ajustes?tab=idiomas`)
            }
        })
    }

    const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'languages',  label: labels.tabLanguages,  icon: Languages },
        { id: 'currencies', label: labels.tabCurrencies, icon: DollarSign },
    ]

    return (
        <PageEntrance className="space-y-6">
            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
                )}
            </AnimatePresence>

            {/* Upgrade modal */}
            <AnimatePresence>
                {showUpgrade && (
                    <UpgradeModal labels={labels} lang={lang} onClose={() => setShowUpgrade(false)} />
                )}
            </AnimatePresence>

            {/* ── Row 1: Summary metrics ── */}
            <SotaBentoGrid>
                <SotaBentoItem colSpan={4}>
                    <SotaMetric
                        label={labels.activeLanguages}
                        value={`${enabledLanguages.length}/${effectiveMax}`}
                        icon={<Languages className="w-5 h-5 opacity-70" />}
                        trend={{
                            value: allSlotsUsed ? 0 : effectiveMax - enabledLanguages.length,
                            label: allSlotsUsed ? '✓ Máximo' : `${effectiveMax - enabledLanguages.length} disponibles`,
                        }}
                        glowColor={allSlotsUsed ? 'brand' : 'emerald'}
                    />
                </SotaBentoItem>

                <SotaBentoItem colSpan={4}>
                    <SotaMetric
                        label={labels.activeCurrencies}
                        value={`${activeCurrencies.length}/${data.maxCurrencies}`}
                        icon={<DollarSign className="w-5 h-5 opacity-70" />}
                        trend={{
                            value: 0,
                            label: activeCurrencies.map(c => CURRENCY_MAP[c]?.symbol || c).join(' · '),
                        }}
                        glowColor="brand"
                    />
                </SotaBentoItem>

                {/* Panel language selector */}
                <SotaBentoItem colSpan={4}>
                    <SotaGlassCard glowColor="brand" className="p-5 h-full flex flex-col justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-brand opacity-70" />
                            <p className="text-xs font-bold text-tx-muted uppercase tracking-wider flex-1">
                                {labels.panelLanguage}
                            </p>
                            {isPendingPanel && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />}
                        </div>
                        <select
                            value={selectedPanelLang}
                            onChange={e => changePanelLang(e.target.value)}
                            disabled={isPendingPanel}
                            className="w-full bg-sf-1/80 border border-sf-3/50 rounded-xl px-3 py-2.5 text-sm font-semibold text-tx focus:outline-none focus:border-brand focus:ring-1 focus:ring-soft transition-all cursor-pointer disabled:opacity-60"
                            aria-label={labels.panelLanguage}
                        >
                            {Object.entries(LOCALE_LABELS).map(([code, info]) => (
                                <option key={code} value={code}>{info.flag} {info.label}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-tx-faint leading-tight">{labels.panelLangDescription}</p>
                    </SotaGlassCard>
                </SotaBentoItem>
            </SotaBentoGrid>

            {/* ── Main content area ── */}
            <SotaGlassCard glowColor="none" className="!p-0" padded={false}>
                {/* Tab bar */}
                <div className="flex gap-1 p-1.5 border-b border-sf-3/30">
                    {tabs.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative px-5 py-3 min-h-[44px] rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                    activeTab === tab.id
                                        ? 'text-brand'
                                        : 'text-tx-muted hover:text-tx hover:bg-sf-1/50'
                                }`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="i18n-tab-indicator"
                                        className="absolute inset-0 bg-white dark:bg-sf-2 rounded-xl shadow-sm border border-sf-3/20"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2.5">
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Tab content */}
                <div className="p-6">
                    <AnimatePresence mode="wait">

                        {/* ── Languages tab ── */}
                        {activeTab === 'languages' && (
                            <motion.div
                                key="languages"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-5"
                            >
                                {/* Header description */}
                                <div className="flex items-center gap-3 mb-2">
                                    <Globe className="w-5 h-5 text-brand opacity-60" />
                                    <p className="text-sm text-tx-sec">
                                        {labels.languageSettings}
                                    </p>
                                </div>

                                {/* Constrained limit banner — only when tier actually limits you */}
                                {isConstrained && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25 flex items-center gap-3"
                                    >
                                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex-1">
                                            {labels.limitReached}
                                        </span>
                                        <Link
                                            href={`/${lang}/panel/ajustes?tab=suscripcion&module=i18n`}
                                            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 whitespace-nowrap transition-colors"
                                        >
                                            {labels.upgradePrompt} <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </motion.div>
                                )}

                                {/* All-enabled calm banner — when at max tier with all active */}
                                {allSlotsUsed && !isConstrained && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-center gap-3"
                                    >
                                        <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                            Todos los idiomas soportados están activos. Tu tienda es completamente multilingüe.
                                        </span>
                                    </motion.div>
                                )}

                                {/* Language cards */}
                                <ListStagger>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {Object.entries(LOCALE_LABELS).map(([code, info]) => {
                                            const isActive  = enabledLanguages.includes(code)
                                            const isDefault = data.defaultLanguage === code

                                            return (
                                                <StaggerItem key={code}>
                                                    <div
                                                        className="group rounded-xl border transition-all duration-200"
                                                        style={{
                                                            borderColor: isActive
                                                                ? 'var(--color-brand, #2d5016)'
                                                                : 'var(--color-sf-3, #e8ede3)',
                                                            backgroundColor: isActive
                                                                ? 'rgba(45, 80, 22, 0.04)'
                                                                : 'transparent',
                                                            opacity: isActive ? 1 : 0.7,
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-4 p-4">
                                                            {/* Flag */}
                                                            <span className="text-3xl leading-none select-none">{info.flag}</span>

                                                            {/* Name + code */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-bold text-tx truncate">{info.label}</p>
                                                                    {isDefault && (
                                                                        <span
                                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                                                            style={{
                                                                                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                                                                color: '#b45309',
                                                                            }}
                                                                        >
                                                                            <Star className="w-2.5 h-2.5 fill-current" />
                                                                            Base
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-tx-muted mt-0.5">
                                                                    {info.nativeName} · <span className="font-mono">{code.toUpperCase()}</span>
                                                                </p>
                                                            </div>

                                                            {/* Toggle */}
                                                            <Toggle
                                                                checked={isActive}
                                                                onChange={() => toggleLanguage(code)}
                                                                disabled={isPendingLang}
                                                                ariaLabel={isActive ? `Desactivar ${info.label}` : `Activar ${info.label}`}
                                                            />
                                                        </div>

                                                        {/* Active indicator line */}
                                                        {isActive && (
                                                            <motion.div
                                                                layoutId={`lang-indicator-${code}`}
                                                                className="h-0.5 rounded-b-xl"
                                                                style={{ backgroundColor: 'var(--color-brand, #2d5016)' }}
                                                                initial={{ scaleX: 0 }}
                                                                animate={{ scaleX: 1 }}
                                                                transition={{ duration: 0.3 }}
                                                            />
                                                        )}
                                                    </div>
                                                </StaggerItem>
                                            )
                                        })}
                                    </div>
                                </ListStagger>

                                {/* Loading overlay */}
                                {isPendingLang && (
                                    <div className="flex items-center justify-center gap-2 py-2 text-xs text-tx-muted">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span className="font-medium">Guardando cambios…</span>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── Currencies tab ── */}
                        {activeTab === 'currencies' && (
                            <motion.div
                                key="currencies"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-5"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <DollarSign className="w-5 h-5 text-brand opacity-60" />
                                    <p className="text-sm text-tx-sec">
                                        {labels.currencyConfig}
                                    </p>
                                </div>

                                <ListStagger>
                                    <div className="divide-y divide-sf-3/30">
                                        {Object.entries(CURRENCY_MAP).map(([code, info]) => {
                                            const isActive  = activeCurrencies.includes(code)
                                            const isDefault = data.defaultCurrency === code

                                            return (
                                                <StaggerItem key={code}>
                                                    <div className={`flex items-center gap-4 py-4 transition-opacity ${!isActive ? 'opacity-50' : ''}`}>
                                                        {/* Symbol badge */}
                                                        <div
                                                            className="w-11 h-11 rounded-xl flex items-center justify-center border shadow-inner shrink-0"
                                                            style={{
                                                                backgroundColor: isActive ? 'rgba(45, 80, 22, 0.06)' : 'var(--color-sf-1, #f5f5f0)',
                                                                borderColor: isActive ? 'rgba(45, 80, 22, 0.15)' : 'var(--color-sf-3, #e8ede3)',
                                                            }}
                                                        >
                                                            <span className="text-base font-bold font-mono text-tx">{info.symbol}</span>
                                                        </div>

                                                        {/* Name + region */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-tx">{info.name}</p>
                                                                {isDefault && (
                                                                    <span
                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                                                                        style={{
                                                                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                                                            color: '#b45309',
                                                                        }}
                                                                    >
                                                                        <Star className="w-2.5 h-2.5 fill-current" />
                                                                        Base
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-tx-muted mt-0.5">
                                                                <span className="font-mono">{code.toUpperCase()}</span> · {info.region}
                                                            </p>
                                                        </div>

                                                        {/* Toggle */}
                                                        <Toggle
                                                            checked={isActive}
                                                            disabled={isDefault || isPendingCurrency}
                                                            ariaLabel={`Toggle ${info.name}`}
                                                            onChange={() => {
                                                                if (isDefault) return
                                                                if (!isActive && activeCurrencies.length >= data.maxCurrencies) {
                                                                    setToast({ type: 'limit', message: labels.limitReached })
                                                                    return
                                                                }
                                                                const next = isActive
                                                                    ? activeCurrencies.filter(c => c !== code)
                                                                    : [...activeCurrencies, code]
                                                                setActiveCurrencies(next)
                                                                startCurrencyTransition(async () => {
                                                                    const result = await saveActiveCurrenciesAction(next)
                                                                    setToast({
                                                                        type: result.success ? 'success' : 'error',
                                                                        message: result.success ? labels.saveSuccess : (result.error ?? labels.saveError),
                                                                    })
                                                                })
                                                            }}
                                                        />
                                                    </div>
                                                </StaggerItem>
                                            )
                                        })}
                                    </div>
                                </ListStagger>

                                {/* Usage indicator */}
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-sf-1/50 border border-sf-3/30">
                                    <DollarSign className="w-4 h-4 text-brand opacity-60 shrink-0" />
                                    <p className="text-xs text-tx-sec">
                                        {activeCurrencies.length} / {data.maxCurrencies} {labels.usageOf}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </SotaGlassCard>
        </PageEntrance>
    )
}
