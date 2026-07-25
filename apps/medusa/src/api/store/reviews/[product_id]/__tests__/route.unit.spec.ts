import { GET } from "../route"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-reviews"

describe("GET /store/reviews/[product_id]", () => {
  it("returns 400 when product_id is missing", async () => {
    const json = jest.fn()
    const status = jest.fn(() => ({ json }))
    const req = {
      params: {},
      scope: { resolve: jest.fn() },
    } as any
    const res = { status, json: jest.fn() } as any

    await GET(req, res)

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({ message: "product_id is required" })
    expect(req.scope.resolve).not.toHaveBeenCalled()
  })

  it("returns approved reviews ordered newest-first with rounded average rating", async () => {
    const reviews = [
      { id: "review_1", rating: 5 },
      { id: "review_2", rating: 4 },
      { id: "review_3", rating: 4 },
    ]
    const listProductReviews = jest.fn(async () => reviews)
    const req = {
      params: { product_id: "prod_123" },
      scope: {
        resolve: jest.fn(() => ({ listProductReviews })),
      },
    } as any
    const res = { json: jest.fn(), status: jest.fn() } as any

    await GET(req, res)

    expect(req.scope.resolve).toHaveBeenCalledWith(PRODUCT_REVIEW_MODULE)
    expect(listProductReviews).toHaveBeenCalledWith(
      { product_id: "prod_123", status: "approved" },
      { order: { created_at: "DESC" }, take: 50 }
    )
    expect(res.json).toHaveBeenCalledWith({
      reviews,
      count: 3,
      avg_rating: 4.3,
    })
  })
})
