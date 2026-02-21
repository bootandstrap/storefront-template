/**
 * [lang] layout — locale resolution + I18nProvider + tenant status guard
 *
 * This dynamic segment validates the locale, loads the dictionary,
 * and wraps children in I18nProvider for client-side translations.
 *
 * IMPORTANT: Tenant status check (paused / suspended) happens HERE
 * so ALL routes under /{lang}/* are blocked — login, register, panel, etc.
 * Owners manage the store from the SuperAdmin panel at :3100.
 */

import { redirect } from 'next/navigation'
import { MessageCircle, AlertTriangle, Clock } from 'lucide-react'
import { getDictionary, isValidLocale, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { createTranslator } from '@/lib/i18n'
import { getPreferredLocale } from '@/lib/i18n/locale'
import { I18nProvider } from '@/lib/i18n/provider'
import { getConfig } from '@/lib/config'

export async function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ lang: locale }))
}

export const dynamic = 'force-dynamic'

export default async function LangLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const appConfig = await getConfig()
    const { config, tenantStatus, _degraded, trialDaysRemaining } = appConfig

    // Validate locale
    if (!isValidLocale(lang)) {
        const preferred = await getPreferredLocale(config.language)
        redirect(`/${preferred}`)
    }

    // -----------------------------------------------------------------------
    // Governance: tenant status (paused / suspended) — blocks ALL routes
    // -----------------------------------------------------------------------
    if (tenantStatus === 'paused' || tenantStatus === 'suspended') {
        const locale = lang as Locale
        const dictionary = await getDictionary(locale)
        const t = createTranslator(dictionary)
        const isSuspended = tenantStatus === 'suspended'

        return (
            <I18nProvider locale={locale} dictionary={dictionary}>
                <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
                    <div className="glass-strong rounded-2xl p-12 text-center max-w-lg">
                        <div className="text-6xl mb-6">{isSuspended ? '🚫' : '⏸️'}</div>
                        <h1 className="text-3xl font-bold font-display text-text-primary mb-3">
                            {t(isSuspended ? 'tenant.suspended.title' : 'tenant.paused.title')}
                        </h1>
                        <p className="text-text-muted text-lg">
                            {t(isSuspended ? 'tenant.suspended.description' : 'tenant.paused.description')}
                        </p>
                        {config.whatsapp_number && (
                            <a
                                href={`https://wa.me/${config.whatsapp_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-whatsapp mt-6 inline-flex items-center gap-2"
                            >
                                <MessageCircle className="w-5 h-5" />
                                {t('maintenance.contactUs')}
                            </a>
                        )}
                    </div>
                </div>
            </I18nProvider>
        )
    }

    const locale = lang as Locale
    const dictionary = await getDictionary(locale)

    return (
        <I18nProvider locale={locale} dictionary={dictionary}>
            {/* Degraded config banner — Supabase unreachable */}
            {_degraded && process.env.NODE_ENV === 'production' && (
                <div className="bg-amber-500 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Configuración en modo degradado — datos de respaldo activos. Contacta al administrador.</span>
                </div>
            )}

            {/* Trial countdown banner */}
            {tenantStatus === 'trial' && trialDaysRemaining !== undefined && (
                <div className="bg-blue-600 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>
                        Trial — {trialDaysRemaining === 0
                            ? 'último día'
                            : `${trialDaysRemaining} día${trialDaysRemaining !== 1 ? 's' : ''} restante${trialDaysRemaining !== 1 ? 's' : ''}`
                        }
                    </span>
                </div>
            )}

            {children}
        </I18nProvider>
    )
}
