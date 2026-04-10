/**
 * /panel/inventario → Redirect to /panel/mi-tienda?tab=inventario
 *
 * SOTA Redesign: consolidated into "Mi Tienda" section.
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RedirectPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    redirect(`/${lang}/panel/mi-tienda?tab=inventario`)
}
