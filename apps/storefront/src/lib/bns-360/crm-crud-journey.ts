import { randomUUID } from 'node:crypto'

export interface Bns360CrmCrudCustomer {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    metadata?: Record<string, unknown> | null
}

export interface Bns360CrmCrudMedusaClient {
    createContact(input: Bns360CrmCrudContactInput): Promise<Bns360CrmCrudCustomer>
    findContactByEmail(email: string): Promise<Bns360CrmCrudCustomer | null>
    getContact(customerId: string): Promise<Bns360CrmCrudCustomer | null>
    updateContact(customerId: string, input: Bns360CrmCrudContactUpdate): Promise<Bns360CrmCrudCustomer>
    deleteContact(customerId: string): Promise<void>
}

export interface Bns360CrmCrudContactInput {
    email: string
    firstName: string
    lastName: string
    phone: string
    metadata: Record<string, unknown>
}

export interface Bns360CrmCrudContactUpdate {
    firstName?: string
    lastName?: string
    phone?: string
    metadata?: Record<string, unknown>
}

export interface Bns360CrmCrudJourneyInput {
    tenantId: string
    client: Bns360CrmCrudMedusaClient
    runId?: string
}

export interface Bns360CrmCrudJourneyResult {
    schema: 'bootandstrap.template.bns-360.crm-crud/v1'
    status: 'verified' | 'blocked'
    runId: string
    tenantRef: string
    generatedAt: string
    steps: Array<{
        key: 'create' | 'read_after_create' | 'update' | 'read_after_update' | 'delete' | 'read_after_delete'
        status: 'verified' | 'blocked'
    }>
    resource: {
        kind: 'medusa_customer'
        id: string | null
        email: '[redacted]'
    }
    cleanup: {
        status: 'verified' | 'failed'
    }
    residue: {
        zero: boolean
    }
    error?: string
}

export async function runBns360CrmCrudJourney(
    input: Bns360CrmCrudJourneyInput
): Promise<Bns360CrmCrudJourneyResult> {
    const runId = input.runId ?? `bns360-crm-${Date.now()}-${randomUUID()}`
    const email = `${runId}@bns360.invalid`.toLowerCase()
    const steps: Bns360CrmCrudJourneyResult['steps'] = []
    let customerId: string | null = null
    let journeyError: string | undefined
    let cleanupStatus: Bns360CrmCrudJourneyResult['cleanup']['status'] = 'failed'
    let residueZero = false

    try {
        const created = await input.client.createContact({
            email,
            firstName: 'BNS360',
            lastName: 'Initial',
            phone: '+15550101010',
            metadata: {
                bns360_run_id: runId,
                bns360_status: 'created',
            },
        })
        customerId = created.id
        steps.push({ key: 'create', status: 'verified' })

        const readAfterCreate = await input.client.findContactByEmail(email)
        if (!readAfterCreate?.id) {
            throw new Error('CRM contact was not readable after create')
        }
        steps.push({ key: 'read_after_create', status: 'verified' })

        await input.client.updateContact(customerId, {
            lastName: 'Updated',
            metadata: {
                bns360_run_id: runId,
                bns360_status: 'updated',
            },
        })
        steps.push({ key: 'update', status: 'verified' })

        const readAfterUpdate = await input.client.getContact(customerId)
        if (
            !readAfterUpdate ||
            readAfterUpdate.lastName !== 'Updated' ||
            readAfterUpdate.metadata?.bns360_status !== 'updated'
        ) {
            throw new Error('CRM contact update was not durable')
        }
        steps.push({ key: 'read_after_update', status: 'verified' })
    } catch (error) {
        journeyError = error instanceof Error ? error.message : 'CRM CRUD journey failed'
    } finally {
        if (customerId) {
            try {
                await input.client.deleteContact(customerId)
                steps.push({ key: 'delete', status: 'verified' })
            } catch (error) {
                journeyError = journeyError ?? (error instanceof Error ? error.message : 'CRM cleanup delete failed')
            }
        }

        try {
            const residue = await input.client.findContactByEmail(email)
            residueZero = residue === null
            cleanupStatus = residueZero ? 'verified' : 'failed'
            steps.push({
                key: 'read_after_delete',
                status: residueZero ? 'verified' : 'blocked',
            })
        } catch (error) {
            journeyError = journeyError ?? (error instanceof Error ? error.message : 'CRM cleanup verification failed')
        }
    }

    return {
        schema: 'bootandstrap.template.bns-360.crm-crud/v1',
        status: !journeyError && cleanupStatus === 'verified' && residueZero ? 'verified' : 'blocked',
        runId,
        tenantRef: input.tenantId,
        generatedAt: new Date().toISOString(),
        steps,
        resource: {
            kind: 'medusa_customer',
            id: customerId,
            email: '[redacted]',
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
