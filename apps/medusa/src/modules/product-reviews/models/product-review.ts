import { model } from "@medusajs/framework/utils"

/**
 * ProductReview data model — stored in Medusa's PostgreSQL.
 * 
 * Each tenant runs their own Medusa instance, so reviews are
 * automatically tenant-scoped without needing a tenant_id column.
 * This avoids inflating the shared Supabase DB.
 */
const ProductReview = model.define("product_review", {
    id: model.id().primaryKey(),
    product_id: model.text(),
    author_name: model.text(),
    rating: model.number(),
    comment: model.text().nullable(),
    status: model.enum(["pending", "approved", "rejected"]).default("pending"),
})
    .indexes([
        {
            on: ["product_id"],
            where: "deleted_at IS NULL",
        },
    ])

export default ProductReview
