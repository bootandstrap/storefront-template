'use server'

import { revalidatePanel } from '@/lib/revalidate'
import type { StoreConfig } from '@/lib/config'
import { requirePanelAuth } from '@/lib/panel-auth'
import { StoreConfigUpdateSchema } from '@/lib/owner-validation'

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
        const { supabase, tenantId } = await requirePanelAuth()

        // Validate with Zod first (rejects unknown fields, XSS, oversized strings)
        const parsed = StoreConfigUpdateSchema.safeParse(configData)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
        }

        // Double-check: only allow whitelisted fields (defense in depth)
        const sanitized: Record<string, unknown> = {}
        for (const key of ALLOWED_CONFIG_FIELDS) {
            if (key in parsed.data) {
                sanitized[key] = parsed.data[key as keyof typeof parsed.data]
            }
        }

        if (Object.keys(sanitized).length === 0) {
            return { success: false, error: 'No valid fields to update' }
        }

        // Get the config row ID (single-row table per tenant)
        const { data: existing } = await supabase
            .from('config')
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(1)
            .single()

        if (!existing) {
            return { success: false, error: 'Config not found' }
        }

        const { error } = await supabase
            .from('config')
            .update(sanitized)
            .eq('id', existing.id)
            .eq('tenant_id', tenantId)

        if (error) {
            console.error('[panel/config] Save failed:', error)
            return { success: false, error: error.message }
        }

        revalidatePanel('all')
        return { success: true }
    } catch (err) {
        console.error('[panel/config] Error:', err)
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
}
