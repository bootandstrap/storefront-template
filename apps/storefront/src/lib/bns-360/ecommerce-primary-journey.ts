import { randomUUID } from 'node:crypto'

export interface Bns360EcommerceProduct {
    id: string
    title: string
    handle: string
    status: string
    metadata?: Record<string, unknown> | null
}

export interface Bns360EcommerceProductInput {
    title: string
    handle: string
    description: string
    status: 'draft'
    metadata: Record<string, unknown>
    options: Array<{ title: string; values: string[] }>
    variants: Array<{
        title: string
        prices: Array<{ amount: number; currency_code: string }>
        manage_inventory: boolean
        options: Record<string, string>
    }>
}

export interface Bns360EcommerceProductUpdate {
    title?: string
    description?: string
    status?: 'draft'
    metadata?: Record<string, unknown>
}

export interface Bns360EcommerceMedusaClient {
    createProduct(input: Bns360EcommerceProductInput): Promise<Bns360EcommerceProduct>
    findProductByHandle(handle: string): Promise<Bns360EcommerceProduct | null>
    getProduct(productId: string): Promise<Bns360EcommerceProduct | null>
    updateProduct(productId: string, input: Bns360EcommerceProductUpdate): Promise<Bns360EcommerceProduct>
    deleteProduct(productId: string): Promise<void>
}

export interface Bns360EcommercePrimaryJourneyInput {
    tenantId: string
    client: Bns360EcommerceMedusaClient
    runId?: string
}

export interface Bns360EcommercePrimaryJourneyResult {
    schema: 'bootandstrap.template.bns-360.ecommerce-primary/v1'
    status: 'verified' | 'blocked'
    runId: string
    tenantRef: string
    generatedAt: string
    steps: Array<{
        key: 'create' | 'read_after_create' | 'update' | 'read_after_update' | 'delete' | 'read_after_delete'
        status: 'verified' | 'blocked'
    }>
    runtime: {
        product: {
            id: string | null
            handle: string
            status: string | null
        }
        catalog: {
            readableAfterCreate: boolean
            updatedTitle: string | null
        }
        certificationCoverage: {
            productCrud: 'verified' | 'blocked'
            storefrontCatalog: 'verified' | 'blocked'
            checkoutPaymentCollection: 'manual_required'
            customerAccount: 'manual_required'
            orderLifecycle: 'manual_required'
            blockedReason: string
        }
    }
    cleanup: {
        status: 'verified' | 'failed'
    }
    residue: {
        zero: boolean
    }
    error?: string
}

export async function runBns360EcommercePrimaryJourney(
    input: Bns360EcommercePrimaryJourneyInput
): Promise<Bns360EcommercePrimaryJourneyResult> {
    const runId = input.runId ?? `bns360-ecommerce-${Date.now()}-${randomUUID()}`
    const handleSeed = runId.startsWith('bns360-ecommerce-') ? runId : `bns360-ecommerce-${runId}`
    const handle = handleSeed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const steps: Bns360EcommercePrimaryJourneyResult['steps'] = []
    let productId: string | null = null
    let productStatus: string | null = null
    let readableAfterCreate = false
    let updatedTitle: string | null = null
    let journeyError: string | undefined
    let cleanupStatus: Bns360EcommercePrimaryJourneyResult['cleanup']['status'] = 'failed'
    let residueZero = false

    try {
        const created = await input.client.createProduct({
            title: 'BNS360 Product Initial',
            handle,
            description: `BNS 360 certification product for ${runId}`,
            status: 'draft',
            metadata: {
                bns360_run_id: runId,
                bns360_status: 'created',
            },
            options: [{ title: 'Formato', values: ['Default'] }],
            variants: [
                {
                    title: 'Default',
                    prices: [{ amount: 100, currency_code: 'eur' }],
                    manage_inventory: false,
                    options: { Formato: 'Default' },
                },
            ],
        })
        productId = created.id
        productStatus = created.status
        steps.push({ key: 'create', status: 'verified' })

        const readAfterCreate = await input.client.findProductByHandle(handle)
        if (!readAfterCreate?.id) {
            throw new Error('Ecommerce product was not readable after create')
        }
        readableAfterCreate = true
        steps.push({ key: 'read_after_create', status: 'verified' })

        await input.client.updateProduct(productId, {
            title: 'BNS360 Product Updated',
            status: 'draft',
            metadata: {
                bns360_run_id: runId,
                bns360_status: 'updated',
            },
        })
        steps.push({ key: 'update', status: 'verified' })

        const readAfterUpdate = await input.client.getProduct(productId)
        if (
            !readAfterUpdate ||
            readAfterUpdate.title !== 'BNS360 Product Updated' ||
            readAfterUpdate.metadata?.bns360_status !== 'updated'
        ) {
            throw new Error('Ecommerce product update was not durable')
        }
        updatedTitle = readAfterUpdate.title
        productStatus = readAfterUpdate.status
        steps.push({ key: 'read_after_update', status: 'verified' })
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'Ecommerce primary journey failed'
    } finally {
        if (productId) {
            try {
                await input.client.deleteProduct(productId)
                steps.push({ key: 'delete', status: 'verified' })
            } catch (error) {
                journeyError = journeyError ?? (error instanceof Error ? error.message : 'Ecommerce cleanup delete failed')
            }
        }

        try {
            const residue = await input.client.findProductByHandle(handle)
            residueZero = residue === null
            cleanupStatus = residueZero ? 'verified' : 'failed'
            steps.push({
                key: 'read_after_delete',
                status: residueZero ? 'verified' : 'blocked',
            })
        } catch (error) {
            journeyError = journeyError ?? (error instanceof Error ? error.message : 'Ecommerce cleanup verification failed')
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.ecommerce-primary/v1',
        status: !journeyError && cleanupStatus === 'verified' && residueZero ? 'verified' : 'blocked',
        runId,
        tenantRef: input.tenantId,
        generatedAt: new Date().toISOString(),
        steps,
        runtime: {
            product: {
                id: productId,
                handle,
                status: productStatus,
            },
            catalog: {
                readableAfterCreate,
                updatedTitle,
            },
            certificationCoverage: {
                productCrud: productId && cleanupStatus === 'verified' && residueZero ? 'verified' : 'blocked',
                storefrontCatalog: readableAfterCreate && updatedTitle ? 'verified' : 'blocked',
                checkoutPaymentCollection: 'manual_required',
                customerAccount: 'manual_required',
                orderLifecycle: 'manual_required',
                blockedReason: 'reversible Medusa checkout/customer/order probes are not implemented',
            },
        },
        cleanup: {
            status: cleanupStatus,
        },
        residue: {
            zero: residueZero,
        },
        ...(journeyError ? { error: journeyError } : {}),
    }
}
