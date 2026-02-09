'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { StoreConfig } from '@/lib/config'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requirePanelAuth() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['owner', 'super_admin', 'admin'].includes(profile.role)) {
        throw new Error('Insufficient permissions')
    }

    return { supabase, user, role: profile.role }
}

// Whitelist of config columns that can be updated from Owner Panel
const ALLOWED_CONFIG_FIELDS: (keyof StoreConfig)[] = [
    'business_name', 'whatsapp_number', 'default_country_prefix',
    'store_email', 'store_phone', 'store_address',
    'logo_url', 'favicon_url',
    'color_preset', 'theme_mode',
    'accent_color', 'primary_color', 'secondary_color',
    'hero_title', 'hero_subtitle', 'hero_image',
    'footer_description',
    'announcement_bar_text', 'announcement_bar_enabled',
    'meta_title', 'meta_description',
    'social_facebook', 'social_instagram', 'social_tiktok', 'social_twitter',
    'bank_name', 'bank_account_type', 'bank_account_number',
    'bank_account_holder', 'bank_id_number',
    'min_order_amount', 'max_delivery_radius_km',
    'delivery_info_text', 'business_hours',
    'google_analytics_id', 'facebook_pixel_id',
    'custom_css',
    'language', 'timezone',
    'active_languages', 'active_currencies', 'default_currency',
]

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export async function saveStoreConfig(
    configData: Partial<StoreConfig>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { supabase } = await requirePanelAuth()

        // Sanitize: only allow whitelisted fields
        const sanitized: Record<string, unknown> = {}
        for (const key of ALLOWED_CONFIG_FIELDS) {
            if (key in configData) {
                sanitized[key] = configData[key]
            }
        }

        if (Object.keys(sanitized).length === 0) {
            return { success: false, error: 'No valid fields to update' }
        }

        // Get the config row ID (single-row table per tenant)
        const { data: existing } = await supabase
            .from('config')
            .select('id')
            .limit(1)
            .single()

        if (!existing) {
            return { success: false, error: 'Config not found' }
        }

        const { error } = await supabase
            .from('config')
            .update(sanitized)
            .eq('id', existing.id)

        if (error) {
            console.error('[panel/config] Save failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (err) {
        console.error('[panel/config] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
