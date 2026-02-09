import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { LayoutDashboard, ShoppingBag, UserCircle, MapPin, LogOut } from 'lucide-react'

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

    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || t('account.user')
    const email = user.email || ''

    const navItems = [
        { href: `/${lang}/cuenta`, label: t('account.dashboard'), icon: LayoutDashboard },
        { href: `/${lang}/cuenta/pedidos`, label: t('nav.orders'), icon: ShoppingBag },
        { href: `/${lang}/cuenta/perfil`, label: t('nav.profile'), icon: UserCircle },
        { href: `/${lang}/cuenta/direcciones`, label: t('nav.addresses'), icon: MapPin },
    ]

    return (
        <div className="container-page py-8">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
                {/* Sidebar */}
                <aside className="space-y-6">
                    {/* User info */}
                    <div className="glass rounded-xl p-4 space-y-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-text-primary truncate">{displayName}</p>
                            <p className="text-xs text-text-muted truncate">{email}</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="glass rounded-xl overflow-hidden">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-surface-2 hover:text-primary transition-all border-b border-surface-3 last:border-b-0"
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Logout */}
                    <form action="/api/auth/signout" method="POST">
                        <button
                            type="submit"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full rounded-xl transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            {t('nav.logout')}
                        </button>
                    </form>
                </aside>

                {/* Content */}
                <main className="min-w-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
