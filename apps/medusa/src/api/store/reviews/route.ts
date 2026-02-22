import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-reviews"
import type ProductReviewModuleService from "../../../modules/product-reviews/service"

/**
 * POST /store/reviews
 * 
 * Submit a new product review.
 * Reviews start with status "pending" — owner must approve via Admin API.
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { product_id, author_name, rating, comment } = req.body as {
        product_id?: string
        author_name?: string
        rating?: number
        comment?: string
    }

    // Validate required fields
    if (!product_id || typeof product_id !== "string") {
        return res.status(400).json({ message: "product_id is required" })
    }
    if (!author_name || typeof author_name !== "string" || author_name.trim().length === 0) {
        return res.status(400).json({ message: "author_name is required" })
    }
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "rating must be a number between 1 and 5" })
    }

    const reviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE) as ProductReviewModuleService

    const review = await reviewService.createProductReviews({
        product_id,
        author_name: author_name.trim(),
        rating,
        comment: comment?.trim() || null,
        status: "pending",
    })

    res.status(201).json({ review })
}
