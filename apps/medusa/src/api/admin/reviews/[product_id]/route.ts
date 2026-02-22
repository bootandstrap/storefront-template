import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-reviews"
import type ProductReviewModuleService from "../../../../modules/product-reviews/service"

/**
 * GET /admin/reviews/:product_id
 * 
 * List ALL reviews for a product (including pending/rejected).
 * Admin-only — for moderation in Owner Panel.
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { product_id } = req.params
    const status = (req.query.status as string) || undefined

    const reviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE) as ProductReviewModuleService

    const filters: Record<string, unknown> = { product_id }
    if (status) {
        filters.status = status
    }

    const reviews = await reviewService.listProductReviews(
        filters,
        {
            order: { created_at: "DESC" },
            take: 100,
        }
    )

    res.json({ reviews, count: reviews.length })
}
