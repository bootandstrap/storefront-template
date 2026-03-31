'use client'

import { useState, useEffect, useCallback } from 'react'
import { Cookie, X, Check, ChevronDown, Link as LinkIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import {
    CONSENT_KEY,
    CONSENT_VERSION,
    DEFAULT_PREFS,
    invalidateConsentCache,
    type ConsentPrefs,
    type StoredConsent,
} from '@/lib/consent'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// ---------------------------------------------------------------------------
// Cookie Consent Banner — GDPR/ePrivacy compliant
// Gated by `enable_cookie_consent` feature flag in layout
// ---------------------------------------------------------------------------

type ConsentState = 'pending' | 'accepted' | 'rejected' | 'custom'

const CATEGORY_INFO = {
    necessary: { count: 5, icon: '🔒' },
    analytics: { count: 3, icon: '📊' },
    marketing: { count: 2, icon: '📢' },
}

export default function CookieConsentBanner() {
    const { t } = useI18n()
    const params = useParams()
    const lang = (params?.lang as string) || 'es'

    const [state, setState] = useState<ConsentState>('pending')
    const [showCustomize, setShowCustomize] = useState(false)
    const [prefs, setPrefs] = useState<ConsentPrefs>({ ...DEFAULT_PREFS })
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
            const saved = localStorage.getItem(CONSENT_KEY)
            if (saved) {
                const parsed = JSON.parse(saved) as StoredConsent
                // Force re-consent if version is outdated
                if ((parsed.version || 0) < CONSENT_VERSION) {
                    timer = setTimeout(() => setVisible(true), 1500)
                } else {
                    timer = setTimeout(() => setState(parsed.state || 'accepted'), 0)
                }
            } else {
                timer = setTimeout(() => setVisible(true), 1500)
            }
        } catch {
            timer = setTimeout(() => setVisible(true), 0)
        }
        return () => { if (timer) clearTimeout(timer) }
    }, [])

    const saveConsent = useCallback((newState: ConsentState, newPrefs: ConsentPrefs) => {
        setState(newState)
        try {
            localStorage.setItem(CONSENT_KEY, JSON.stringify({
                state: newState,
                prefs: newPrefs,
                timestamp: new Date().toISOString(),
                version: CONSENT_VERSION,
            }))
            invalidateConsentCache()
        } catch { /* degrade silently */ }
        setVisible(false)
    }, [])

    const acceptAll = () => saveConsent('accepted', { necessary: true, analytics: true, marketing: true })
    const rejectAll = () => saveConsent('rejected', { necessary: true, analytics: false, marketing: false })
    const acceptCustom = () => saveConsent('custom', prefs)

    if (state !== 'pending' || !visible) return null

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up safe-area-bottom"
            role="dialog"
            aria-label={t('cookies.title') || 'Cookie consent'}
            aria-modal="false"
        >
            <div className="max-w-2xl mx-auto glass rounded-2xl p-5 shadow-2xl border border-white/10">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center shrink-0">
                        <Cookie className="w-5 h-5 text-brand" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-tx">
                            {t('cookies.title') || 'Usamos cookies'}
                        </h3>
                        <p className="text-xs text-tx-muted mt-1 leading-relaxed">
                            {t('cookies.description') || 'Utilizamos cookies para mejorar tu experiencia, analizar el tráfico y personalizar contenido.'}
                        </p>
                    </div>
                    <button
                        onClick={rejectAll}
                        className="text-tx-muted hover:text-tx transition-colors"
                        aria-label={t('cookies.rejectAll') || 'Close'}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Customization panel */}
                {showCustomize && (
                    <div className="mb-4 space-y-2 p-3 rounded-xl bg-surface/50 border border-white/5">
                        {/* Necessary — always on */}
                        <div className="flex items-center justify-between p-2 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{CATEGORY_INFO.necessary.icon}</span>
                                <div>
                                    <span className="text-xs font-medium text-tx">{t('cookies.necessary') || 'Necesarias'}</span>
                                    <span className="text-[10px] text-tx-faint ml-1.5">({CATEGORY_INFO.necessary.count})</span>
                                </div>
                            </div>
                            <span className="text-[10px] text-tx-muted bg-sf-2 px-2 py-0.5 rounded-full">{t('cookies.required') || 'Requeridas'}</span>
                        </div>

                        {/* Analytics */}
                        <label className="flex items-center justify-between p-2 rounded-lg hover:bg-sf-2/30 transition-colors cursor-pointer">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{CATEGORY_INFO.analytics.icon}</span>
                                <div>
                                    <span className="text-xs font-medium text-tx">{t('cookies.analytics') || 'Analíticas'}</span>
                                    <span className="text-[10px] text-tx-faint ml-1.5">({CATEGORY_INFO.analytics.count})</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={prefs.analytics}
                                aria-label={t('cookies.analytics') || 'Analytics'}
                                onClick={() => setPrefs(p => ({ ...p, analytics: !p.analytics }))}
                                className={`relative w-10 h-5 rounded-full transition-colors ${prefs.analytics ? 'bg-brand' : 'bg-sf-3'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${prefs.analytics ? 'translate-x-5' : ''}`} />
                            </button>
                        </label>

                        {/* Marketing */}
                        <label className="flex items-center justify-between p-2 rounded-lg hover:bg-sf-2/30 transition-colors cursor-pointer">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{CATEGORY_INFO.marketing.icon}</span>
                                <div>
                                    <span className="text-xs font-medium text-tx">{t('cookies.marketing') || 'Marketing'}</span>
                                    <span className="text-[10px] text-tx-faint ml-1.5">({CATEGORY_INFO.marketing.count})</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={prefs.marketing}
                                aria-label={t('cookies.marketing') || 'Marketing'}
                                onClick={() => setPrefs(p => ({ ...p, marketing: !p.marketing }))}
                                className={`relative w-10 h-5 rounded-full transition-colors ${prefs.marketing ? 'bg-brand' : 'bg-sf-3'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${prefs.marketing ? 'translate-x-5' : ''}`} />
                            </button>
                        </label>

                        {/* Link to cookie policy */}
                        <Link
                            href={`/${lang}/legal/cookies`}
                            className="flex items-center gap-1.5 text-[10px] text-tx-faint hover:text-brand transition-colors pt-1"
                        >
                            <LinkIcon className="w-3 h-3" />
                            {t('cookies.learnMore') || 'Ver política de cookies detallada'}
                        </Link>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={acceptAll}
                        className="btn btn-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                    >
                        <Check className="w-3.5 h-3.5" />
                        {t('cookies.acceptAll') || 'Aceptar todo'}
                    </button>
                    {showCustomize ? (
                        <button
                            onClick={acceptCustom}
                            className="btn btn-secondary text-xs px-4 py-2 rounded-xl"
                        >
                            {t('cookies.savePreferences') || 'Guardar preferencias'}
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowCustomize(true)}
                            className="btn btn-ghost text-xs px-4 py-2 rounded-xl flex items-center gap-1"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                            {t('cookies.customize') || 'Personalizar'}
                        </button>
                    )}
                    <button
                        onClick={rejectAll}
                        className="btn btn-ghost text-xs px-4 py-2 rounded-xl ml-auto"
                    >
                        {t('cookies.rejectAll') || 'Rechazar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
