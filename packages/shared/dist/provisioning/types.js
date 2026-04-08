/**
 * @module provisioning/types
 * @description Types for the UnifiedProvisioner — single pipeline for all environments.
 *
 * The provisioner operates in 4 modes:
 *   - local:      Seeds governance from contract. MockBilling. No Dokploy.
 *   - demo:       All flags enabled, max limits. MockBilling. Optional Dokploy.
 *   - staging:    Real governance but mock billing. No Stripe charges.
 *   - production: Full pipeline — Stripe billing, Dokploy deploy, GitHub repo creation.
 *
 * @locked 🔴 CANONICAL — packages/shared is the source of truth.
 */
// ── Max Limits Preset ─────────────────────────────────────────────────────
/** Enterprise max limits — used for demo mode and full-featured testing */
export const ENTERPRISE_MAX_LIMITS = {
    plan_name: 'enterprise_max',
    plan_tier: 'enterprise',
    plan_expires_at: null,
    max_products: 10000,
    max_categories: 1000,
    max_orders_month: 100000,
    max_customers: 100000,
    max_admin_users: 50,
    max_email_sends_month: 100000,
    max_requests_day: 1000000,
    storage_limit_mb: 50000,
    max_images_per_product: 50,
    max_cms_pages: 200,
    max_carousel_slides: 50,
    max_languages: 20,
    max_currencies: 20,
    max_whatsapp_templates: 100,
    max_file_upload_mb: 500,
    max_custom_domains: 10,
    max_badges: 100,
    max_newsletter_subscribers: 100000,
    max_chatbot_messages_month: 50000,
    max_reviews_per_product: 500,
    max_wishlist_items: 1000,
    max_promotions_active: 100,
    max_payment_methods: 10,
    max_crm_contacts: 100000,
    max_pos_payment_methods: 10,
    max_automations: 100,
    max_pos_kiosk_devices: 50,
};
//# sourceMappingURL=types.js.map