import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { requirePanelAuth } from '@/lib/panel-auth'

export async function GET(request: NextRequest): Promise<NextResponse | never> {
    // Require authenticated panel session (owner or super_admin)
    try {
        await requirePanelAuth()
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'es'

    const cookieStore = await cookies()
    // Borrar la cookie
    cookieStore.delete('simulating_client')

    redirect(`/${lang}/panel`)
}
