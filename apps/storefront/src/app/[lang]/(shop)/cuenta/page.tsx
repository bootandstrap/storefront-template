import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDictionary, createTranslator, type Locale } from '@/lib/i18n'
import { ShoppingBag, ArrowRight, Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CuentaPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const dictionary = await getDictionary(lang as Locale)
    const t = createTranslator(dictionary)

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('account.user')

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div className="glass rounded-xl p-6">
                <h1 className="text-2xl font-bold font-display text-text-primary mb-1">
                    {t('account.welcomeMessage', { name: displayName })}
                </h1>
                <p className="text-text-muted text-sm">
                    {t('account.welcomeHint')}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass rounded-xl p-5 text-center">
                    <p className="text-2xl font-bold text-primary">0</p>
                    <p className="text-xs text-text-muted mt-1">{t('account.totalOrders')}</p>
                </div>
                <div className="glass rounded-xl p-5 text-center">
                    <p className="text-2xl font-bold text-amber-500">0</p>
                    <p className="text-xs text-text-muted mt-1">{t('account.pendingOrders')}</p>
                </div>
                <div className="glass rounded-xl p-5 text-center">
                    <p className="text-2xl font-bold text-text-primary">—</p>
                    <p className="text-xs text-text-muted mt-1">{t('account.lastOrder')}</p>
                </div>
            </div>

            {/* Quick actions */}
            <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                    {t('account.recentOrders')}
                </h2>
                <div className="text-center py-8">
                    <Package className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
                    <p className="text-text-muted text-sm mb-4">{t('account.noOrders')}</p>
                    <Link href="/productos" className="btn btn-primary text-sm">
                        <ShoppingBag className="w-4 h-4" />
                        {t('account.explore')}
                    </Link>
                </div>
            </div>

            {/* View all orders link */}
            <Link
                href={`/${lang}/cuenta/pedidos`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
                {t('account.viewAllOrders')}
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    )
}
