import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-reviews"
import type ProductReviewModuleService from "../../../../modules/product-reviews/service"

/**
 * GET /store/reviews/:product_id
 * 
 * Returns approved reviews for a product.
 * Public — no auth required.
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { product_id } = req.params

    if (!product_id) {
        return res.status(400).json({ message: "product_id is required" })
    }

    const reviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE) as ProductReviewModuleService

    const reviews = await reviewService.listProductReviews(
        { product_id, status: "approved" },
        {
            order: { created_at: "DESC" },
            take: 50,
        }
    )

    // Calculate average rating
    const avgRating = reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0

    res.json({
        reviews,
        count: reviews.length,
        avg_rating: Math.round(avgRating * 10) / 10,
    })
}
