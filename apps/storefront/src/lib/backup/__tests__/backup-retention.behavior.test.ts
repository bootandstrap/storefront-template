import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  remove: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
}))

vi.mock('@/lib/supabase/storage-admin', () => ({
  createStorageAdminClient: () => ({
    rpc: mocks.rpc,
    storage: { from: () => ({ remove: mocks.remove }) },
  }),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: mocks.loggerError, info: mocks.loggerInfo },
}))

import { planRetention, executeRetention, resolveRetentionPolicy } from '../backup-retention'
import type { BackupManifestEntry } from '../backup-types'

function manifest(name: string, createdAt: string, size = 100): BackupManifestEntry {
  return {
    name,
    created_at: createdAt,
    updated_at: createdAt,
    size_bytes: size,
    size_mb: size / 1024 / 1024,
    mime_type: 'application/gzip',
  }
}

describe('backup retention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T12:00:00.000Z'))
    mocks.remove.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('never returns a hard ceiling above the governance max_backups limit', () => {
    expect(resolveRetentionPolicy(0).max_total).toBe(0)
    expect(resolveRetentionPolicy(4).max_total).toBe(4)
    expect(resolveRetentionPolicy(14).max_total).toBe(14)
    expect(resolveRetentionPolicy(28).max_total).toBe(28)
  })

  it('keeps the newest eligible snapshots and accounts for every deleted byte', () => {
    const backups = [
      manifest('tenant/newest.gz', '2026-08-03T10:00:00.000Z', 10),
      manifest('tenant/day-old.gz', '2026-08-02T10:00:00.000Z', 20),
      manifest('tenant/week-old.gz', '2026-07-26T10:00:00.000Z', 30),
      manifest('tenant/month-old.gz', '2026-06-20T10:00:00.000Z', 40),
    ]

    const result = planRetention(backups, {
      keep_daily: 1,
      keep_weekly: 1,
      keep_monthly: 1,
      max_total: 2,
    })

    expect(result.kept).toEqual(['tenant/newest.gz'])
    expect(result.deleted).toEqual([
      'tenant/day-old.gz',
      'tenant/week-old.gz',
      'tenant/month-old.gz',
    ])
    expect(result.total_freed_bytes).toBe(90)
  })

  it('returns empty fail-closed evidence when listing backups fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('rpc unavailable') })

    await expect(executeRetention('tenant-safe', 4)).resolves.toEqual({
      kept: [],
      deleted: [],
      total_freed_bytes: 0,
    })
    expect(mocks.loggerError).toHaveBeenCalledWith(
      '[backup-retention] Failed to list backups:',
      expect.objectContaining({ message: 'rpc unavailable' })
    )
  })

  it('deletes the planned paths and reports individual storage failures without aborting', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        manifest('tenant/new.gz', '2026-08-03T10:00:00.000Z'),
        manifest('tenant/old.gz', '2026-01-01T10:00:00.000Z'),
      ],
      error: null,
    })
    mocks.remove.mockResolvedValueOnce({ error: new Error('delete rejected') })

    const result = await executeRetention('tenant-safe', 1)
    expect(result.kept).toEqual(['tenant/new.gz'])
    expect(result.deleted).toEqual(['tenant/old.gz'])
    expect(mocks.remove).toHaveBeenCalledWith(['tenant/old.gz'])
    expect(mocks.loggerError).toHaveBeenCalledWith(
      '[backup-retention] Failed to delete tenant/old.gz:',
      'delete rejected'
    )
  })
})
