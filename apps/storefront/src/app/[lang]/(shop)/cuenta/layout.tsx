import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AccountSidebar from '@/components/account/AccountSidebar'

export const dynamic = 'force-dynamic'

export default async function CuentaLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${lang}/login`)
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
                />

                {/* Content */}
                <main className="min-w-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
