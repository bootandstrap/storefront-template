import { MedusaService } from "@medusajs/framework/utils"
import CrmContact from "./models/crm-contact"
import CrmInteraction from "./models/crm-interaction"
import CrmSegment from "./models/crm-segment"

/**
 * CrmModuleService
 *
 * Auto-generated CRUD for:
 *   - CrmContact: listCrmContacts, createCrmContacts, etc.
 *   - CrmInteraction: listCrmInteractions, createCrmInteractions, etc.
 *   - CrmSegment: listCrmSegments, createCrmSegments, etc.
 *
 * Planned custom methods:
 *   - syncFromMedusaCustomer(customerId) — creates/updates CRM contact
 *   - addInteraction(contactId, type, summary, content)
 *   - evaluateSegment(segmentId) — re-evaluate rules and update contact_count
 *   - getContactTimeline(contactId) — ordered interactions
 *   - exportContacts(filter, format) — CSV/JSON export
 */
class CrmModuleService extends MedusaService({
    CrmContact,
    CrmInteraction,
    CrmSegment,
}) { }

export default CrmModuleService
