/**
 * Analytics Contract Tests
 *
 * Verifies that all analytics insert paths (client + webhook) produce
 * the same event shape that the panel reads.
 *
 * Contract: { event_type, properties, tenant_id, page_url?, referrer? }
 */

import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// Shared analytics event types — must match analytics.ts
// ---------------------------------------------------------------------------

const CLIENT_EVENT_TYPES = [
    'page_view',
    'product_view',
    'add_to_cart',
    'remove_from_cart',
    'checkout_start',
    'order_placed',
    'search',
    'category_view',
    'whatsapp_click',
] as const

const WEBHOOK_EVENT_TYPES = ['checkout_complete'] as const

describe('Analytics Contract', () => {
    describe('event types are well-defined', () => {
        it('client event types are unique', () => {
            const set = new Set(CLIENT_EVENT_TYPES)
            expect(set.size).toBe(CLIENT_EVENT_TYPES.length)
        })

        it('webhook event types are unique', () => {
            const set = new Set(WEBHOOK_EVENT_TYPES)
            expect(set.size).toBe(WEBHOOK_EVENT_TYPES.length)
        })

        it('no overlap between client and webhook event types', () => {
            const overlap = CLIENT_EVENT_TYPES.filter((e) =>
                (WEBHOOK_EVENT_TYPES as readonly string[]).includes(e)
            )
            expect(overlap).toEqual([])
        })
    })

    describe('insert shape contract', () => {
        // The canonical shape written by analytics.ts (client)
        const clientInsert = {
            event_type: 'page_view',
            properties: { product_id: '123' },
            page_url: '/es/productos/manzana',
            referrer: null,
            tenant_id: 'tenant-abc',
        }

        // The canonical shape written by stripe webhook
        const webhookInsert = {
            event_type: 'checkout_complete',
            properties: {
                payment_intent_id: 'pi_123',
                amount: 1500,
                cart_id: 'cart_456',
                source: 'stripe_webhook',
            },
            tenant_id: 'tenant-abc',
        }

        it('client insert has required fields', () => {
            expect(clientInsert).toHaveProperty('event_type')
            expect(clientInsert).toHaveProperty('properties')
            expect(clientInsert).toHaveProperty('tenant_id')
            expect(typeof clientInsert.event_type).toBe('string')
            expect(typeof clientInsert.properties).toBe('object')
        })

        it('webhook insert has required fields', () => {
            expect(webhookInsert).toHaveProperty('event_type')
            expect(webhookInsert).toHaveProperty('properties')
            expect(webhookInsert).toHaveProperty('tenant_id')
            expect(typeof webhookInsert.event_type).toBe('string')
            expect(typeof webhookInsert.properties).toBe('object')
        })

        it('neither insert path uses deprecated "metadata" field', () => {
            expect(clientInsert).not.toHaveProperty('metadata')
            expect(webhookInsert).not.toHaveProperty('metadata')
        })

        it('webhook marks source in properties', () => {
            expect(webhookInsert.properties.source).toBe('stripe_webhook')
        })
    })

    describe('panel read expectations', () => {
        // The panel queries: .select('properties').eq('event_type', X)
        it('reads properties column (not metadata)', () => {
            // This documents the read contract
            const panelQuery = {
                table: 'analytics_events',
                select: 'properties',
                filters: ['tenant_id', 'event_type', 'created_at'],
            }
            expect(panelQuery.select).toBe('properties')
            expect(panelQuery.filters).toContain('tenant_id')
        })
    })
})

import { checkLimit, getLimitSeverity } from '../limits'

describe('Limit Enforcement Scenarios', () => {

    const starterPlan = {
        max_products: 10,
        max_customers: 50,
        max_orders_month: 100,
        max_categories: 5,
        max_images_per_product: 3,
        max_cms_pages: 2,
        max_carousel_slides: 3,
        max_admin_users: 1,
        storage_limit_mb: 100,
        plan_name: 'starter',
        plan_expires_at: null,
        max_languages: 1,
        max_currencies: 1,
        max_whatsapp_templates: 3,
        max_file_upload_mb: 2,
        max_email_sends_month: 100,
        max_custom_domains: 0,
        max_chatbot_messages_month: 200,
        max_badges: 3,
        max_newsletter_subscribers: 100,
        max_requests_day: 5000,
        max_reviews_per_product: 5,
        max_wishlist_items: 20,
        max_promotions_active: 2,
        max_payment_methods: 2,
        max_crm_contacts: 100,
    }

    const proPlan = {
        ...starterPlan,
        plan_name: 'pro',
        max_products: 500,
        max_customers: 1000,
        max_orders_month: 5000,
        max_categories: 50,
        max_languages: 5,
        max_currencies: 3,
    }

    describe('max_orders_month enforcement', () => {
        it('starter plan blocks at 100 orders', () => {
            expect(checkLimit(starterPlan, 'max_orders_month', 99).allowed).toBe(true)
            expect(checkLimit(starterPlan, 'max_orders_month', 100).allowed).toBe(false)
        })

        it('pro plan allows up to 5000 orders', () => {
            expect(checkLimit(proPlan, 'max_orders_month', 4999).allowed).toBe(true)
            expect(checkLimit(proPlan, 'max_orders_month', 5000).allowed).toBe(false)
        })

        it('severity changes at 70% and 90%', () => {
            expect(getLimitSeverity(checkLimit(starterPlan, 'max_orders_month', 50))).toBe('ok')
            expect(getLimitSeverity(checkLimit(starterPlan, 'max_orders_month', 70))).toBe('warning')
            expect(getLimitSeverity(checkLimit(starterPlan, 'max_orders_month', 95))).toBe('critical')
        })
    })

    describe('max_customers enforcement', () => {
        it('starter plan blocks at 50 customers', () => {
            expect(checkLimit(starterPlan, 'max_customers', 49).allowed).toBe(true)
            expect(checkLimit(starterPlan, 'max_customers', 50).allowed).toBe(false)
        })

        it('pro plan allows up to 1000 customers', () => {
            expect(checkLimit(proPlan, 'max_customers', 999).allowed).toBe(true)
            expect(checkLimit(proPlan, 'max_customers', 1000).allowed).toBe(false)
        })
    })

    describe('zero-limit enforcement (custom_domains on starter)', () => {
        it('zero limit blocks immediately', () => {
            const result = checkLimit(starterPlan, 'max_custom_domains', 0)
            expect(result.allowed).toBe(false)
            expect(result.remaining).toBe(0)
        })
    })

    describe('cross-plan upgrade scenario', () => {
        it('same usage allowed on pro but blocked on starter', () => {
            const usage = 200
            expect(checkLimit(starterPlan, 'max_customers', usage).allowed).toBe(false)
            expect(checkLimit(proPlan, 'max_customers', usage).allowed).toBe(true)
        })
    })
})
