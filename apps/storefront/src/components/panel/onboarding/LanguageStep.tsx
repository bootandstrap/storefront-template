'use client'

/**
 * LanguageStep — E2E language configuration during onboarding
 *
 * Two sections:
 *   1. Panel language — single select for the owner panel UI language
 *   2. Storefront languages — multi-select if multi-language module active,
 *      single-select with upsell CTA if not
 *
 * All changes persist immediately via server actions (E2E, not batched).
 */

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Check, Globe, Lock, Sparkles } from 'lucide-react'
import {
    savePanelLanguageAction,
    saveStorefrontLanguageAction,
    saveActiveLanguagesAction,
} from '@/app/[lang]/(panel)/panel/actions'

interface LanguageStepProps {
    currentLanguage: string
    hasMultiLanguage: boolean
    maxLanguages: number
    activeLanguages: string[]
    locale: string
    onContinue: () => void
    onBack: () => void
    t: (key: string, fallback?: string) => string
}

const LANGUAGES = [
    { code: 'es', flag: '🇪🇸', label: 'Español', labelEn: 'Spanish' },
    { code: 'en', flag: '🇬🇧', label: 'English', labelEn: 'English' },
    { code: 'de', flag: '🇩🇪', label: 'Deutsch', labelEn: 'German' },
    { code: 'fr', flag: '🇫🇷', label: 'Français', labelEn: 'French' },
    { code: 'it', flag: '🇮🇹', label: 'Italiano', labelEn: 'Italian' },
] as const

export default function LanguageStep({
    currentLanguage,
    hasMultiLanguage,
    maxLanguages,
    activeLanguages: initialActiveLanguages,
    locale,
    onContinue,
    onBack,
    t,
}: LanguageStepProps) {
    const [panelLang, setPanelLang] = useState(currentLanguage || 'es')
    const [selectedStoreLangs, setSelectedStoreLangs] = useState<string[]>(
        initialActiveLanguages.length > 0 ? initialActiveLanguages : [currentLanguage || 'es']
    )
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const handlePanelLangChange = useCallback((code: string) => {
        setPanelLang(code)
        setSaved(false)
    }, [])

    const handleStoreLangToggle = useCallback((code: string) => {
        if (!hasMultiLanguage) {
            // Single language mode — replace selection
            setSelectedStoreLangs([code])
            setSaved(false)
            return
        }

        setSelectedStoreLangs(prev => {
            if (prev.includes(code)) {
                // Don't allow removing the last language
                if (prev.length <= 1) return prev
                return prev.filter(l => l !== code)
            }
            // Check max limit
            if (prev.length >= maxLanguages) return prev
            return [...prev, code]
        })
        setSaved(false)
    }, [hasMultiLanguage, maxLanguages])

    const handleSaveAndContinue = useCallback(async () => {
        setSaving(true)
        try {
            // Save panel language
            await savePanelLanguageAction(panelLang)
            // Save primary storefront language
            await saveStorefrontLanguageAction(selectedStoreLangs[0])

            // If multi-language, save all active languages
            if (hasMultiLanguage && selectedStoreLangs.length > 1) {
                await saveActiveLanguagesAction(selectedStoreLangs)
            }

            setSaved(true)
        } catch (err) {
            console.warn('[LanguageStep] Save failed:', err)
        }

        setSaving(false)
        onContinue()
    }, [panelLang, selectedStoreLangs, hasMultiLanguage, onContinue])

    return (
        <div className="px-6 py-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center">
                    <Globe className="w-5 h-5 text-brand" />
                </div>
                <div>
                    <h2 className="text-xl font-bold font-display text-tx">
                        {t('onboarding.language.title', 'Idiomas')}
                    </h2>
                    <p className="text-xs text-tx-muted">
                        {t('onboarding.language.subtitle', 'Configura los idiomas de tu panel y tienda')}
                    </p>
                </div>
            </div>

            {/* Panel Language */}
            <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-tx-sec mb-3">
                    🖥️ {t('onboarding.language.panel', 'Idioma del Panel')}
                </label>
                <p className="text-xs text-tx-faint mb-3">
                    {t('onboarding.language.panelDesc', 'El idioma que verás en tu panel de control')}
                </p>
                <div className="grid grid-cols-5 gap-2">
                    {LANGUAGES.map(lang => (
                        <motion.button
                            key={`panel-${lang.code}`}
                            type="button"
                            onClick={() => handlePanelLangChange(lang.code)}
                            whileTap={{ scale: 0.95 }}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                                panelLang === lang.code
                                    ? 'border-brand bg-brand-subtle shadow-sm shadow-brand/10'
                                    : 'border-sf-3 hover:border-sf-4 hover:bg-sf-2'
                            }`}
                        >
                            <span className="text-2xl">{lang.flag}</span>
                            <span className="text-[10px] font-medium text-tx-muted">{lang.label}</span>
                            {panelLang === lang.code && (
                                <Check className="w-3 h-3 text-brand" />
                            )}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Storefront Languages */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <label className="flex items-center gap-2 text-sm font-semibold text-tx-sec">
                        🛍️ {t('onboarding.language.storefront', 'Idiomas de la Tienda')}
                    </label>
                    {hasMultiLanguage && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-brand/10 text-brand">
                            Multi-idioma
                        </span>
                    )}
                </div>
                <p className="text-xs text-tx-faint mb-3">
                    {hasMultiLanguage
                        ? t('onboarding.language.storefrontMultiDesc', `Selecciona hasta ${maxLanguages} idiomas para tu tienda`)
                            .replace('{{max}}', String(maxLanguages))
                        : t('onboarding.language.storefrontDesc', 'El idioma principal que verán tus clientes')
                    }
                </p>
                <div className="grid grid-cols-5 gap-2">
                    {LANGUAGES.map(lang => {
                        const isSelected = selectedStoreLangs.includes(lang.code)
                        const isLocked = !hasMultiLanguage && !isSelected && selectedStoreLangs.length >= 1
                        const isAtLimit = hasMultiLanguage && !isSelected && selectedStoreLangs.length >= maxLanguages

                        return (
                            <motion.button
                                key={`store-${lang.code}`}
                                type="button"
                                onClick={() => handleStoreLangToggle(lang.code)}
                                whileTap={{ scale: 0.95 }}
                                disabled={isAtLimit}
                                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                                    isSelected
                                        ? 'border-brand bg-brand-subtle shadow-sm shadow-brand/10'
                                        : isLocked || isAtLimit
                                            ? 'border-sf-3 bg-sf-2/50 opacity-50 cursor-not-allowed'
                                            : 'border-sf-3 hover:border-sf-4 hover:bg-sf-2'
                                }`}
                            >
                                <span className="text-2xl">{lang.flag}</span>
                                <span className="text-[10px] font-medium text-tx-muted">{lang.label}</span>
                                {isSelected && (
                                    <Check className="w-3 h-3 text-brand" />
                                )}
                                {(isLocked && !hasMultiLanguage) && (
                                    <Lock className="w-3 h-3 text-tx-faint" />
                                )}
                            </motion.button>
                        )
                    })}
                </div>
            </div>

            {/* Multi-language upsell */}
            {!hasMultiLanguage && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-gradient-to-r from-brand-subtle to-sf-2 border border-brand/20 mb-4"
                >
                    <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-tx mb-1">
                                {t('onboarding.language.upsellTitle', '¿Necesitas más idiomas?')}
                            </p>
                            <p className="text-[11px] text-tx-muted mb-2">
                                {t('onboarding.language.upsellDesc', 'Con el módulo Multiidioma puedes ofrecer tu tienda en hasta 5 idiomas y monedas.')}
                            </p>
                            <a
                                href={`/${locale}/panel/modulos`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                            >
                                {t('onboarding.language.upsellCTA', 'Activar Multiidioma →')}
                            </a>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Status indicator */}
            {saved && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 mb-4"
                >
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-green-400 font-medium">
                        {t('onboarding.language.saved', 'Idiomas guardados correctamente')}
                    </span>
                </motion.div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-sf-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-sm text-tx-muted hover:text-tx transition-colors"
                >
                    ← {t('onboarding.back', 'Volver')}
                </button>
                <button
                    type="button"
                    onClick={handleSaveAndContinue}
                    disabled={saving}
                    className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                    {saving
                        ? t('onboarding.saving', 'Guardando...')
                        : t('onboarding.continue', 'Continuar')
                    } →
                </button>
            </div>
        </div>
    )
}
