/**
 * Link: Medusa Customer ↔ CRM Contact
 *
 * Establishes a relationship between Medusa's native Customer entity
 * and our custom CRM Contact. This enables:
 *   - Querying CRM data from a Customer context
 *   - Syncing customer lifecycle events to CRM
 *   - Enriching Medusa orders with CRM segments/tags
 *
 * Usage in workflows:
 *   const links = await remoteLink.list({
 *       customer: { customer_id: "cus_xxx" }
 *   })
 */
import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import CrmModule from "../modules/crm"

export default defineLink(
    CustomerModule.linkable.customer,
    CrmModule.linkable.crmContact,
)
