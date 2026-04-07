/**
 * /panel/categorias → Redirect to /panel/catalogo?tab=categorias
 *
 * The standalone categories page has been consolidated into the unified
 * Catalog page (/panel/catalogo) which has tabs for Products, Categories,
 * and Badges. This redirect ensures zero cognitive load for owners —
 * one place for all catalog management.
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CategoriasRedirect({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    redirect(`/${lang}/panel/catalogo?tab=categorias`)
}
