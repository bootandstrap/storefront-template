import { gunzipSync, gzipSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAdminProductsFull: vi.fn(),
  getAdminOrders: vi.fn(),
  getAdminCustomers: vi.fn(),
  getAdminCategories: vi.fn(),
  getPromotions: vi.fn(),
  getInventoryItems: vi.fn(),
  getConfigForTenant: vi.fn(),
  upload: vi.fn(),
}))

vi.mock('@/lib/medusa/admin', () => ({
  getAdminProductsFull: mocks.getAdminProductsFull,
  getAdminOrders: mocks.getAdminOrders,
  getAdminCustomers: mocks.getAdminCustomers,
  getAdminCategories: mocks.getAdminCategories,
}))
vi.mock('@/lib/medusa/admin-products', () => ({
  getAdminProductsFull: mocks.getAdminProductsFull,
}))
vi.mock('@/lib/medusa/admin-orders', () => ({
  getAdminOrders: mocks.getAdminOrders,
  getAdminCustomers: mocks.getAdminCustomers,
}))
vi.mock('@/lib/medusa/admin-categories', () => ({
  getAdminCategories: mocks.getAdminCategories,
}))
vi.mock('@/lib/medusa/admin-promotions', () => ({ getPromotions: mocks.getPromotions }))
vi.mock('@/lib/medusa/admin-inventory', () => ({ getInventoryItems: mocks.getInventoryItems }))
vi.mock('@/lib/config', () => ({ getConfigForTenant: mocks.getConfigForTenant }))
vi.mock('@/lib/supabase/storage-admin', () => ({
  createStorageAdminClient: () => ({
    storage: { from: () => ({ upload: mocks.upload }) },
  }),
}))

import { executeFullBackup, padGzipExtraField } from '../backup-executor'

describe('gzip backup size encoding', () => {
  it('uses a valid FEXTRA field to reach the declared byte length', () => {
    const source = gzipSync('backup-proof')
    const targetLength = source.length + 64

    const padded = padGzipExtraField(source, targetLength)

    expect(padded).toHaveLength(targetLength)
    expect(padded[3] & 0x04).toBe(0x04)
    expect(gunzipSync(padded).toString('utf8')).toBe('backup-proof')
  })

  it('rejects a target too small for an FEXTRA length field', () => {
    const source = gzipSync('backup-proof')
    expect(() => padGzipExtraField(source, source.length + 1)).toThrow(
      'Unable to encode backup size in gzip extra field',
    )
  })

  it('rejects an FEXTRA payload larger than the gzip header limit', () => {
    const source = gzipSync('backup-proof')
    expect(() => padGzipExtraField(source, source.length + 0xffff + 3)).toThrow(
      'Unable to encode backup size in gzip extra field',
    )
  })

  it('rejects a gzip stream that already owns an FEXTRA field', () => {
    const source = Buffer.from(gzipSync('backup-proof'))
    source[3] |= 0x04
    expect(() => padGzipExtraField(source, source.length + 64)).toThrow(
      'Unable to encode backup size in gzip extra field',
    )
  })
})

const scope = {
  tenantId: 'tenant-backup-1',
  medusaSalesChannelId: 'sales-channel-backup-1',
}

describe('full backup executor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:34:56.000Z'))
    mocks.getAdminProductsFull.mockResolvedValue({
      products: [{
        id: 'prod-1', title: 'Product', handle: 'product', description: null,
        status: 'published', thumbnail: null, images: [{ url: 'https://example.test/image.jpg' }],
        categories: [{ id: 'cat-1', name: 'Category' }],
        variants: [{
          id: 'variant-1', title: 'Default', sku: 'SKU-1', manage_inventory: true,
          inventory_quantity: 4, prices: [{ amount: 1200, currency_code: 'eur' }],
        }],
        metadata: { source: 'test' }, created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-02-01T00:00:00.000Z',
      }],
    })
    mocks.getAdminOrders.mockResolvedValue({
      orders: [{
        id: 'order-1', display_id: 1, status: 'completed', email: 'buyer@example.test',
        total: 1200, currency_code: 'eur',
        items: [{ title: 'Product', quantity: 1, unit_price: 1200 }],
        shipping_address: { city: 'Madrid' }, created_at: '2026-03-01T00:00:00.000Z',
      }],
    })
    mocks.getAdminCustomers.mockResolvedValue({
      customers: [{
        id: 'customer-1', email: 'buyer@example.test', first_name: 'Buyer', last_name: 'Test',
        phone: null, has_account: true, created_at: '2026-01-01T00:00:00.000Z', metadata: null,
      }],
    })
    mocks.getAdminCategories.mockResolvedValue({
      product_categories: [{
        id: 'cat-1', name: 'Category', handle: 'category', description: null, parent_category: null,
      }],
    })
    mocks.getPromotions.mockResolvedValue({
      promotions: [{
        id: 'promo-1', code: 'LOCAL10', type: 'percentage', value: 10,
        is_disabled: false, usage_limit: null, usage_count: 0, starts_at: null, ends_at: null,
      }],
    })
    mocks.getInventoryItems.mockResolvedValue({
      inventory_items: [{
        id: 'inventory-1', sku: 'SKU-1', title: 'Product', stocked_quantity: 4, reserved_quantity: 1,
      }],
    })
    mocks.getConfigForTenant.mockResolvedValue({
      config: { business_name: 'Local tenant' },
      featureFlags: { enable_backups: true },
      planLimits: {
        max_backups: 4,
        plan_name: 'enterprise_max',
        plan_tier: null,
        plan_expires_at: null,
      },
    })
    mocks.upload.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uploads a complete gzip snapshot whose embedded stats match the artifact', async () => {
    const result = await executeFullBackup('tenant-backup-1', 'tenant-backup', scope)

    expect(result).toMatchObject({
      success: true,
      backup_key: 'tenant-backup/2026-08-03T12-34-56_full.json.gz',
      stats: {
        products_count: 1,
        orders_count: 1,
        customers_count: 1,
        categories_count: 1,
        promotions_count: 1,
        inventory_count: 1,
      },
    })
    const [key, compressed, options] = mocks.upload.mock.calls[0]
    const snapshot = JSON.parse(gunzipSync(compressed).toString('utf8'))
    expect(key).toBe(result.backup_key)
    expect(options).toEqual({ contentType: 'application/gzip', upsert: false })
    expect(snapshot.stats.total_size_bytes).toBe(compressed.length)
    expect(snapshot.stats.duration_ms).toBe(result.stats?.duration_ms)
    expect(snapshot.data.governance.plan_limits).toMatchObject({
      max_backups: 4,
      plan_name: 'enterprise_max',
      plan_tier: null,
      plan_expires_at: null,
    })
    expect(snapshot.checksums.products).toMatch(/^[a-f0-9]{16}$/)
    expect(snapshot.data.governance.feature_flags).toEqual({ enable_backups: true })
  })

  it('returns a failed receipt without a backup key when upload is rejected', async () => {
    mocks.upload.mockResolvedValue({ error: new Error('storage denied') })

    await expect(executeFullBackup('tenant-backup-1', 'tenant-backup', scope)).resolves.toEqual({
      success: false,
      error: 'Upload failed: storage denied',
      duration_ms: 0,
    })
  })

  it('fails closed when a required Medusa data source is unavailable', async () => {
    mocks.getAdminProductsFull.mockRejectedValue(new Error('Medusa unavailable'))

    await expect(executeFullBackup('tenant-backup-1', 'tenant-backup', scope)).resolves.toEqual({
      success: false,
      error: 'Medusa unavailable',
      duration_ms: 0,
    })
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('degrades optional modules to empty data without losing the required snapshot', async () => {
    mocks.getPromotions.mockRejectedValue(new Error('promotions disabled'))
    mocks.getInventoryItems.mockRejectedValue(new Error('inventory disabled'))
    mocks.getConfigForTenant.mockRejectedValue(new Error('governance unavailable'))

    const result = await executeFullBackup('tenant-backup-1', 'tenant-backup', scope)
    expect(result.error).toBeUndefined()
    expect(result).toMatchObject({ success: true })
    const compressed = mocks.upload.mock.calls[0][1]
    const snapshot = JSON.parse(gunzipSync(compressed).toString('utf8'))
    expect(compressed[3] & 0x04).toBe(0x04)
    expect(snapshot.stats.total_size_bytes).toBe(compressed.length)
    expect(snapshot.data.promotions).toEqual([])
    expect(snapshot.data.inventory).toEqual([])
    expect(snapshot.data.governance).toEqual({ config: {}, feature_flags: {}, plan_limits: {} })
  })
})
