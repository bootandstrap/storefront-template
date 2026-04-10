/**
 * /panel/categorias → Redirect to /panel/mi-tienda?tab=categorias
 */
import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
export default async function CategoriasRedirect({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    redirect(`/${lang}/panel/mi-tienda?tab=categorias`)
}
