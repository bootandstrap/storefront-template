/**
 * (panel) group layout — Owner Panel chrome
 *
 * Minimal layout for the owner panel.
 * No Header/Footer from storefront — uses its own sidebar.
 * Auth guard: requires 'owner' or 'super_admin' role.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PanelGroupLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params

    // Auth guard: check for owner or super_admin role
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/${lang}/login`)
    }

    // Check role in profiles table
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role
    if (role !== 'owner' && role !== 'super_admin') {
        // Not authorized for panel — redirect to customer account
        redirect(`/${lang}/cuenta`)
    }

    return (
        <div className="panel-layout">
            {children}
        </div>
    )
}
