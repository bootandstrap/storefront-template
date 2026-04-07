import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'es'

    const cookieStore = await cookies()
    // Set cookie for 1 hour to bypass the panel redirect in cuenta/layout.tsx
    cookieStore.set('simulating_client', 'true', {
        path: '/',
        maxAge: 3600,
        httpOnly: true, // Only accessible on server side
    })

    redirect(`/${lang}/cuenta`)
}
