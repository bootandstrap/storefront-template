import ProductReviewModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PRODUCT_REVIEW_MODULE = "productReviewModuleService"

export default Module(PRODUCT_REVIEW_MODULE, {
    service: ProductReviewModuleService,
})
