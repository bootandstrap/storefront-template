'use client'

/**
 * i18n Client — Owner Panel (SOTA)
 *
 * Features:
 * - Language cards with enable/disable toggles
 * - Currency management with exchange rate display
 * - Translation progress bars
 * - Plan limit usage meters
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Globe, Languages, DollarSign, CheckCircle2,
    Plus, Star, BarChart3,
} from 'lucide-react'

import StatCard from '@/components/panel/StatCard'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'

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
}

interface I18nClientProps {
    data: I18nData
    labels: Labels
    lang: string
}

// ---------------------------------------------------------------------------
// Language map
// ---------------------------------------------------------------------------

const LANGUAGE_MAP: Record<string, { name: string; flag: string; nativeName: string }> = {
    es: { name: 'Español', flag: '🇪🇸', nativeName: 'Español' },
    en: { name: 'English', flag: '🇬🇧', nativeName: 'English' },
    fr: { name: 'Français', flag: '🇫🇷', nativeName: 'Français' },
    de: { name: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' },
    pt: { name: 'Português', flag: '🇧🇷', nativeName: 'Português' },
    it: { name: 'Italiano', flag: '🇮🇹', nativeName: 'Italiano' },
}

const CURRENCY_MAP: Record<string, { name: string; symbol: string; rate: number }> = {
    usd: { name: 'US Dollar', symbol: '$', rate: 1.0 },
    eur: { name: 'Euro', symbol: '€', rate: 0.92 },
    chf: { name: 'Swiss Franc', symbol: 'CHF', rate: 0.88 },
    gbp: { name: 'British Pound', symbol: '£', rate: 0.79 },
    brl: { name: 'Brazilian Real', symbol: 'R$', rate: 4.97 },
    mxn: { name: 'Mexican Peso', symbol: 'MX$', rate: 17.15 },
}

// Simulated translation completeness
const TRANSLATION_PROGRESS: Record<string, number> = {
    es: 100, en: 85, fr: 42, de: 28, pt: 65, it: 15,
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type TabId = 'languages' | 'currencies' | 'translations'

export default function I18nClient({ data, labels, lang }: I18nClientProps) {
    const [activeTab, setActiveTab] = useState<TabId>('languages')

    const tabs: { id: TabId; label: string }[] = [
        { id: 'languages', label: labels.tabLanguages },
        { id: 'currencies', label: labels.tabCurrencies },
        { id: 'translations', label: labels.tabTranslations },
    ]

    return (
        <PageEntrance>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard
                    label={labels.activeLanguages}
                    value={`${data.activeLanguages.length}/${data.maxLanguages}`}
                    icon={<Languages className="w-5 h-5" />}
                />
                <StatCard
                    label={labels.activeCurrencies}
                    value={`${data.activeCurrencies.length}/${data.maxCurrencies}`}
                    icon={<DollarSign className="w-5 h-5" />}
                />
                <StatCard
                    label={labels.translationProgress}
                    value={`${Math.round(data.activeLanguages.reduce((sum, lang) => sum + (TRANSLATION_PROGRESS[lang] ?? 0), 0) / data.activeLanguages.length)}%`}
                    icon={<BarChart3 className="w-5 h-5" />}
                />
            </div>

            {/* ── Tab Navigation ── */}
            <div className="flex gap-1 bg-[var(--color-gray-100,#f3f4f6)] rounded-xl p-1 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === tab.id
                                ? 'text-[var(--color-gray-900,#111827)]'
                                : 'text-[var(--color-gray-500,#6b7280)] hover:text-[var(--color-gray-700,#374151)]'
                        }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="i18n-tab-indicator"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'languages' && (
                    <motion.div
                        key="languages"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ListStagger>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(LANGUAGE_MAP).map(([code, info]) => {
                                    const isActive = data.activeLanguages.includes(code)
                                    const isDefault = data.defaultLanguage === code

                                    return (
                                        <StaggerItem key={code}>
                                            <motion.div
                                                className={`bg-white rounded-2xl border p-5 transition-shadow hover:shadow-md ${
                                                    isActive
                                                        ? 'border-[var(--color-emerald-200,#a7f3d0)]'
                                                        : 'border-[var(--color-gray-200,#e5e7eb)] opacity-60'
                                                }`}
                                                whileHover={{ y: -2 }}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{info.flag}</span>
                                                        <div>
                                                            <p className="text-sm font-semibold text-[var(--color-gray-800,#1f2937)]">
                                                                {info.name}
                                                            </p>
                                                            <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                                                {info.nativeName} · {code}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isDefault && (
                                                        <Star className="w-4 h-4 text-[var(--color-amber-500,#f59e0b)] fill-current" />
                                                    )}
                                                </div>

                                                {/* Translation progress */}
                                                <div className="mt-2">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-[var(--color-gray-500,#6b7280)]">
                                                            {labels.translationProgress}
                                                        </span>
                                                        <span className="font-medium text-[var(--color-gray-700,#374151)]">
                                                            {TRANSLATION_PROGRESS[code] ?? 0}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-[var(--color-gray-100,#f3f4f6)] rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                backgroundColor: (TRANSLATION_PROGRESS[code] ?? 0) >= 80
                                                                    ? 'var(--color-emerald-500, #10b981)'
                                                                    : (TRANSLATION_PROGRESS[code] ?? 0) >= 50
                                                                    ? 'var(--color-amber-500, #f59e0b)'
                                                                    : 'var(--color-red-400, #f87171)',
                                                            }}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${TRANSLATION_PROGRESS[code] ?? 0}%` }}
                                                            transition={{ duration: 0.8, delay: 0.2 }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Toggle */}
                                                <div className="mt-3 flex items-center justify-between">
                                                    {isActive ? (
                                                        <span className="text-xs text-[var(--color-emerald-600,#059669)] flex items-center gap-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-[var(--color-gray-400,#9ca3af)]">Inactivo</span>
                                                    )}
                                                    <div className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                                                        isActive ? 'bg-[var(--color-emerald-500,#10b981)]' : 'bg-[var(--color-gray-200,#e5e7eb)]'
                                                    }`}>
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                                            isActive ? 'translate-x-4' : 'translate-x-0.5'
                                                        }`} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </StaggerItem>
                                    )
                                })}

                                {/* Add language button */}
                                {data.activeLanguages.length < data.maxLanguages && (
                                    <StaggerItem>
                                        <button className="w-full h-full min-h-[160px] bg-[var(--color-gray-50,#f9fafb)] rounded-2xl border-2 border-dashed border-[var(--color-gray-200,#e5e7eb)] hover:border-[var(--color-gray-300,#d1d5db)] transition-colors flex flex-col items-center justify-center gap-2">
                                            <Plus className="w-6 h-6 text-[var(--color-gray-400,#9ca3af)]" />
                                            <span className="text-sm text-[var(--color-gray-500,#6b7280)]">{labels.addLanguage}</span>
                                        </button>
                                    </StaggerItem>
                                )}
                            </div>
                        </ListStagger>
                    </motion.div>
                )}

                {activeTab === 'currencies' && (
                    <motion.div
                        key="currencies"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                            <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)] mb-4">
                                {labels.currencyConfig}
                            </h3>
                            <ListStagger>
                                {Object.entries(CURRENCY_MAP).map(([code, info]) => {
                                    const isActive = data.activeCurrencies.includes(code)
                                    const isDefault = data.defaultCurrency === code

                                    return (
                                        <StaggerItem key={code}>
                                            <div className={`flex items-center justify-between py-3 border-b border-[var(--color-gray-100,#f3f4f6)] last:border-0 ${
                                                !isActive ? 'opacity-50' : ''
                                            }`}>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-mono font-bold text-[var(--color-gray-700,#374151)] w-12">
                                                        {info.symbol}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-medium text-[var(--color-gray-800,#1f2937)]">
                                                            {info.name}
                                                            {isDefault && (
                                                                <Star className="w-3 h-3 text-[var(--color-amber-500,#f59e0b)] fill-current inline ml-1" />
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)] uppercase">{code}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs text-[var(--color-gray-400,#9ca3af)] font-mono">
                                                        1 USD = {info.rate} {code.toUpperCase()}
                                                    </span>
                                                    <div className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                                                        isActive ? 'bg-[var(--color-emerald-500,#10b981)]' : 'bg-[var(--color-gray-200,#e5e7eb)]'
                                                    }`}>
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                                            isActive ? 'translate-x-4' : 'translate-x-0.5'
                                                        }`} />
                                                    </div>
                                                </div>
                                            </div>
                                        </StaggerItem>
                                    )
                                })}
                            </ListStagger>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'translations' && (
                    <motion.div
                        key="translations"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Globe className="w-5 h-5 text-[var(--color-gray-500,#6b7280)]" />
                                <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)]">
                                    {labels.translationProgress}
                                </h3>
                            </div>
                            <p className="text-sm text-[var(--color-gray-400,#9ca3af)] mb-4">
                                Las traducciones se gestionan automáticamente. Puedes personalizar textos específicos desde la configuración.
                            </p>
                            <ListStagger>
                                {data.activeLanguages.map((code) => {
                                    const info = LANGUAGE_MAP[code]
                                    const progress = TRANSLATION_PROGRESS[code] ?? 0
                                    if (!info) return null

                                    return (
                                        <StaggerItem key={code}>
                                            <div className="py-3 border-b border-[var(--color-gray-100,#f3f4f6)] last:border-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span>{info.flag}</span>
                                                        <span className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                                                            {info.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-bold text-[var(--color-gray-800,#1f2937)]">
                                                        {progress}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-[var(--color-gray-100,#f3f4f6)] rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            backgroundColor: progress >= 80
                                                                ? 'var(--color-emerald-500, #10b981)'
                                                                : progress >= 50
                                                                ? 'var(--color-amber-500, #f59e0b)'
                                                                : 'var(--color-red-400, #f87171)',
                                                        }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1, delay: 0.2 }}
                                                    />
                                                </div>
                                            </div>
                                        </StaggerItem>
                                    )
                                })}
                            </ListStagger>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageEntrance>
    )
}
