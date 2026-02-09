import Link from 'next/link'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { getConfig } from '@/lib/config'
import { isFeatureEnabled } from '@/lib/features'

export const dynamic = 'force-dynamic'

export default async function RegistroPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { config, featureFlags } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)
    const businessName = config.business_name || 'Store'

    if (!isFeatureEnabled(featureFlags, 'enable_user_registration')) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
                <p className="text-text-muted">{t('common.pageNotFound')}</p>
            </div>
        )
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                <div className="glass-strong rounded-2xl p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold font-display text-text-primary">
                            {t('auth.createAccount')}
                        </h1>
                        <p className="text-sm text-text-muted mt-1">
                            {t('auth.registerSubtitle', { store: businessName })}
                        </p>
                    </div>

                    <form className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="first_name" className="block text-sm font-medium text-text-secondary mb-1">
                                    {t('auth.firstName')}
                                </label>
                                <input
                                    id="first_name"
                                    type="text"
                                    name="first_name"
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                            </div>
                            <div>
                                <label htmlFor="last_name" className="block text-sm font-medium text-text-secondary mb-1">
                                    {t('auth.lastName')}
                                </label>
                                <input
                                    id="last_name"
                                    type="text"
                                    name="last_name"
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                                {t('auth.email')}
                            </label>
                            <input
                                id="email"
                                type="email"
                                name="email"
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                placeholder="email@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1">
                                {t('auth.whatsappOptional')}
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                name="phone"
                                className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                                {t('auth.password')}
                            </label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                required
                                minLength={6}
                                className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                            <p className="text-xs text-text-muted mt-1">{t('auth.passwordHint')}</p>
                        </div>

                        <button type="submit" className="btn btn-primary w-full">
                            {t('auth.createButton')}
                        </button>
                    </form>

                    {/* Login link */}
                    <p className="text-center text-sm text-text-muted">
                        {t('auth.hasAccount')}{' '}
                        <Link href="/login" className="text-primary font-medium hover:underline">
                            {t('auth.signIn')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
