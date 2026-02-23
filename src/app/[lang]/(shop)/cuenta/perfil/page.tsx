import { createClient } from '@/lib/supabase/server'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import AvatarUpload from '@/components/account/AvatarUpload'
import ProfileForm from './ProfileForm'

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
            <h1 className="text-2xl font-bold font-display text-text-primary">
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
        </div>
    )
}
