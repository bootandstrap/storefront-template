'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { loginAction, type LoginState } from './actions'

interface LoginFormProps {
    lang: string
    showGoogleAuth: boolean
    showRegistration: boolean
}

const ERROR_MESSAGES: Record<string, string> = {
    invalid_credentials: 'auth.invalidCredentials',
    email_not_confirmed: 'auth.emailNotConfirmed',
    unknown_error: 'auth.unknownError',
}

export default function LoginForm({
    lang,
    showGoogleAuth,
    showRegistration,
}: LoginFormProps) {
    const { t } = useI18n()

    const initialState: LoginState = { error: null, success: false }

    const [state, formAction, isPending] = useActionState(loginAction, initialState)

    const errorMessage = state.error ? t(ERROR_MESSAGES[state.error] || 'auth.unknownError') : null

    return (
        <>
            <form action={formAction} className="space-y-4">
                <input type="hidden" name="lang" value={lang} />

                {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500">
                        {errorMessage}
                    </div>
                )}

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                        {t('auth.email')}
                    </label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        required
                        autoComplete="email"
                        className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                        placeholder="email@example.com"
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
                        autoComplete="current-password"
                        className="w-full px-4 py-2.5 rounded-xl border border-surface-3 bg-surface-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                </div>

                {/* Forgot password */}
                <div className="flex justify-end">
                    <Link
                        href={`/${lang}/login?forgot=1`}
                        className="text-xs text-primary hover:underline"
                    >
                        {t('auth.forgotPassword')}
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary w-full disabled:opacity-60"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('common.loading')}
                        </>
                    ) : (
                        t('auth.submit')
                    )}
                </button>
            </form>

            {/* Social auth */}
            {showGoogleAuth && (
                <>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-3" /></div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-2 bg-surface-0 text-text-muted">{t('auth.orContinueWith')}</span>
                        </div>
                    </div>
                    <a
                        href={`/${lang}/auth/callback?provider=google`}
                        className="btn btn-ghost w-full border border-surface-3 text-sm"
                    >
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        Google
                    </a>
                </>
            )}

            {/* Register link */}
            {showRegistration && (
                <p className="text-center text-sm text-text-muted">
                    {t('auth.noAccount')}{' '}
                    <Link href={`/${lang}/registro`} className="text-primary font-medium hover:underline">
                        {t('auth.register')}
                    </Link>
                </p>
            )}
        </>
    )
}
