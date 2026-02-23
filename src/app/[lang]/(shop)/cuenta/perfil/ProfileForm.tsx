'use client'

import { useActionState, useEffect, useRef } from 'react'
import { User, Mail, Phone, Save, Loader2, CheckCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { updateProfileAction, type ProfileState } from './actions'

interface ProfileFormProps {
    profile: {
        full_name: string | null
        phone: string | null
    }
    userEmail: string
}

export default function ProfileForm({ profile, userEmail }: ProfileFormProps) {
    const { t } = useI18n()
    const initialState: ProfileState = { success: false, error: null }
    const [state, formAction, isPending] = useActionState(updateProfileAction, initialState)
    const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Auto-dismiss success message after 3 seconds
    useEffect(() => {
        if (state.success) {
            successTimeoutRef.current = setTimeout(() => {
                // The state will naturally reset on next submission
            }, 3000)
        }
        return () => {
            if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
        }
    }, [state.success])

    return (
        <form action={formAction} className="space-y-6">
            {/* Success feedback */}
            {state.success && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400 animate-fade-in">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    {t('profile.saved')}
                </div>
            )}

            {/* Error feedback */}
            {state.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-500 animate-fade-in">
                    {t('profile.error')}
                </div>
            )}

            {/* Form fields */}
            <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-primary" />
                    {t('profile.personalInfo')}
                </h2>

                <div>
                    <label className="text-sm text-text-secondary block mb-1">
                        {t('profile.fullName')}
                    </label>
                    <input
                        type="text"
                        name="full_name"
                        defaultValue={profile?.full_name ?? ''}
                        placeholder={t('profile.fullNamePlaceholder')}
                        className="input w-full"
                    />
                </div>

                <div>
                    <label className="text-sm text-text-secondary block mb-1">
                        {t('auth.email')}
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="input w-full flex items-center gap-2 opacity-60 cursor-not-allowed">
                            <Mail className="w-4 h-4 text-text-muted" />
                            <span className="text-sm">{userEmail}</span>
                        </div>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                        {t('profile.emailChangeHint')}
                    </p>
                </div>

                <div>
                    <label className="text-sm text-text-secondary block mb-1">
                        {t('profile.phone')}
                    </label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        <input
                            type="tel"
                            name="phone"
                            defaultValue={profile?.phone ?? ''}
                            placeholder="+1 555 123 4567"
                            className="input w-full pl-10"
                        />
                    </div>
                </div>
            </div>

            {/* Save button */}
            <button type="submit" disabled={isPending} className="btn btn-primary py-2.5 px-6 disabled:opacity-60">
                {isPending ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('common.saving')}
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4" />
                        {t('common.saveChanges')}
                    </>
                )}
            </button>
        </form>
    )
}
