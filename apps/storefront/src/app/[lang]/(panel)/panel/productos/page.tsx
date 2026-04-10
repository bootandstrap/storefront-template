/**
 * /panel/productos → Redirect to /panel/mi-tienda?tab=productos
 */
import { redirect } from 'next/navigation'
export const dynamic = 'force-dynamic'
export default async function ProductosRedirect({ params }: { params: Promise<{ lang: string }> }) {
    const { lang } = await params
    redirect(`/${lang}/panel/mi-tienda?tab=productos`)
}
