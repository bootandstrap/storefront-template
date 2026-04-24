import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { withGovernanceGate } from "./shared/governance-gate"
import { CRM_MODULE } from "../modules/crm"
import type CrmModuleService from "../modules/crm/service"

/**
 * Subscriber: order.placed → CRM auto-create contact
 *
 * When an order is placed, automatically creates or updates a CRM contact
 * from the order's customer data. This enriches the CRM pipeline without
 * manual data entry.
 *
 * GOVERNANCE: Gated on `enable_crm` — skipped if CRM module is disabled.
 */
export default withGovernanceGate("enable_crm", async ({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) => {
    try {
        const orderModule = container.resolve("order")
        const order = await orderModule.retrieveOrder(data.id, {
            relations: ["shipping_address"],
        })

        if (!order.email) return

        const crmService = container.resolve(CRM_MODULE) as CrmModuleService

        // Check if contact already exists
        const existing = await crmService.listCrmContacts(
            { email: order.email },
            { take: 1 }
        )

        if (existing.length === 0) {
            // Auto-create contact from order data
            await crmService.createCrmContacts({
                first_name: order.shipping_address?.first_name ?? "Unknown",
                last_name: order.shipping_address?.last_name ?? "",
                email: order.email,
                phone: order.shipping_address?.phone ?? undefined,
                source: "order",
                stage: "customer",
            } as any)

            console.log(JSON.stringify({
                level: "info",
                event: "crm.contact_auto_created",
                email: order.email,
                order_id: order.id,
            }))
        }
    } catch (err) {
        console.error(JSON.stringify({
            level: "error",
            event: "crm.contact_auto_create_failed",
            order_id: data.id,
            error: err instanceof Error ? err.message : String(err),
        }))
    }
})

export const config: SubscriberConfig = {
    event: "order.placed",
}
