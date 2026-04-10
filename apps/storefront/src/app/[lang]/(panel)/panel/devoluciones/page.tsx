/**
 * /panel/devoluciones → Redirect to /panel/ventas?tab=devoluciones
 *
 * SOTA Redesign: consolidated into "Ventas" section.
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RedirectPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    redirect(`/${lang}/panel/ventas?tab=devoluciones`)
}
