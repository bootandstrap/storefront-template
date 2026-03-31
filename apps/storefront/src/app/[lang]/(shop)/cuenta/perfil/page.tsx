import { createClient } from '@/lib/supabase/server'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import AvatarUpload from '@/components/account/AvatarUpload'
import ProfileForm from './ProfileForm'
import ChangePasswordForm from '@/components/account/ChangePasswordForm'
import DeleteAccountSection from '@/components/account/DeleteAccountSection'

export const dynamic = 'force-dynamic'

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
            <h1 className="text-2xl font-bold font-display text-tx">
                {t('profile.title')}
            </h1>

            {/* Avatar section — client component */}
            <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url ?? null}
                userName={profile?.full_name ?? null}
                userEmail={user.email ?? ''}
                memberSince={user.created_at}
            />

            {/* Profile form — client component with save feedback */}
            <ProfileForm
                profile={{
                    full_name: profile?.full_name ?? null,
                    phone: profile?.phone ?? null,
                }}
                userEmail={user.email ?? ''}
            />

            {/* Security section */}
            <div className="pt-2">
                <h2 className="text-lg font-bold font-display text-tx mb-4">
                    {t('profile.security') || 'Security'}
                </h2>
                <div className="space-y-6">
                    <ChangePasswordForm />
                    <DeleteAccountSection />
                </div>
            </div>
        </div>
    )
}
