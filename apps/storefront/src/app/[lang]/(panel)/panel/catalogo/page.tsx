/**
 * /panel/catalogo → Redirect to /panel/mi-tienda?tab=productos
 *
 * SOTA Redesign: Catalog has been consolidated into the "Mi Tienda" section.
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function CatalogoRedirect({
    params,
    searchParams,
}: {
    params: Promise<{ lang: string }>
    searchParams: Promise<{ tab?: string }>
}) {
    const { lang } = await params
    const { tab } = await searchParams
    // Preserve existing tab param if it was productos/categorias
    const targetTab = tab === 'categorias' ? 'categorias' : 'productos'
    redirect(`/${lang}/panel/mi-tienda?tab=${targetTab}`)
}
