/**
 * Seeder: Customers
 *
 * Creates realistic demo customers in Medusa.
 * Uses email domain @bootandstrap.demo for easy identification
 * and cleanup during deep clean.
 */

import { MedusaClient } from '../medusa-client'
import type { IndustryTemplate, LogFn } from '../types'

interface CustomersResult {
    customersCreated: number
    customerIds: string[]
}

export async function seedCustomers(
    client: MedusaClient,
    template: IndustryTemplate,
    log: LogFn
): Promise<CustomersResult> {
    log('👥', '═══ CUSTOMERS SEED START ═══')

    const existingCustomers = await client.getCustomers(500)
    const existingEmails = new Set(existingCustomers.map(c => c.email))

    let customersCreated = 0
    const customerIds: string[] = []

    for (const custDef of template.customers) {
        if (existingEmails.has(custDef.email)) {
            const existing = existingCustomers.find(c => c.email === custDef.email)
            if (existing) customerIds.push(existing.id)
            log('⏭️', `Customer exists: ${custDef.first_name} ${custDef.last_name}`)
            continue
        }

        try {
            const res = await client.request<{ customer: { id: string } }>('/admin/customers', {
                body: {
                    first_name: custDef.first_name,
                    last_name: custDef.last_name,
                    email: custDef.email,
                    phone: custDef.phone ?? '',
                    metadata: custDef.metadata ?? {},
                },
            })

            customerIds.push(res.customer.id)
            customersCreated++
            log('✅', `Customer created: ${custDef.first_name} ${custDef.last_name} (${custDef.email})`)
        } catch (err) {
            log('⚠️', `Customer failed: ${custDef.email} — ${err instanceof Error ? err.message : err}`)
        }
    }

    log('👥', `═══ CUSTOMERS SEED COMPLETE: ${customersCreated} created ═══`)
    return { customersCreated, customerIds }
}
