'use client'

/**
 * i18n Client — Owner Panel (SOTA v2 — 2026-04-03)
 *
 * v2 changes:
 * - Language card toggles call saveActiveLanguagesAction (optimistic updates)
 * - New panel language selector (independent of storefront languages)
 * - FeatureGate upsell modal when max_languages limit is reached
 * - Save feedback: loading spinner, success/error toasts
 */

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Globe, Languages, DollarSign, CheckCircle2,
    BarChart3, Loader2, AlertCircle, Sparkles, X, ArrowRight, Settings2, Star,
} from 'lucide-react'
import Link from 'next/link'

import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'
import { SotaMetric } from '@/components/panel/sota/SotaMetric'
import { saveActiveLanguagesAction, savePanelLanguageAction } from '../actions'

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
// Static maps
// ---------------------------------------------------------------------------

const LANGUAGE_MAP: Record<string, { name: string; flag: string; nativeName: string }> = {
    es: { name: 'Español',   flag: '🇪🇸', nativeName: 'Español' },
    en: { name: 'English',   flag: '🇬🇧', nativeName: 'English' },
    fr: { name: 'Français',  flag: '🇫🇷', nativeName: 'Français' },
    de: { name: 'Deutsch',   flag: '🇩🇪', nativeName: 'Deutsch' },
    it: { name: 'Italiano',  flag: '🇮🇹', nativeName: 'Italiano' },
}

const CURRENCY_MAP: Record<string, { name: string; symbol: string; rate: number }> = {
    usd: { name: 'US Dollar',       symbol: '$',   rate: 1.0 },
    eur: { name: 'Euro',            symbol: '€',   rate: 0.92 },
    chf: { name: 'Swiss Franc',     symbol: 'CHF', rate: 0.88 },
    gbp: { name: 'British Pound',   symbol: '£',   rate: 0.79 },
    brl: { name: 'Brazilian Real',  symbol: 'R$',  rate: 4.97 },
    mxn: { name: 'Mexican Peso',    symbol: 'MX$', rate: 17.15 },
}

// Simulated translation completeness per locale
const TRANSLATION_PROGRESS: Record<string, number> = {
    es: 100, en: 85, fr: 42, de: 28, it: 15,
}

type TabId = 'languages' | 'currencies' | 'translations'
type ToastType = 'success' | 'error' | 'limit'

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
                    href={`/${lang}/panel/suscripcion?module=i18n`}
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

export default function I18nClient({ data, labels, lang, panelLang }: I18nClientProps) {
    const [activeTab, setActiveTab] = useState<TabId>('languages')

    // Storefront active languages (optimistic)
    const [enabledLanguages, setEnabledLanguages] = useState<string[]>(data.activeLanguages)
    const [isPendingLang, startLangTransition] = useTransition()

    // Panel language (owner's UI language, independent)
    const [selectedPanelLang, setSelectedPanelLang] = useState(panelLang || data.defaultLanguage || 'es')
    const [isPendingPanel, startPanelTransition] = useTransition()

    // UI feedback
    const [toast, setToast]           = useState<{ type: ToastType; message: string } | null>(null)
    const [showUpgrade, setShowUpgrade] = useState(false)

    function showToastMsg(type: ToastType, message: string) {
        setToast({ type, message })
        setTimeout(() => setToast(null), 3500)
    }

    function toggleLanguage(code: string) {
        const isActive = enabledLanguages.includes(code)

        if (!isActive) {
            // Trying to ENABLE
            if (enabledLanguages.length >= data.maxLanguages) {
                setShowUpgrade(true)
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
            // Trying to DISABLE
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
        const prev = selectedPanelLang
        setSelectedPanelLang(newLang)
        startPanelTransition(async () => {
            const result = await savePanelLanguageAction(newLang)
            if (!result.success) {
                setSelectedPanelLang(prev)
                showToastMsg('error', labels.saveError)
            }
        })
    }

    const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'languages',    label: labels.tabLanguages,    icon: Languages },
        { id: 'currencies',   label: labels.tabCurrencies,   icon: DollarSign },
        { id: 'translations', label: labels.tabTranslations, icon: Globe },
    ]

    const averageTranslation = enabledLanguages.length > 0
        ? Math.round(enabledLanguages.reduce((sum, la) => sum + (TRANSLATION_PROGRESS[la] ?? 0), 0) / enabledLanguages.length)
        : 0

    const atLimit = enabledLanguages.length >= data.maxLanguages

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

            <SotaBentoGrid>

                {/* ── Row 1: 4 metrics ── */}
                <SotaBentoItem colSpan={3}>
                    <SotaMetric
                        label={labels.activeLanguages}
                        value={`${enabledLanguages.length}/${data.maxLanguages}`}
                        icon={<Languages className="w-5 h-5 opacity-70" />}
                        trend={{ value: 0, label: 'Habilitados' }}
                        glowColor="emerald"
                    />
                </SotaBentoItem>

                {/* Panel language selector */}
                <SotaBentoItem colSpan={3}>
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
                            {Object.entries(LANGUAGE_MAP).map(([code, info]) => (
                                <option key={code} value={code}>{info.flag} {info.name}</option>
                            ))}
                        </select>
                        <p className="text-[11px] text-tx-faint leading-tight">{labels.panelLangDescription}</p>
                    </SotaGlassCard>
                </SotaBentoItem>

                <SotaBentoItem colSpan={3}>
                    <SotaMetric
                        label={labels.activeCurrencies}
                        value={`${data.activeCurrencies.length}/${data.maxCurrencies}`}
                        icon={<DollarSign className="w-5 h-5 opacity-70" />}
                        trend={{ value: 0, label: 'Habilitadas' }}
                        glowColor="brand"
                    />
                </SotaBentoItem>

                <SotaBentoItem colSpan={3}>
                    <SotaMetric
                        label={labels.translationProgress}
                        value={`${averageTranslation}%`}
                        icon={<BarChart3 className="w-5 h-5 opacity-70" />}
                        trend={{ value: 100 - averageTranslation, label: 'Por traducir' }}
                        glowColor="warning"
                    />
                </SotaBentoItem>

                {/* ── Main Content ── */}
                <SotaBentoItem colSpan={12}>
                    <div className="space-y-6">

                        {/* Tab bar */}
                        <div className="flex gap-1 bg-sf-0/50 backdrop-blur-md rounded-xl border border-sf-3/30 shadow-inner overflow-x-auto p-1">
                            {tabs.map(tab => {
                                const Icon = tab.icon
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`relative px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-1 ${
                                            activeTab === tab.id ? 'text-brand' : 'text-tx-muted hover:text-tx'
                                        }`}
                                    >
                                        {activeTab === tab.id && (
                                            <motion.div
                                                layoutId="i18n-tab-indicator"
                                                className="absolute inset-0 bg-white dark:bg-sf-2 rounded-lg shadow-sm"
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10 flex items-center gap-2">
                                            <Icon className="w-4 h-4" />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                        </span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Tab content */}
                        <AnimatePresence mode="wait">

                            {/* ── Languages tab ── */}
                            {activeTab === 'languages' && (
                                <motion.div
                                    key="languages"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Inline limit banner */}
                                    {atLimit && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mb-5 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25 flex items-center gap-3"
                                        >
                                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex-1">
                                                {labels.limitReached}
                                            </span>
                                            <Link
                                                href={`/${lang}/panel/suscripcion?module=i18n`}
                                                className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 whitespace-nowrap transition-colors"
                                            >
                                                {labels.upgradePrompt} <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        </motion.div>
                                    )}

                                    <ListStagger>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {Object.entries(LANGUAGE_MAP).map(([code, info]) => {
                                                const isActive  = enabledLanguages.includes(code)
                                                const isDefault = data.defaultLanguage === code

                                                return (
                                                    <StaggerItem key={code}>
                                                        <SotaGlassCard
                                                            glowColor={isActive ? 'brand' : 'none'}
                                                            className={`p-6 transition-transform hover:-translate-y-1 ${!isActive ? 'opacity-60' : ''}`}
                                                        >
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-3xl drop-shadow-sm">{info.flag}</span>
                                                                    <div>
                                                                        <p className="text-base font-bold text-tx">{info.name}</p>
                                                                        <p className="text-xs font-medium text-tx-muted">{info.nativeName} · {code}</p>
                                                                    </div>
                                                                </div>
                                                                {isDefault && <Star className="w-5 h-5 text-amber-500 fill-amber-500/20" />}
                                                            </div>

                                                            {/* Translation progress bar */}
                                                            <div className="mt-4">
                                                                <div className="flex justify-between text-xs mb-1.5">
                                                                    <span className="font-semibold text-tx-muted uppercase tracking-wider">{labels.translationProgress}</span>
                                                                    <span className="font-bold text-tx">{TRANSLATION_PROGRESS[code] ?? 0}%</span>
                                                                </div>
                                                                <div className="h-2 bg-sf-1/50 rounded-full overflow-hidden shadow-inner">
                                                                    <motion.div
                                                                        className="h-full rounded-full"
                                                                        style={{
                                                                            backgroundColor: (TRANSLATION_PROGRESS[code] ?? 0) >= 80 ? '#50A12A'
                                                                                : (TRANSLATION_PROGRESS[code] ?? 0) >= 50 ? '#F59E0B'
                                                                                : '#EF4444',
                                                                        }}
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${TRANSLATION_PROGRESS[code] ?? 0}%` }}
                                                                        transition={{ duration: 0.8, delay: 0.2 }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Toggle */}
                                                            <div className="mt-5 pt-4 border-t border-sf-3/30 flex items-center justify-between">
                                                                {isActive ? (
                                                                    <span className="text-xs font-bold text-brand flex items-center gap-1.5">
                                                                        {isPendingLang
                                                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                                                            : <CheckCircle2 className="w-4 h-4" />
                                                                        }
                                                                        Activo
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs font-semibold text-tx-faint">Inactivo</span>
                                                                )}
                                                                <button
                                                                    onClick={() => toggleLanguage(code)}
                                                                    disabled={isPendingLang}
                                                                    aria-label={isActive ? `Desactivar ${info.name}` : `Activar ${info.name}`}
                                                                    className={`w-10 h-5 rounded-full relative transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                                                                        isActive ? 'bg-brand' : 'bg-sf-3'
                                                                    }`}
                                                                >
                                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                                                        isActive ? 'translate-x-5' : 'translate-x-0.5'
                                                                    }`} />
                                                                </button>
                                                            </div>
                                                        </SotaGlassCard>
                                                    </StaggerItem>
                                                )
                                            })}
                                        </div>
                                    </ListStagger>
                                </motion.div>
                            )}

                            {/* ── Currencies tab (unchanged) ── */}
                            {activeTab === 'currencies' && (
                                <motion.div
                                    key="currencies"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <SotaGlassCard glowColor="none" className="p-8">
                                        <h3 className="text-xl font-bold text-tx mb-6 flex items-center gap-2">
                                            <DollarSign className="w-5 h-5 text-brand" />
                                            {labels.currencyConfig}
                                        </h3>
                                        <ListStagger className="divide-y divide-surface-2 border-t border-sf-3/30">
                                            {Object.entries(CURRENCY_MAP).map(([code, info]) => {
                                                const isActive  = data.activeCurrencies.includes(code)
                                                const isDefault = data.defaultCurrency === code
                                                return (
                                                    <StaggerItem key={code}>
                                                        <div className={`flex items-center justify-between py-4 transition-opacity ${!isActive ? 'opacity-50 hover:opacity-80' : ''}`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl bg-sf-1/50 flex items-center justify-center border border-sf-3/30 shadow-inner">
                                                                    <span className="text-xl font-mono font-bold text-tx">{info.symbol}</span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-base font-bold text-tx flex items-center gap-2">
                                                                        {info.name}
                                                                        {isDefault && (
                                                                            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                                                                                <Star className="w-3 h-3 fill-current" /> Base
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    <p className="text-xs font-semibold text-tx-muted uppercase tracking-wider">{code}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-6">
                                                                <span className="text-xs font-semibold text-tx-muted font-mono bg-sf-1/50 px-3 py-1.5 rounded-lg border border-sf-3/30">
                                                                    1 USD = {info.rate} {code.toUpperCase()}
                                                                </span>
                                                                <div className={`w-10 h-5 rounded-full relative transition-colors ${isActive ? 'bg-brand' : 'bg-sf-3'}`}>
                                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </StaggerItem>
                                                )
                                            })}
                                        </ListStagger>
                                    </SotaGlassCard>
                                </motion.div>
                            )}

                            {/* ── Translations tab ── */}
                            {activeTab === 'translations' && (
                                <motion.div
                                    key="translations"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <SotaGlassCard glowColor="warning" className="p-8 border-l-4 border-l-amber-500">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                                <Globe className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-tx">{labels.translationProgress}</h3>
                                        </div>
                                        <p className="text-sm font-medium text-tx-sec mb-8 ml-12">
                                            Las traducciones se gestionan automáticamente. Puedes personalizar textos específicos desde la configuración.
                                        </p>
                                        <div className="bg-sf-0/30 rounded-2xl border border-sf-3/30 p-6 shadow-inner">
                                            <ListStagger className="space-y-6">
                                                {enabledLanguages.map(code => {
                                                    const info     = LANGUAGE_MAP[code]
                                                    const progress = TRANSLATION_PROGRESS[code] ?? 0
                                                    if (!info) return null
                                                    return (
                                                        <StaggerItem key={code}>
                                                            <div>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xl drop-shadow-sm">{info.flag}</span>
                                                                        <span className="text-sm font-bold text-tx">{info.name}</span>
                                                                    </div>
                                                                    <span className="text-sm font-bold text-tx-sec font-mono">{progress}%</span>
                                                                </div>
                                                                <div className="h-2.5 bg-sf-1 rounded-full overflow-hidden shadow-inner">
                                                                    <motion.div
                                                                        className="h-full rounded-full"
                                                                        style={{
                                                                            backgroundColor: progress >= 80 ? '#50A12A' : progress >= 50 ? '#F59E0B' : '#EF4444',
                                                                        }}
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${progress}%` }}
                                                                        transition={{ duration: 1, delay: 0.2, type: 'spring', bounce: 0.2 }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </StaggerItem>
                                                    )
                                                })}
                                            </ListStagger>
                                        </div>
                                    </SotaGlassCard>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </SotaBentoItem>

            </SotaBentoGrid>
        </PageEntrance>
    )
}
