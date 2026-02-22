import { MedusaService } from "@medusajs/framework/utils"
import ProductReview from "./models/product-review"

/**
 * ProductReviewModuleService
 * 
 * Extends MedusaService factory to auto-generate CRUD methods:
 *   - listProductReviews(filters, config)
 *   - listAndCountProductReviews(filters, config)
 *   - retrieveProductReview(id, config)
 *   - createProductReviews(data | data[])
 *   - updateProductReviews(data | data[])
 *   - deleteProductReviews(ids)
 */
class ProductReviewModuleService extends MedusaService({
    ProductReview,
}) { }

export default ProductReviewModuleService
