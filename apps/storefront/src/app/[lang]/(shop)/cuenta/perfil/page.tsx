import { createClient } from '@/lib/supabase/server'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { User, Mail, Phone, Camera, Save } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Server Action: Update profile
// ---------------------------------------------------------------------------

async function updateProfile(formData: FormData) {
    'use server'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fullName = formData.get('full_name') as string
    const phone = formData.get('phone') as string

    await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            phone: phone,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProfilePage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold font-display text-text-primary">
                {t('profile.title')}
            </h1>

            <form action={updateProfile} className="space-y-6">
                {/* Avatar section */}
                <div className="glass rounded-2xl p-6 flex items-center gap-4">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden">
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                (profile?.full_name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()
                            )}
                        </div>
                        <button
                            type="button"
                            className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-white shadow-lg hover:brightness-110 transition-all"
                        >
                            <Camera className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-text-primary">
                            {profile?.full_name || t('profile.noName')}
                        </p>
                        <p className="text-xs text-text-muted">
                            {t('profile.memberSince')}{' '}
                            {new Intl.DateTimeFormat(lang, {
                                month: 'long',
                                year: 'numeric',
                            }).format(new Date(user.created_at))}
                        </p>
                    </div>
                </div>

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
                                <span className="text-sm">{user.email}</span>
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
                <button type="submit" className="btn btn-primary py-2.5 px-6">
                    <Save className="w-4 h-4" />
                    {t('common.saveChanges')}
                </button>
            </form>
        </div>
    )
}
