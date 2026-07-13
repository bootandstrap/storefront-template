import { describe, expect, it, vi } from 'vitest'

import {
    runBns360EcommercePrimaryJourney,
    type Bns360EcommerceMedusaClient,
    type Bns360EcommerceProduct,
} from '../ecommerce-primary-journey'

function createProduct(overrides: Partial<Bns360EcommerceProduct> = {}): Bns360EcommerceProduct {
    return {
        id: 'prod_bns360',
        title: 'BNS360 Product Initial',
        handle: 'bns360-ecommerce-run-1',
        status: 'draft',
        metadata: {
            bns360_run_id: 'run-1',
            bns360_status: 'created',
        },
        ...overrides,
    }
}

function createClient(): Bns360EcommerceMedusaClient {
    const product = createProduct()

    return {
        createProduct: vi.fn().mockResolvedValue(product),
        findProductByHandle: vi.fn()
            .mockResolvedValueOnce(product)
            .mockResolvedValueOnce(null),
        getProduct: vi.fn().mockResolvedValue(createProduct({
            title: 'BNS360 Product Updated',
            metadata: {
                bns360_run_id: 'run-1',
                bns360_status: 'updated',
            },
        })),
        updateProduct: vi.fn().mockResolvedValue(createProduct({
            title: 'BNS360 Product Updated',
            metadata: {
                bns360_run_id: 'run-1',
                bns360_status: 'updated',
            },
        })),
        deleteProduct: vi.fn().mockResolvedValue(undefined),
    }
}

describe('runBns360EcommercePrimaryJourney', () => {
    it('creates, reads, updates, deletes and verifies zero residue with a unique run id', async () => {
        const client = createClient()

        const result = await runBns360EcommercePrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.ecommerce-primary/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            runtime: {
                product: {
                    id: 'prod_bns360',
                    handle: 'bns360-ecommerce-run-1',
                    status: 'draft',
                },
                catalog: {
                    readableAfterCreate: true,
                    updatedTitle: 'BNS360 Product Updated',
                },
                certificationCoverage: {
                    productCrud: 'verified',
                    storefrontCatalog: 'verified',
                    checkoutPaymentCollection: 'manual_required',
                    customerAccount: 'manual_required',
                    orderLifecycle: 'manual_required',
                    blockedReason: 'reversible Medusa checkout/customer/order probes are not implemented',
                },
            },
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
        expect(client.createProduct).toHaveBeenCalledWith(expect.objectContaining({
            title: 'BNS360 Product Initial',
            handle: 'bns360-ecommerce-run-1',
            status: 'draft',
            metadata: expect.objectContaining({ bns360_run_id: 'run-1' }),
            options: [{ title: 'Formato', values: ['Default'] }],
            variants: [
                expect.objectContaining({
                    title: 'Default',
                    options: { Formato: 'Default' },
                }),
            ],
        }))
        expect(client.findProductByHandle).toHaveBeenCalledTimes(2)
        expect(client.updateProduct).toHaveBeenCalledWith('prod_bns360', expect.objectContaining({
            title: 'BNS360 Product Updated',
            metadata: expect.objectContaining({ bns360_status: 'updated' }),
        }))
        expect(client.deleteProduct).toHaveBeenCalledWith('prod_bns360')
        expect(JSON.stringify(result)).not.toContain('MEDUSA_ADMIN_PASSWORD')
        expect(JSON.stringify(result)).not.toContain('token')
        expect(JSON.stringify(result)).not.toContain('password')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360EcommercePrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })
        const second = await runBns360EcommercePrimaryJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })

        expect(first.runId).toMatch(/^bns360-ecommerce-/)
        expect(second.runId).toMatch(/^bns360-ecommerce-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('runs cleanup in finally after an intermediate failure', async () => {
        const client = createClient()
        vi.mocked(client.updateProduct).mockRejectedValueOnce(new Error('update failed'))

        const result = await runBns360EcommercePrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('verified')
        expect(result.residue.zero).toBe(true)
        expect(client.deleteProduct).toHaveBeenCalledWith('prod_bns360')
    })

    it('blocks certification when cleanup residue cannot be disproved', async () => {
        const client = createClient()
        vi.mocked(client.findProductByHandle)
            .mockReset()
            .mockResolvedValueOnce(createProduct())
            .mockResolvedValueOnce(createProduct())

        const result = await runBns360EcommercePrimaryJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('failed')
        expect(result.residue.zero).toBe(false)
    })
})
