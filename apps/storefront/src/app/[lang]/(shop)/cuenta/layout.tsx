import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getConfig } from '@/lib/config'
import AccountSidebar from '@/components/account/AccountSidebar'
import { isPanelRole } from '@/lib/panel-access-policy'

import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function CuentaLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { featureFlags } = await getConfig()

    // Gate: customer accounts must be enabled
    if (!featureFlags.enable_customer_accounts) {
        redirect(`/${lang}`)
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${lang}/login`)
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const cookieStore = await cookies()
    const isSimulating = cookieStore.get('simulating_client')?.value === 'true'

    // Owners should always use the Owner Panel, not customer account
    if (isPanelRole(profile?.role) && !isSimulating) {
        redirect(`/${lang}/panel`)
    }

    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
    const email = user.email || ''

    return (
        <div className="container-page py-8">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
                {/* Sidebar — client component with active state */}
                <AccountSidebar
                    lang={lang}
                    displayName={displayName}
                    email={email}
                    featureFlags={featureFlags}
                />

                {/* Content */}
                <main className="min-w-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
