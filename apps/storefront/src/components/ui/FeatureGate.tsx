/**
 * FeatureGate — Upsell screen for blocked modules
 *
 * Renders a branded card when a feature is disabled because
 * the tenant hasn't purchased the corresponding module.
 *
 * Only shown to owner/super_admin users. Customers see a clean redirect.
 * Includes a reassuring note that the public does NOT see this screen.
 *
 * Usage in panel pages:
 *   if (!featureFlags.enable_analytics) {
 *       return <FeatureGate flag="enable_analytics" lang={lang} />
 *   }
 */

import Link from 'next/link'
import { FEATURE_GATE_MAP, getModuleInfoUrl } from '@/lib/feature-gate-config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'

interface FeatureGateProps {
    /** The feature flag key that is blocking access */
    flag: string
    /** Current locale */
    lang: string
}

export default async function FeatureGate({ flag, lang }: FeatureGateProps) {
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const entry = FEATURE_GATE_MAP[flag]
    const icon = entry?.icon ?? '🔒'
    const moduleName = entry ? t(entry.moduleNameKey) : flag
    const moduleUrl = getModuleInfoUrl(flag, lang)

    return (
        <div className="space-y-6">
            {/* Page title area (maintains layout consistency) */}
            <div>
                <h1 className="text-2xl font-bold font-display text-text-primary">
                    {moduleName}
                </h1>
            </div>

            {/* Upsell card */}
            <div className="glass rounded-2xl p-8 md:p-12 text-center max-w-lg mx-auto">
                <div className="text-5xl mb-4">{icon}</div>

                <h2 className="text-xl font-bold font-display text-text-primary mb-2">
                    {t('featureGate.title')}
                </h2>

                <p className="text-text-secondary mb-6">
                    {t('featureGate.description').replace('{module}', moduleName)}
                </p>

                {/* CTA — opens BSWEB module page in new tab */}
                <a
                    href={moduleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
                >
                    {t('featureGate.cta')}
                    <span aria-hidden="true">→</span>
                </a>

                {/* Back link */}
                <div className="mt-4">
                    <Link
                        href={`/${lang}/panel`}
                        className="text-sm text-text-muted hover:text-primary transition-colors"
                    >
                        ← {t('featureGate.backToPanel')}
                    </Link>
                </div>
            </div>

            {/* Owner-only reassurance note */}
            <div className="max-w-lg mx-auto">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <span className="text-blue-500 text-sm mt-0.5">ℹ️</span>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                        {t('featureGate.ownerOnly')}
                    </p>
                </div>
            </div>
        </div>
    )
}
