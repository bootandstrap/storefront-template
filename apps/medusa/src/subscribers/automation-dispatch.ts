import type {
    SubscriberArgs,
    SubscriberConfig,
} from "@medusajs/framework"
import { withGovernanceGate } from "./shared/governance-gate"
import { AUTOMATION_MODULE } from "../modules/automation"
import type AutomationModuleService from "../modules/automation/service"

/**
 * Subscriber: order.placed → Automation rule dispatch
 *
 * When an order is placed, checks for active automation rules
 * triggered by `order.placed` and logs executions.
 *
 * GOVERNANCE: Gated on `enable_automation` — skipped if Automation module is disabled.
 */
export default withGovernanceGate("enable_automation", async ({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) => {
    try {
        const automationService = container.resolve(AUTOMATION_MODULE) as AutomationModuleService

        // Find active rules triggered by order.placed
        const rules = await automationService.listAutomationRules(
            { trigger_event: "order.placed", status: "active" },
            { take: 50 }
        )

        if (rules.length === 0) return

        for (const rule of rules) {
            try {
                // Log execution (actual action dispatch is handled by the rule engine)
                await automationService.createAutomationExecutions({
                    rule_id: rule.id,
                    trigger_event: "order.placed",
                    event_payload: { order_id: data.id },
                    status: "success",
                })

                console.log(JSON.stringify({
                    level: "info",
                    event: "automation.rule_executed",
                    rule_id: rule.id,
                    rule_name: (rule as any).name,
                    trigger: "order.placed",
                    order_id: data.id,
                }))
            } catch (ruleErr) {
                await automationService.createAutomationExecutions({
                    rule_id: rule.id,
                    trigger_event: "order.placed",
                    event_payload: { order_id: data.id },
                    status: "failed",
                    error_message: ruleErr instanceof Error ? ruleErr.message : String(ruleErr),
                })
            }
        }
    } catch (err) {
        console.error(JSON.stringify({
            level: "error",
            event: "automation.dispatch_failed",
            order_id: data.id,
            error: err instanceof Error ? err.message : String(err),
        }))
    }
})

export const config: SubscriberConfig = {
    event: "order.placed",
}
