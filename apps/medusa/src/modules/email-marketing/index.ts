import EmailMarketingModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const EMAIL_MARKETING_MODULE = "emailMarketingModuleService"

export default Module(EMAIL_MARKETING_MODULE, {
    service: EmailMarketingModuleService,
})
