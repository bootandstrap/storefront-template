import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockWithPanelGuard = vi.fn()
const mockGetTenantMedusaScope = vi.fn()
const mockLogOwnerAction = vi.fn()
const mockCreateDraftOrder = vi.fn()
const mockConvertDraftToOrder = vi.fn()
const mockRecordPOSTransaction = vi.fn()
const mockUpdateShiftAggregates = vi.fn()
const mockReservePOSSyncOperation = vi.fn()
const mockCommitPOSSyncOperation = vi.fn()
const mockGetAdminProductsFull = vi.fn()
const mockGetAdminCustomers = vi.fn()
const mockAdminFetch = vi.fn()
const mockGetAdminProduct = vi.fn()
const mockUpdateVariantPrices = vi.fn()
const mockRevalidatePath = vi.fn()
const mockLoggerError = vi.fn()
const mockLoggerWarn = vi.fn()

vi.mock('@/lib/panel-guard', () => ({
    withPanelGuard: mockWithPanelGuard,
}))

vi.mock('@/lib/medusa/tenant-scope', () => ({
    getTenantMedusaScope: mockGetTenantMedusaScope,
}))

vi.mock('@/lib/panel/log-owner-action', () => ({
    logOwnerAction: mockLogOwnerAction,
}))

vi.mock('@/lib/medusa/admin-draft-orders', () => ({
    createDraftOrder: mockCreateDraftOrder,
    convertDraftToOrder: mockConvertDraftToOrder,
}))

vi.mock('@/lib/pos/medusa-pos-module', () => ({
    recordPOSTransaction: mockRecordPOSTransaction,
    updateShiftAggregates: mockUpdateShiftAggregates,
    reservePOSSyncOperation: mockReservePOSSyncOperation,
    commitPOSSyncOperation: mockCommitPOSSyncOperation,
}))

vi.mock('@/lib/medusa/admin-core', () => ({
    adminFetch: mockAdminFetch,
}))

vi.mock('@/lib/medusa/admin', () => ({
    getAdminProductsFull: mockGetAdminProductsFull,
    getAdminCustomers: mockGetAdminCustomers,
    getAdminProduct: mockGetAdminProduct,
    updateVariantPrices: mockUpdateVariantPrices,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mockRevalidatePath,
}))

vi.mock('@/lib/logger', () => ({
    logger: {
        error: mockLoggerError,
        warn: mockLoggerWarn,
    },
}))

vi.mock('stripe', () => ({
    default: vi.fn(),
}))

const scope = { tenantId: 'tenant_123', medusaSalesChannelId: 'sc_1' }

describe('/[lang]/panel/pos server actions', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
        delete process.env.STRIPE_SECRET_KEY
        mockWithPanelGuard.mockResolvedValue({ tenantId: 'tenant_123' })
        mockGetTenantMedusaScope.mockResolvedValue(scope)
        mockAdminFetch.mockResolvedValue({ data: { regions: [{ id: 'reg_1' }] }, error: null })
        mockCreateDraftOrder.mockResolvedValue({
            draft_order: { id: 'draft_1', currency_code: 'eur' },
            error: null,
        })
        mockConvertDraftToOrder.mockResolvedValue({ order_id: 'order_1', display_id: 42, error: null })
        mockRecordPOSTransaction.mockResolvedValue({ transaction: { id: 'tx_1' }, error: null })
        mockUpdateShiftAggregates.mockResolvedValue({ error: null })
        mockReservePOSSyncOperation.mockResolvedValue({
            operation: {
                outcome: 'reserved',
                operation_id: 'operation_1',
                idempotency_key: 'offline_1',
                server_sequence: 1,
                last_client_sequence: 1,
                order_id: null,
                draft_order_id: null,
                display_id: null,
            },
            error: null,
        })
        mockCommitPOSSyncOperation.mockResolvedValue({
            operation: {
                outcome: 'committed',
                operation_id: 'operation_1',
                idempotency_key: 'offline_1',
                server_sequence: 1,
                last_client_sequence: 1,
                order_id: 'order_1',
                draft_order_id: 'draft_1',
                display_id: 42,
            },
            error: null,
        })
        mockGetAdminProductsFull.mockResolvedValue({ products: [{ id: 'prod_1' }] })
        mockGetAdminCustomers.mockResolvedValue({ customers: [{ id: 'cus_1' }] })
    })

    it('creates a POS sale through draft order conversion and records shift metadata', async () => {
        const { createPOSSale } = await import('../actions')

        const result = await createPOSSale({
            items: [{ variant_id: 'variant_1', quantity: 2, unit_price: 500 }],
            payment_method: 'cash',
            shift_id: 'shift_1',
            terminal_id: 'terminal_1',
            cash_tendered: 1200,
        })

        expect(result).toEqual({
            success: true,
            order_id: 'order_1',
            display_id: 42,
            draft_order_id: 'draft_1',
            transaction_id: 'tx_1',
        })
        expect(mockCreateDraftOrder).toHaveBeenCalledWith(expect.objectContaining({
            region_id: 'reg_1',
            sales_channel_id: 'sc_1',
            metadata: expect.objectContaining({
                source: 'pos',
                payment_method: 'cash',
                shift_id: 'shift_1',
                terminal_id: 'terminal_1',
            }),
        }), scope)
        expect(mockRecordPOSTransaction).toHaveBeenCalledWith(expect.objectContaining({
            session_id: 'shift_1',
            order_id: 'order_1',
            amount: 1000,
            payment_method: 'cash',
            cash_tendered: 1200,
            receipt_number: 'POS-42',
        }), scope)
        expect(mockUpdateShiftAggregates).toHaveBeenCalledWith('shift_1', 1000, 'cash', scope)
        expect(mockLogOwnerAction).toHaveBeenCalledWith('tenant_123', 'pos.create_sale', expect.objectContaining({
            orderId: 'order_1',
            totalAmount: 1000,
        }))
    })

    it('fails with stale cart evidence when Medusa rejects unpublished variants', async () => {
        mockCreateDraftOrder.mockResolvedValueOnce({
            draft_order: null,
            error: 'Variants do not exist or are not published',
        })
        const { createPOSSale } = await import('../actions')

        await expect(createPOSSale({
            items: [{ variant_id: 'variant_missing', quantity: 1, unit_price: 500 }],
            payment_method: 'cash',
        })).resolves.toEqual({
            success: false,
            error: 'STALE_CART: Some items in cart no longer exist.',
        })
        expect(mockConvertDraftToOrder).not.toHaveBeenCalled()
    })

    it('commits an offline sale only with an authoritative durable acknowledgement', async () => {
        const { createPOSSale } = await import('../actions')

        await expect(createPOSSale({
            items: [{ variant_id: 'variant_1', quantity: 1, unit_price: 500 }],
            payment_method: 'cash',
            sync: {
                tenant_id: 'tenant_123',
                operation_id: 'operation_1',
                idempotency_key: 'offline_1',
                client_id: 'client_1',
                client_sequence: 1,
                known_server_sequence: 0,
            },
        })).resolves.toMatchObject({
            success: true,
            order_id: 'order_1',
            draft_order_id: 'draft_1',
            display_id: 42,
            sync: {
                outcome: 'committed',
                operation_id: 'operation_1',
                idempotency_key: 'offline_1',
                server_sequence: 1,
                last_client_sequence: 1,
            },
        })
        expect(mockReservePOSSyncOperation).toHaveBeenCalledWith(expect.objectContaining({
            tenant_id: 'tenant_123',
            operation_id: 'operation_1',
            idempotency_key: 'offline_1',
            amount_minor: 500,
            payload_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
        }), scope)
        expect(mockCommitPOSSyncOperation).toHaveBeenCalledWith(expect.objectContaining({
            order_id: 'order_1',
            draft_order_id: 'draft_1',
            display_id: 42,
        }), scope)
    })

    it('acknowledges a committed replay without creating a duplicate draft', async () => {
        mockReservePOSSyncOperation.mockResolvedValueOnce({
            operation: {
                outcome: 'duplicate',
                operation_id: 'operation_1',
                idempotency_key: 'offline_1',
                server_sequence: 7,
                last_client_sequence: 1,
                order_id: 'order_existing',
                draft_order_id: 'draft_existing',
                display_id: 77,
            },
            error: null,
        })
        const { createPOSSale } = await import('../actions')

        await expect(createPOSSale({
            items: [{ variant_id: 'variant_1', quantity: 1, unit_price: 500 }],
            payment_method: 'cash',
            sync: {
                tenant_id: 'tenant_123',
                operation_id: 'operation_1',
                idempotency_key: 'offline_1',
                client_id: 'client_1',
                client_sequence: 1,
                known_server_sequence: 0,
            },
        })).resolves.toEqual({
            success: true,
            order_id: 'order_existing',
            display_id: 77,
            draft_order_id: 'draft_existing',
            sync: {
                outcome: 'duplicate',
                operation_id: 'operation_1',
                idempotency_key: 'offline_1',
                server_sequence: 7,
                last_client_sequence: 1,
            },
        })
        expect(mockCreateDraftOrder).not.toHaveBeenCalled()
        expect(mockConvertDraftToOrder).not.toHaveBeenCalled()
        expect(mockCommitPOSSyncOperation).not.toHaveBeenCalled()
    })

    it('returns an authoritative conflict without creating a sale', async () => {
        mockReservePOSSyncOperation.mockResolvedValueOnce({
            operation: {
                outcome: 'conflict',
                operation_id: 'operation_existing',
                idempotency_key: 'offline_1',
                server_sequence: 7,
                last_client_sequence: 1,
                order_id: null,
                draft_order_id: null,
                display_id: null,
            },
            error: null,
        })
        const { createPOSSale } = await import('../actions')

        await expect(createPOSSale({
            items: [{ variant_id: 'variant_1', quantity: 1, unit_price: 500 }],
            payment_method: 'cash',
            sync: {
                tenant_id: 'tenant_123',
                operation_id: 'operation_conflicting',
                idempotency_key: 'offline_1',
                client_id: 'client_1',
                client_sequence: 1,
                known_server_sequence: 0,
            },
        })).resolves.toEqual({
            success: true,
            sync: {
                outcome: 'conflict',
                operation_id: 'operation_existing',
                idempotency_key: 'offline_1',
                server_sequence: 7,
                last_client_sequence: 1,
            },
        })
        expect(mockCreateDraftOrder).not.toHaveBeenCalled()
        expect(mockCommitPOSSyncOperation).not.toHaveBeenCalled()
    })

    it('does not emit a sync acknowledgement when durable finalization fails', async () => {
        mockCommitPOSSyncOperation.mockResolvedValueOnce({
            operation: null,
            error: 'sync database unavailable',
        })
        const { createPOSSale } = await import('../actions')

        await expect(createPOSSale({
            items: [{ variant_id: 'variant_1', quantity: 1, unit_price: 500 }],
            payment_method: 'cash',
            sync: {
                tenant_id: 'tenant_123',
                operation_id: 'operation_1',
                idempotency_key: 'offline_1',
                client_id: 'client_1',
                client_sequence: 1,
                known_server_sequence: 0,
            },
        })).resolves.toEqual({
            success: false,
            order_id: 'order_1',
            display_id: 42,
            draft_order_id: 'draft_1',
            error: 'sync database unavailable',
        })
        expect(mockCreateDraftOrder).toHaveBeenCalledTimes(1)
        expect(mockConvertDraftToOrder).toHaveBeenCalledTimes(1)
    })

    it('searches POS products and customers through tenant-scoped Medusa helpers', async () => {
        const { lookupPOSCustomer, searchPOSProducts } = await import('../actions')

        await expect(searchPOSProducts('sku-123')).resolves.toEqual({ products: [{ id: 'prod_1' }] })
        await expect(lookupPOSCustomer('ada@example.com')).resolves.toEqual({ customers: [{ id: 'cus_1' }] })

        expect(mockGetAdminProductsFull).toHaveBeenCalledWith({
            limit: 20,
            q: 'sku-123',
            status: 'published',
        }, scope)
        expect(mockGetAdminCustomers).toHaveBeenCalledWith({
            limit: 10,
            q: 'ada@example.com',
        }, scope)
    })

    it('adds a variant currency price without overwriting existing currencies', async () => {
        mockWithPanelGuard.mockResolvedValueOnce({ tenantId: 'tenant_123' })
        mockGetAdminProduct.mockResolvedValue({
            id: 'prod_1',
            variants: [{
                id: 'variant_1',
                prices: [
                    { amount: 1000, currency_code: 'eur' },
                    { amount: 1200, currency_code: 'chf' },
                ],
            }],
        })
        mockUpdateVariantPrices.mockResolvedValue({ error: null })
        const { addVariantCurrencyPrice } = await import('../actions')

        await expect(addVariantCurrencyPrice({
            productId: 'prod_1',
            variantId: 'variant_1',
            amount: 15,
            currencyCode: 'EUR',
        })).resolves.toEqual({ success: true })

        expect(mockWithPanelGuard).toHaveBeenCalledWith({ requiredFlag: 'enable_ecommerce' })
        expect(mockUpdateVariantPrices).toHaveBeenCalledWith(
            'prod_1',
            'variant_1',
            [
                { amount: 1200, currency_code: 'chf' },
                { amount: 1500, currency_code: 'eur' },
            ],
            scope,
        )
    })

    it('does not create Terminal payments when Stripe secret is absent', async () => {
        const { createTerminalPaymentAction, listTerminalReadersAction } = await import('../actions')

        await expect(createTerminalPaymentAction({
            amount: 1000,
            currency: 'EUR',
            reader_id: 'tmr_1',
        })).resolves.toEqual({
            success: false,
            error: 'STRIPE_SECRET_KEY not configured',
        })
        await expect(listTerminalReadersAction()).resolves.toEqual([])
    })
})
