import { MedusaService } from "@medusajs/framework/utils"
import AutomationRule from "./models/automation-rule"
import AutomationExecution from "./models/automation-execution"

/**
 * AutomationModuleService
 *
 * Planned custom methods:
 *   - evaluateRules(eventType, eventData) — find matching active rules
 *   - executeAction(rule, eventData) — dispatch action
 *   - logExecution(ruleId, status, result)
 *   - getExecutionHistory(ruleId, limit)
 *   - getRuleStats() — execution counts, success rates
 */
class AutomationModuleService extends MedusaService({
    AutomationRule,
    AutomationExecution,
}) { }

export default AutomationModuleService
