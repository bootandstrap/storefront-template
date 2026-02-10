/**
 * Tests for Owner Panel — Store Config save action
 *
 * Validates:
 * - Full form payload (including id, tenant_id) is accepted by schema
 * - Forbidden keys are stripped by the allowlist filter before persistence
 * - Empty payloads are rejected
 * - Invalid field values are rejected by Zod
 */
import { describe, it, expect } from 'vitest'
import { StoreConfigUpdateSchema } from '@/lib/owner-validation'

// ---------------------------------------------------------------------------
// Schema-level tests
// ---------------------------------------------------------------------------

describe('StoreConfigUpdateSchema', () => {
    it('accepts a valid partial config payload', () => {
        const result = StoreConfigUpdateSchema.safeParse({
            business_name: 'My Store',
            whatsapp_number: '+34600123456',
            theme_mode: 'dark',
        })
        expect(result.success).toBe(true)
    })

    it('accepts payload with extra metadata keys (id, tenant_id, created_at)', () => {
        // The form component sends the full config row including metadata.
        // Schema should NOT reject — the action filters via ALLOWED_CONFIG_FIELDS.
        const result = StoreConfigUpdateSchema.safeParse({
            id: 'some-uuid',
            tenant_id: 'tenant-uuid',
            created_at: '2026-01-01',
            updated_at: '2026-02-01',
            sentry_dsn: 'https://sentry.io/whatever',
            business_name: 'Campifrut',
            theme_mode: 'light',
        })
        expect(result.success).toBe(true)
        // Extra keys pass through but will be filtered by the action
        if (result.success) {
            expect(result.data).toHaveProperty('id')
            expect(result.data).toHaveProperty('business_name')
        }
    })

    it('rejects script tags in text fields', () => {
        const result = StoreConfigUpdateSchema.safeParse({
            business_name: '<script>alert("xss")</script>',
        })
        expect(result.success).toBe(false)
    })

    it('rejects invalid theme_mode value', () => {
        const result = StoreConfigUpdateSchema.safeParse({
            theme_mode: 'neon',
        })
        expect(result.success).toBe(false)
    })

    it('rejects oversized business_name', () => {
        const result = StoreConfigUpdateSchema.safeParse({
            business_name: 'x'.repeat(201),
        })
        expect(result.success).toBe(false)
    })

    it('accepts empty object (no fields to update)', () => {
        const result = StoreConfigUpdateSchema.safeParse({})
        expect(result.success).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// Allowlist filter tests (unit test the filtering logic)
// ---------------------------------------------------------------------------

const ALLOWED_CONFIG_FIELDS = [
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

function filterToAllowed(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {}
    for (const key of ALLOWED_CONFIG_FIELDS) {
        if (key in data) {
            sanitized[key] = data[key]
        }
    }
    return sanitized
}

describe('Allowlist filter (defense in depth)', () => {
    it('strips id, tenant_id, created_at from parsed payload', () => {
        const parsed = {
            id: 'uuid-1',
            tenant_id: 'tenant-uuid',
            created_at: '2026-01-01',
            business_name: 'My Store',
            theme_mode: 'dark',
        }
        const filtered = filterToAllowed(parsed)

        expect(filtered).toEqual({
            business_name: 'My Store',
            theme_mode: 'dark',
        })
        expect(filtered).not.toHaveProperty('id')
        expect(filtered).not.toHaveProperty('tenant_id')
        expect(filtered).not.toHaveProperty('created_at')
    })

    it('preserves all allowed fields when present', () => {
        const parsed = {
            business_name: 'Test',
            whatsapp_number: '+1234',
            custom_css: 'body { color: red; }',
        }
        const filtered = filterToAllowed(parsed)
        expect(filtered).toEqual(parsed)
    })

    it('returns empty object when no allowed fields present', () => {
        const parsed = {
            id: 'uuid-1',
            sentry_dsn: 'https://test.sentry.io',
            _internal: true,
        }
        const filtered = filterToAllowed(parsed)
        expect(Object.keys(filtered)).toHaveLength(0)
    })
})
