import PosModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const POS_MODULE = "posModuleService"

export default Module(POS_MODULE, {
    service: PosModuleService,
})
