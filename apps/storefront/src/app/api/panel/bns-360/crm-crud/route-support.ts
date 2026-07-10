import 'server-only'

import { adminFetch } from '@/lib/medusa/admin-core'
import { getAdminCustomerDetail, getAdminCustomers } from '@/lib/medusa/admin'
import { getTenantMedusaScope } from '@/lib/medusa/tenant-scope'
import type {
    Bns360CrmCrudContactInput,
    Bns360CrmCrudContactUpdate,
    Bns360CrmCrudCustomer,
    Bns360CrmCrudMedusaClient,
} from '@/lib/bns-360/crm-crud-journey'

type MedusaCustomerPayload = {
    id: string
    email: string
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    metadata?: Record<string, unknown> | null
}

function normalizeCustomer(customer: MedusaCustomerPayload): Bns360CrmCrudCustomer {
    return {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        phone: customer.phone,
        metadata: customer.metadata,
    }
}

export async function createBns360CrmCrudMedusaClient(
    tenantId: string
): Promise<Bns360CrmCrudMedusaClient> {
    const scope = await getTenantMedusaScope(tenantId)
    if (!scope) {
        throw new Error('Medusa configuration not found')
    }

    return {
        async createContact(input: Bns360CrmCrudContactInput) {
            const { data, error } = await adminFetch<{ customer: MedusaCustomerPayload }>('/admin/customers', {
                method: 'POST',
                body: JSON.stringify({
                    email: input.email,
                    first_name: input.firstName,
                    last_name: input.lastName,
                    phone: input.phone,
                    metadata: input.metadata,
                }),
            }, scope)
            if (error || !data?.customer) {
                throw new Error(error ?? 'CRM contact create returned no customer')
            }
            return normalizeCustomer(data.customer)
        },

        async findContactByEmail(email: string) {
            const { customers } = await getAdminCustomers({ limit: 10, q: email }, scope)
            const match = customers.find(customer => customer.email?.toLowerCase() === email.toLowerCase())
            return match ? normalizeCustomer(match) : null
        },

        async getContact(customerId: string) {
            const customer = await getAdminCustomerDetail(customerId, scope)
            return customer ? normalizeCustomer(customer) : null
        },

        async updateContact(customerId: string, input: Bns360CrmCrudContactUpdate) {
            const body: Record<string, unknown> = {}
            if (input.firstName !== undefined) body.first_name = input.firstName
            if (input.lastName !== undefined) body.last_name = input.lastName
            if (input.phone !== undefined) body.phone = input.phone
            if (input.metadata !== undefined) body.metadata = input.metadata

            const { data, error } = await adminFetch<{ customer: MedusaCustomerPayload }>(
                `/admin/customers/${customerId}`,
                {
                    method: 'POST',
                    body: JSON.stringify(body),
                },
                scope
            )
            if (error || !data?.customer) {
                throw new Error(error ?? 'CRM contact update returned no customer')
            }
            return normalizeCustomer(data.customer)
        },

        async deleteContact(customerId: string) {
            const { error } = await adminFetch(`/admin/customers/${customerId}`, {
                method: 'DELETE',
            }, scope)
            if (error) {
                throw new Error(error)
            }
        },
    }
}
