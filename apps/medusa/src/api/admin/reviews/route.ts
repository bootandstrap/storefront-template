import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-reviews"
import type ProductReviewModuleService from "../../../modules/product-reviews/service"

type ReviewStatus = "pending" | "approved" | "rejected"

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
