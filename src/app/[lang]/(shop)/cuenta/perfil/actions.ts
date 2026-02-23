'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ProfileState {
    success: boolean
    error: string | null
}

export async function updateProfileAction(
    _prev: ProfileState,
    formData: FormData,
): Promise<ProfileState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'not_authenticated' }
    }

    const fullName = formData.get('full_name') as string
    const phone = formData.get('phone') as string

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name: fullName,
            phone: phone,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

    if (error) {
        console.error('[profile] Update failed:', error.message)
        return { success: false, error: 'update_failed' }
    }

    revalidatePath('/', 'layout')
    return { success: true, error: null }
}
