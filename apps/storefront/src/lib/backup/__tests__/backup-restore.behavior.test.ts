import { gzipSync } from 'node:zlib'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  getAdminCategories: vi.fn(),
  createAdminCategory: vi.fn(),
  getAdminProductsFull: vi.fn(),
  adminFetch: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/supabase/storage-admin', () => ({
  createStorageAdminClient: () => ({
    storage: { from: () => ({ download: mocks.download }) },
  }),
}))
vi.mock('@/lib/medusa/admin', () => ({
  getAdminCategories: mocks.getAdminCategories,
  createAdminCategory: mocks.createAdminCategory,
  getAdminProductsFull: mocks.getAdminProductsFull,
}))
vi.mock('@/lib/medusa/admin-core', () => ({ adminFetch: mocks.adminFetch }))
vi.mock('@/lib/logger', () => ({ logger: { error: mocks.loggerError } }))

import { downloadBackup, executeRestore } from '../backup-restore'

const scope = {
  tenantId: 'tenant-restore-1',
  medusaSalesChannelId: 'sales-channel-restore-1',
}

function backup(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0',
    tenant_id: 'tenant-restore-1',
    tenant_slug: 'tenant-restore',
    created_at: '2026-08-03T12:00:00.000Z',
    type: 'full',
    data: {
      categories: [],
      products: [],
      orders: [],
      customers: [],
      promotions: [],
      inventory: [],
      governance: { config: {}, feature_flags: {}, plan_limits: {} },
    },
    stats: {
      products_count: 0,
      orders_count: 0,
      customers_count: 0,
      categories_count: 0,
      promotions_count: 0,
      inventory_count: 0,
      total_size_bytes: 0,
      duration_ms: 0,
    },
    checksums: {},
    ...overrides,
  }
}

function asBlob(value: unknown, gzip = false): Blob {
  const json = JSON.stringify(value)
  return new Blob([gzip ? gzipSync(Buffer.from(json)) : json])
}

describe('backup restore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAdminCategories.mockResolvedValue({ product_categories: [] })
    mocks.getAdminProductsFull.mockResolvedValue({ products: [] })
    mocks.createAdminCategory.mockResolvedValue({ error: null })
    mocks.adminFetch.mockResolvedValue({ data: { product: { id: 'prod-new' } }, error: null })
  })

  it('downloads and parses plain and gzipped versioned backups', async () => {
    const snapshot = backup()
    mocks.download.mockResolvedValueOnce({ data: asBlob(snapshot), error: null })
    mocks.download.mockResolvedValueOnce({ data: asBlob(snapshot, true), error: null })

    await expect(downloadBackup('tenant/plain.json')).resolves.toMatchObject({ version: '1.0' })
    await expect(downloadBackup('tenant/compressed.json.gz')).resolves.toMatchObject({ version: '1.0' })
  })

  it('accepts production-shaped plan metadata in a versioned backup', async () => {
    const snapshot = backup({
      data: {
        categories: [],
        products: [],
        orders: [],
        customers: [],
        promotions: [],
        inventory: [],
        governance: {
          config: {},
          feature_flags: {},
          plan_limits: {
            max_backups: 4,
            plan_name: 'enterprise_max',
            plan_tier: null,
            plan_expires_at: null,
          },
        },
      },
    })
    mocks.download.mockResolvedValueOnce({ data: asBlob(snapshot, true), error: null })

    await expect(downloadBackup('tenant/production-shaped.json.gz')).resolves.toMatchObject({
      data: {
        governance: {
          plan_limits: {
            max_backups: 4,
            plan_name: 'enterprise_max',
            plan_tier: null,
            plan_expires_at: null,
          },
        },
      },
    })
  })

  it('rejects unsupported, malformed, and structurally incomplete snapshots', async () => {
    mocks.download.mockResolvedValueOnce({ data: asBlob(backup({ version: '2.0' })), error: null })
    mocks.download.mockResolvedValueOnce({ data: new Blob(['not-json']), error: null })
    mocks.download.mockResolvedValueOnce({ data: asBlob(backup({ data: {} })), error: null })

    await expect(downloadBackup('tenant/version.json')).resolves.toBeNull()
    await expect(downloadBackup('tenant/malformed.json')).resolves.toBeNull()
    await expect(downloadBackup('tenant/incomplete.json')).resolves.toBeNull()
  })

  it('returns structured failure when storage cannot provide the backup', async () => {
    mocks.download.mockResolvedValue({ data: null, error: new Error('not found') })

    await expect(executeRestore('tenant/missing.json.gz', scope)).resolves.toMatchObject({
      success: false,
      errors: ['Failed to download or parse backup'],
      categories: { created: 0, skipped: 0, failed: 0 },
      products: { created: 0, skipped: 0, failed: 0 },
      skipped_entities: ['orders', 'customers', 'governance'],
    })
  })

  it('restores only missing categories and products and preserves immutable/private entities', async () => {
    const snapshot = backup({
      data: {
        categories: [
          { id: 'cat-old', name: 'Existing', handle: 'existing', description: null, parent_category_id: null },
          { id: 'cat-new', name: 'New', handle: 'new', description: 'New category', parent_category_id: null },
        ],
        products: [
          {
            id: 'prod-old', title: 'Existing', handle: 'existing-product', description: null,
            status: 'published', thumbnail: null, images: [], categories: [], variants: [], metadata: null,
            created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'prod-new', title: 'New product', handle: 'new-product', description: 'Description',
            status: 'published', thumbnail: null, images: [], categories: [],
            variants: [{
              id: 'variant-1', title: 'Default', sku: 'SKU-1', manage_inventory: true,
              inventory_quantity: 3, prices: [{ amount: 1000, currency_code: 'eur' }],
            }],
            metadata: { source: 'backup' }, created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        orders: [{ id: 'immutable-order' }],
        customers: [{ id: 'private-customer' }],
        promotions: [], inventory: [],
        governance: { config: { protected: true }, feature_flags: {}, plan_limits: {} },
      },
    })
    mocks.download.mockResolvedValue({ data: asBlob(snapshot, true), error: null })
    mocks.getAdminCategories.mockResolvedValue({ product_categories: [{ handle: 'existing' }] })
    mocks.getAdminProductsFull.mockResolvedValue({ products: [{ handle: 'existing-product' }] })

    const result = await executeRestore('tenant/full.json.gz', scope)

    expect(result).toMatchObject({
      success: true,
      categories: { created: 1, skipped: 1, failed: 0 },
      products: { created: 1, skipped: 1, failed: 0 },
      skipped_entities: ['orders', 'customers', 'governance'],
    })
    expect(mocks.createAdminCategory).toHaveBeenCalledOnce()
    expect(mocks.adminFetch).toHaveBeenCalledWith(
      '/admin/products',
      expect.objectContaining({ method: 'POST' }),
      scope
    )
  })

  it('aggregates per-entity API failures into a failed restore receipt', async () => {
    const snapshot = backup({
      data: {
        categories: [{ id: 'cat-1', name: 'Broken cat', handle: 'broken-cat', description: null, parent_category_id: null }],
        products: [{
          id: 'prod-1', title: 'Broken product', handle: 'broken-product', description: null,
          status: 'draft', thumbnail: null, images: [], categories: [], variants: [], metadata: null,
          created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
        }],
        orders: [], customers: [], promotions: [], inventory: [],
        governance: { config: {}, feature_flags: {}, plan_limits: {} },
      },
    })
    mocks.download.mockResolvedValue({ data: asBlob(snapshot), error: null })
    mocks.createAdminCategory.mockResolvedValue({ error: 'category rejected' })
    mocks.adminFetch.mockResolvedValue({ data: null, error: 'product rejected' })

    await expect(executeRestore('tenant/failures.json', scope)).resolves.toMatchObject({
      success: false,
      categories: { failed: 1 },
      products: { failed: 1 },
      errors: [
        'Category "Broken cat": category rejected',
        'Product "Broken product": product rejected',
      ],
    })
  })
})
