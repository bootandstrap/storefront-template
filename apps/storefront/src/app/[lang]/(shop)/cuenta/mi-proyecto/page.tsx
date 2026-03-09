/**
 * Legacy redirect — mi-proyecto moved to owner panel
 * Customers accessing this URL will be redirected to their account dashboard.
 * Owners are already redirected by the cuenta layout guard.
 */
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MiProyectoRedirect({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    redirect(`/${lang}/cuenta`)
}
