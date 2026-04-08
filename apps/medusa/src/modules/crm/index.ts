import CrmModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const CRM_MODULE = "crmModuleService"

export default Module(CRM_MODULE, {
    service: CrmModuleService,
})
