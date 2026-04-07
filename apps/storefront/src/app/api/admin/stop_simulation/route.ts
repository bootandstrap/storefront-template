import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'es'

    const cookieStore = await cookies()
    // Borrar la cookie
    cookieStore.delete('simulating_client')

    redirect(`/${lang}/panel`)
}
