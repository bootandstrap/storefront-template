/**
 * /panel/productos → Redirect to /panel/catalogo?tab=productos
 *
 * The standalone products page has been consolidated into the unified
 * Catalog page (/panel/catalogo) which has tabs for Products, Categories,
 * and Badges. This redirect ensures zero cognitive load for owners —
 * one place for all catalog management.
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProductosRedirect({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    redirect(`/${lang}/panel/catalogo?tab=productos`)
}
