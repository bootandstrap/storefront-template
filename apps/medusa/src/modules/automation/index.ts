import AutomationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const AUTOMATION_MODULE = "automationModuleService"

export default Module(AUTOMATION_MODULE, {
    service: AutomationModuleService,
})
