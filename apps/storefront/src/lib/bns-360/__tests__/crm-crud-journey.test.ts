import { describe, expect, it, vi } from 'vitest'

import {
    runBns360CrmCrudJourney,
    type Bns360CrmCrudCustomer,
    type Bns360CrmCrudMedusaClient,
} from '../crm-crud-journey'

function createCustomer(overrides: Partial<Bns360CrmCrudCustomer> = {}): Bns360CrmCrudCustomer {
    return {
        id: 'cus_bns360',
        email: 'bns360-crm-run@example.invalid',
        firstName: 'BNS360',
        lastName: 'Initial',
        phone: '+15550101010',
        metadata: { bns360_run_id: 'run-1' },
        ...overrides,
    }
}

function createClient(): Bns360CrmCrudMedusaClient {
    const customer = createCustomer()

    return {
        createContact: vi.fn().mockResolvedValue(customer),
        findContactByEmail: vi.fn()
            .mockResolvedValueOnce(customer)
            .mockResolvedValueOnce(null),
        getContact: vi.fn().mockResolvedValue(createCustomer({
            firstName: 'BNS360',
            lastName: 'Updated',
            metadata: { bns360_run_id: 'run-1', bns360_status: 'updated' },
        })),
        updateContact: vi.fn().mockResolvedValue(createCustomer({
            firstName: 'BNS360',
            lastName: 'Updated',
            metadata: { bns360_run_id: 'run-1', bns360_status: 'updated' },
        })),
        deleteContact: vi.fn().mockResolvedValue(undefined),
    }
}

describe('runBns360CrmCrudJourney', () => {
    it('creates, reads, updates, deletes and verifies zero residue with a unique run id', async () => {
        const client = createClient()

        const result = await runBns360CrmCrudJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result).toMatchObject({
            schema: 'bootandstrap.template.bns-360.crm-crud/v1',
            status: 'verified',
            runId: 'run-1',
            tenantRef: 'tenant-1',
            cleanup: { status: 'verified' },
            residue: { zero: true },
        })
        expect(client.createContact).toHaveBeenCalledWith(expect.objectContaining({
            email: expect.stringContaining('run-1'),
            metadata: expect.objectContaining({ bns360_run_id: 'run-1' }),
        }))
        expect(client.findContactByEmail).toHaveBeenCalledTimes(2)
        expect(client.updateContact).toHaveBeenCalledWith('cus_bns360', expect.objectContaining({
            lastName: 'Updated',
            metadata: expect.objectContaining({ bns360_status: 'updated' }),
        }))
        expect(client.deleteContact).toHaveBeenCalledWith('cus_bns360')
        expect(JSON.stringify(result)).not.toContain('bns360-crm-run@example.invalid')
        expect(JSON.stringify(result)).not.toContain('+15550101010')
    })

    it('generates distinct run ids when one is not supplied', async () => {
        const first = await runBns360CrmCrudJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })
        const second = await runBns360CrmCrudJourney({
            tenantId: 'tenant-1',
            client: createClient(),
        })

        expect(first.runId).toMatch(/^bns360-crm-/)
        expect(second.runId).toMatch(/^bns360-crm-/)
        expect(first.runId).not.toBe(second.runId)
    })

    it('runs cleanup in finally after an intermediate failure', async () => {
        const client = createClient()
        vi.mocked(client.updateContact).mockRejectedValueOnce(new Error('update failed'))

        const result = await runBns360CrmCrudJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('verified')
        expect(result.residue.zero).toBe(true)
        expect(client.deleteContact).toHaveBeenCalledWith('cus_bns360')
    })

    it('blocks certification when cleanup residue cannot be disproved', async () => {
        const client = createClient()
        vi.mocked(client.findContactByEmail)
            .mockReset()
            .mockResolvedValueOnce(createCustomer())
            .mockResolvedValueOnce(createCustomer())

        const result = await runBns360CrmCrudJourney({
            tenantId: 'tenant-1',
            client,
            runId: 'run-1',
        })

        expect(result.status).toBe('blocked')
        expect(result.cleanup.status).toBe('failed')
        expect(result.residue.zero).toBe(false)
    })
})
