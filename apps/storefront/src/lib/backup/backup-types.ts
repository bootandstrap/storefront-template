/**
 * Backup System — Type Definitions
 *
 * Defines the schema for tenant backups, storage usage,
 * and retention policies.
 *
 * @module lib/backup/backup-types
 */

// ── Backup Snapshot ──────────────────────────────────────────────────────────

export interface TenantBackup {
    /** Schema version for forward compatibility */
    version: '1.0'
    /** Tenant UUID */
    tenant_id: string
    /** Tenant slug (used as folder prefix) */
    tenant_slug: string
    /** ISO timestamp of backup creation */
    created_at: string
    /** Full = complete dump. Incremental = only changed entities since last full. */
    type: 'full' | 'incremental'
    /** For incremental: key of the parent full backup */
    parent_backup_key?: string
    /** The actual data snapshot */
    data: BackupData
    /** Summary statistics */
    stats: BackupStats
    /** Content hashes per entity type (for incremental diffing) */
    checksums: Record<string, string>
}

export interface BackupData {
    products: BackupProduct[]
    orders: BackupOrder[]
    customers: BackupCustomer[]
    categories: BackupCategory[]
    promotions: BackupPromotion[]
    inventory: BackupInventoryItem[]
    governance: BackupGovernance
}

export interface BackupStats {
    products_count: number
    orders_count: number
    customers_count: number
    categories_count: number
    promotions_count: number
    inventory_count: number
    total_size_bytes: number
    duration_ms: number
}

// ── Entity types (lightweight versions of Medusa entities) ───────────────────

export interface BackupProduct {
    id: string
    title: string
    handle: string
    description: string | null
    status: string
    thumbnail: string | null
    images: { url: string }[]
    categories: { id: string; name: string }[]
    variants: BackupVariant[]
    metadata: Record<string, unknown> | null
    created_at: string
    updated_at: string
}

export interface BackupVariant {
    id: string
    title: string
    sku: string | null
    prices: { amount: number; currency_code: string }[]
    manage_inventory: boolean
    inventory_quantity: number | null
}

export interface BackupOrder {
    id: string
    display_id: number | null
    status: string
    email: string | null
    total: number
    currency_code: string
    items: { title: string; quantity: number; unit_price: number }[]
    shipping_address: Record<string, unknown> | null
    created_at: string
}

export interface BackupCustomer {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    has_account: boolean
    created_at: string
    metadata: Record<string, unknown> | null
}

export interface BackupCategory {
    id: string
    name: string
    handle: string
    description: string | null
    parent_category_id: string | null
}

export interface BackupPromotion {
    id: string
    code: string
    type: string
    value: number
    is_disabled: boolean
    usage_limit: number | null
    usage_count: number
    starts_at: string | null
    ends_at: string | null
}

export interface BackupInventoryItem {
    id: string
    sku: string | null
    title: string | null
    stocked_quantity: number
    reserved_quantity: number
}

export interface BackupGovernance {
    config: Record<string, unknown>
    feature_flags: Record<string, boolean>
    plan_limits: Record<string, number>
}

// ── Storage Usage (from RPC) ─────────────────────────────────────────────────

export interface TenantStorageUsage {
    images: { count: number; bytes: number; mb: number }
    backups: { count: number; bytes: number; mb: number }
    total: { bytes: number; mb: number }
}

// ── Backup Manifest Entry (returned from list RPC) ───────────────────────────

export interface BackupManifestEntry {
    name: string
    size_bytes: number
    size_mb: number
    created_at: string
    updated_at: string
    mime_type: string
}

// ── Retention Policy ─────────────────────────────────────────────────────────

export interface RetentionPolicy {
    keep_daily: number
    keep_weekly: number
    keep_monthly: number
    max_total: number
}

export const RETENTION_TIERS: Record<string, RetentionPolicy> = {
    base: { keep_daily: 3, keep_weekly: 2, keep_monthly: 1, max_total: 6 },
    standard: { keep_daily: 7, keep_weekly: 4, keep_monthly: 3, max_total: 14 },
    enterprise: { keep_daily: 14, keep_weekly: 8, keep_monthly: 6, max_total: 28 },
}
