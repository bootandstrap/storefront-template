/**
 * Link: Medusa Product ↔ Product Review
 *
 * Establishes a relationship between Medusa's native Product entity
 * and our custom Product Review module. This enables:
 *   - Querying reviews for a product via Medusa's query API
 *   - Computing average ratings in product listings
 *   - Filtering products by review score
 */
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductReviewModule from "../modules/product-reviews"

export default defineLink(
    ProductModule.linkable.product,
    ProductReviewModule.linkable.productReview,
)
