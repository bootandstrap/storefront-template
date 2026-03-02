import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-reviews"
import type ProductReviewModuleService from "../../../modules/product-reviews/service"

type ReviewStatus = "pending" | "approved" | "rejected"

/**
 * GET /admin/reviews
 * 
 * List ALL reviews across all products, with optional status filter.
 * Admin-only — for moderation in Owner Panel.
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const status = (req.query.status as string) || undefined

    const reviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE) as ProductReviewModuleService

    const filters: Record<string, unknown> = {}
    if (status && ["pending", "approved", "rejected"].includes(status)) {
        filters.status = status
    }

    const reviews = await reviewService.listProductReviews(
        filters,
        {
            order: { created_at: "DESC" },
            take: 200,
        }
    )

    // Calculate stats
    const stats = {
        total: reviews.length,
        pending: reviews.filter((r: any) => r.status === "pending").length,
        approved: reviews.filter((r: any) => r.status === "approved").length,
        rejected: reviews.filter((r: any) => r.status === "rejected").length,
    }

    res.json({ reviews, stats })
}

/**
 * PUT /admin/reviews
 * 
 * Update review status (approve/reject).
 * Admin-only — for moderation in Owner Panel.
 */
export async function PUT(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id, status } = req.body as {
        id?: string
        status?: string
    }

    if (!id || typeof id !== "string") {
        return res.status(400).json({ message: "id is required" })
    }
    if (!status || !["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ message: "status must be 'approved', 'rejected', or 'pending'" })
    }

    const reviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE) as ProductReviewModuleService

    const review = await reviewService.updateProductReviews({
        id,
        status: status as ReviewStatus,
    })

    res.json({ review })
}

/**
 * DELETE /admin/reviews
 * 
 * Delete a review permanently.
 * Admin-only.
 */
export async function DELETE(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.body as { id?: string }

    if (!id || typeof id !== "string") {
        return res.status(400).json({ message: "id is required" })
    }

    const reviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE) as ProductReviewModuleService

    await reviewService.deleteProductReviews([id])

    res.status(200).json({ deleted: true })
}
