import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const mocks = vi.hoisted(() => ({
  requirePanelAuth: vi.fn(),
  getConfigForTenant: vi.fn(),
  checkLimit: vi.fn(),
  createAdminClient: vi.fn(),
  auditInsert: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
}))

vi.mock('@/lib/panel-auth', () => ({ requirePanelAuth: mocks.requirePanelAuth }))
vi.mock('@/lib/config', () => ({ getConfigForTenant: mocks.getConfigForTenant }))
vi.mock('@/lib/limits', () => ({ checkLimit: mocks.checkLimit }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/logger', () => ({
  logger: { error: mocks.loggerError, warn: mocks.loggerWarn },
}))

import { limitedAction, panelAction } from '../safe-action'

const auth = {
  tenantId: 'tenant-action-1',
  role: 'owner',
  user: { id: 'user-action-1', email: 'owner@example.test' },
  supabase: { from: vi.fn() },
}
const appConfig = {
  featureFlags: {},
  planLimits: { max_products: 10 },
  config: {},
}
const inputSchema = z.object({ value: z.string() })

describe('safe action middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePanelAuth.mockResolvedValue(auth)
    mocks.getConfigForTenant.mockResolvedValue(appConfig)
    mocks.checkLimit.mockReturnValue({ allowed: true, current: 2, limit: 10 })
    mocks.auditInsert.mockResolvedValue({ error: null })
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ insert: mocks.auditInsert }),
    })
  })

  it('enriches action context and writes tenant-scoped audit evidence after success', async () => {
    const action = panelAction
      .metadata({ actionName: 'create', category: 'product' })
      .schema(inputSchema)
      .action(async ({ parsedInput, ctx }) => ({
        value: parsedInput.value,
        tenantId: ctx.tenantId,
        role: ctx.role,
      }))

    await expect(action({ value: 'demo' })).resolves.toMatchObject({
      data: { value: 'demo', tenantId: 'tenant-action-1', role: 'owner' },
    })
    expect(mocks.getConfigForTenant).toHaveBeenCalledWith('tenant-action-1')
    expect(mocks.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      tenant_id: 'tenant-action-1',
      action: 'product.create',
      user_id: 'user-action-1',
    }))
  })

  it('keeps successful actions available when audit persistence fails', async () => {
    mocks.createAdminClient.mockImplementation(() => {
      throw new Error('audit unavailable')
    })
    const action = panelAction
      .metadata({ actionName: 'save', category: 'settings' })
      .schema(inputSchema)
      .action(async () => ({ saved: true }))

    await expect(action({ value: 'demo' })).resolves.toMatchObject({ data: { saved: true } })
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      '[audit] Failed to log: settings.save',
      expect.objectContaining({ message: 'audit unavailable' })
    )
  })

  it('treats a resolved Supabase audit error as non-blocking failure evidence', async () => {
    mocks.auditInsert.mockResolvedValue({ error: new Error('audit insert rejected') })
    const action = panelAction
      .metadata({ actionName: 'save', category: 'settings' })
      .schema(inputSchema)
      .action(async () => ({ saved: true }))

    await expect(action({ value: 'demo' })).resolves.toMatchObject({ data: { saved: true } })
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      '[audit] Failed to log: settings.save',
      expect.objectContaining({ message: 'audit insert rejected' })
    )
  })

  it('blocks execution before the action when the plan limit is reached', async () => {
    const getCurrentCount = vi.fn().mockResolvedValue(10)
    const actionBody = vi.fn().mockResolvedValue({ created: true })
    mocks.checkLimit.mockReturnValue({ allowed: false, current: 10, limit: 10 })
    const action = limitedAction('max_products', getCurrentCount)
      .metadata({ actionName: 'create', category: 'product' })
      .schema(inputSchema)
      .action(actionBody)

    await expect(action({ value: 'blocked' })).resolves.toMatchObject({
      serverError: 'LIMIT_EXCEEDED:max_products:10/10',
    })
    expect(actionBody).not.toHaveBeenCalled()
    expect(mocks.auditInsert).not.toHaveBeenCalled()
  })

  it('passes the computed limit receipt into an allowed action', async () => {
    const getCurrentCount = vi.fn().mockResolvedValue(2)
    const action = limitedAction('max_products', getCurrentCount)
      .metadata({ actionName: 'create', category: 'product' })
      .schema(inputSchema)
      .action(async ({ ctx }) => ({ limitCheck: ctx.limitCheck }))

    await expect(action({ value: 'allowed' })).resolves.toMatchObject({
      data: { limitCheck: { allowed: true, current: 2, limit: 10 } },
    })
    expect(mocks.checkLimit).toHaveBeenCalledWith(appConfig.planLimits, 'max_products', 2)
  })
})
