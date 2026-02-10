/**
 * (panel) group layout — Owner Panel chrome
 *
 * Auth guard: owner or super_admin only.
 * Includes: PanelSidebar + content area.
 * Feature-gated: only accessible when enable_owner_panel flag is on.
 */

import { redirect } from 'next/navigation'
import { getConfig } from '@/lib/config'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { isPanelRole } from '@/lib/panel-access-policy'
import PanelSidebar from '@/components/panel/PanelSidebar'

export default async function PanelLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const { config, featureFlags } = await getConfig()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    // Feature gate: enable_owner_panel
    if (!featureFlags.enable_owner_panel) {
        redirect(`/${lang}`)
    }

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

    if (!isPanelRole(profile?.role)) {
        // Not authorized for panel — redirect to customer account
        redirect(`/${lang}/cuenta`)
    }

    return (
        <div className="flex min-h-screen bg-surface-0">
            <PanelSidebar
                lang={lang}
                businessName={config.business_name}
                t={t}
            />
            <div className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-6 py-8">
                    {children}
                </div>
            </div>
        </div>
    )
}
