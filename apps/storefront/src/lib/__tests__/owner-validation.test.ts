/**
 * Tests for Owner Panel Zod validation schemas
 */

import { describe, it, expect } from 'vitest'
import {
    SlideInputSchema,
    SlideUpdateSchema,
    TemplateInputSchema,
    PageInputSchema,
    StoreConfigUpdateSchema,
    ToggleBadgeSchema,
    SetBadgesSchema,
} from '../owner-validation'

// ---------------------------------------------------------------------------
// SlideInputSchema
// ---------------------------------------------------------------------------

describe('SlideInputSchema', () => {
    it('accepts valid slide input', () => {
        const result = SlideInputSchema.safeParse({
            type: 'image',
            title: 'Summer Sale',
            subtitle: 'Up to 50% off',
            active: true,
        })
        expect(result.success).toBe(true)
    })

    it('rejects invalid type', () => {
        const result = SlideInputSchema.safeParse({
            type: 'invalid',
            title: 'Test',
        })
        expect(result.success).toBe(false)
    })

    it('rejects script tags in title', () => {
        const result = SlideInputSchema.safeParse({
            type: 'image',
            title: '<script>alert("xss")</script>',
        })
        expect(result.success).toBe(false)
    })

    it('rejects oversized title', () => {
        const result = SlideInputSchema.safeParse({
            type: 'image',
            title: 'x'.repeat(201),
        })
        expect(result.success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// TemplateInputSchema
// ---------------------------------------------------------------------------

describe('TemplateInputSchema', () => {
    it('accepts valid template input', () => {
        const result = TemplateInputSchema.safeParse({
            name: 'Order Confirmation',
            template: 'Hello {{name}}, your order #{{order_id}} is confirmed.',
            is_default: true,
            variables: ['name', 'order_id'],
        })
        expect(result.success).toBe(true)
    })

    it('rejects missing required fields', () => {
        const result = TemplateInputSchema.safeParse({
            name: 'Test',
            // missing template
        })
        expect(result.success).toBe(false)
    })

    it('rejects too many variables', () => {
        const result = TemplateInputSchema.safeParse({
            name: 'Test',
            template: 'Hello',
            variables: Array.from({ length: 21 }, (_, i) => `var_${i}`),
        })
        expect(result.success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// PageInputSchema
// ---------------------------------------------------------------------------

describe('PageInputSchema', () => {
    it('accepts valid page input', () => {
        const result = PageInputSchema.safeParse({
            slug: 'about-us',
            title: 'About Us',
            body: 'We are a team of developers.',
        })
        expect(result.success).toBe(true)
    })

    it('rejects invalid slug format', () => {
        const result = PageInputSchema.safeParse({
            slug: 'About Us!',
            title: 'About',
            body: 'Content',
        })
        expect(result.success).toBe(false)
    })

    it('rejects slug with uppercase', () => {
        const result = PageInputSchema.safeParse({
            slug: 'About-Us',
            title: 'About',
            body: 'Content',
        })
        expect(result.success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// StoreConfigUpdateSchema
// ---------------------------------------------------------------------------

describe('StoreConfigUpdateSchema', () => {
    it('accepts valid partial config', () => {
        const result = StoreConfigUpdateSchema.safeParse({
            business_name: 'My Store',
            theme_mode: 'dark',
        })
        expect(result.success).toBe(true)
    })

    it('passes unknown fields through (filtered by action allowlist)', () => {
        // Schema uses .passthrough() — extra keys pass validation.
        // The action's ALLOWED_CONFIG_FIELDS filter strips them before DB write.
        const result = StoreConfigUpdateSchema.safeParse({
            business_name: 'My Store',
            hacker_field: 'DROP TABLE config;',
        })
        expect(result.success).toBe(true)
    })

    it('rejects invalid theme_mode', () => {
        const result = StoreConfigUpdateSchema.safeParse({
            theme_mode: 'purple',
        })
        expect(result.success).toBe(false)
    })

    it('rejects invalid email', () => {
        const result = StoreConfigUpdateSchema.safeParse({
            store_email: 'not-an-email',
        })
        expect(result.success).toBe(false)
    })

    it('rejects script tags in business_name', () => {
        const result = StoreConfigUpdateSchema.safeParse({
            business_name: '<script>alert("xss")</script>',
        })
        expect(result.success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// ToggleBadgeSchema
// ---------------------------------------------------------------------------

describe('ToggleBadgeSchema', () => {
    it('accepts valid toggle input', () => {
        const result = ToggleBadgeSchema.safeParse({
            productId: '550e8400-e29b-41d4-a716-446655440000',
            badgeId: 'new',
            enabled: true,
        })
        expect(result.success).toBe(true)
    })

    it('rejects invalid UUID for productId', () => {
        const result = ToggleBadgeSchema.safeParse({
            productId: 'not-a-uuid',
            badgeId: 'new',
            enabled: true,
        })
        expect(result.success).toBe(false)
    })

    it('rejects empty badgeId', () => {
        const result = ToggleBadgeSchema.safeParse({
            productId: '550e8400-e29b-41d4-a716-446655440000',
            badgeId: '',
            enabled: true,
        })
        expect(result.success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// SetBadgesSchema
// ---------------------------------------------------------------------------

describe('SetBadgesSchema', () => {
    it('accepts valid badges array', () => {
        const result = SetBadgesSchema.safeParse({
            productId: '550e8400-e29b-41d4-a716-446655440000',
            badges: ['new', 'sale', 'organic'],
        })
        expect(result.success).toBe(true)
    })

    it('rejects too many badges', () => {
        const result = SetBadgesSchema.safeParse({
            productId: '550e8400-e29b-41d4-a716-446655440000',
            badges: Array.from({ length: 21 }, (_, i) => `badge_${i}`),
        })
        expect(result.success).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// SlideUpdateSchema (partial)
// ---------------------------------------------------------------------------

describe('SlideUpdateSchema', () => {
    it('accepts partial updates', () => {
        const result = SlideUpdateSchema.safeParse({
            title: 'Updated Title',
        })
        expect(result.success).toBe(true)
    })

    it('accepts empty object (no changes)', () => {
        const result = SlideUpdateSchema.safeParse({})
        expect(result.success).toBe(true)
    })
})
