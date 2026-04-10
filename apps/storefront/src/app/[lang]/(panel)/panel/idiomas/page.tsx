/**
 * /panel/idiomas → Redirect to /panel/ajustes?tab=idiomas
 *
 * SOTA Redesign: consolidated into "Ajustes" section.
 */

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RedirectPage({
    params,
}: {
    params: Promise<{ lang: string }>
}) {
    const { lang } = await params
    redirect(`/${lang}/panel/ajustes?tab=idiomas`)
}
