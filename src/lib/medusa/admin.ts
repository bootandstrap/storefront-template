/**
 * Medusa Admin API — Barrel Re-exports
 *
 * This file preserves backward compatibility for all existing imports.
 * Implementation has been decomposed into focused domain modules:
 *
 * - admin-core.ts       → Auth, JWT cache, base fetcher, scoping helpers
 * - admin-orders.ts     → Orders, customers, dashboard counts
 * - admin-products.ts   → Product CRUD, images, badges, variants
 * - admin-categories.ts → Category CRUD
 * - admin-operations.ts → Returns, shipping options, refunds
 */

// Core infrastructure
export {
    type TenantMedusaScope,
    type AdminListParams,
    type MedusaAdminResponse,
    normalizeAdminListParams,
    assertScope,
    resolveScope,
    buildScopedAdminHeaders,
    buildScopedAdminPath,
    adminFetch,
    uploadFiles,
} from './admin-core'

// Orders & Customers
export {
    type AdminOrder,
    type AdminOrderItem,
    type AdminOrderFull,
    type AdminCustomer,
    getProductCount,
    getCategoryCount,
    getOrdersThisMonth,
    getCustomerCount,
    getRecentOrders,
    getAdminOrders,
    getAdminOrderDetail,
    orderBelongsToScope,
    createOrderFulfillment,
    cancelAdminOrder,
    getAdminCustomers,
} from './admin-orders'

// Products
export {
    type AdminProductSummary,
    type AdminProductFull,
    type CreateProductInput,
    updateProductMetadata,
    getAdminProducts,
    getAdminProductsFull,
    getAdminProduct,
    createAdminProduct,
    updateAdminProduct,
    deleteAdminProduct,
    updateProductImages,
    deleteProductImage,
    updateVariantPrices,
    updateVariantInventory,
} from './admin-products'

// Categories
export {
    type AdminCategory,
    type CreateCategoryInput,
    getAdminCategories,
    createAdminCategory,
    updateAdminCategory,
    deleteAdminCategory,
} from './admin-categories'

// Operations (Returns, Shipping, Refunds)
export {
    type AdminReturn,
    type AdminShippingOption,
    getAdminReturns,
    receiveAdminReturn,
    cancelAdminReturn,
    getAdminShippingOptions,
    updateAdminShippingOption,
    createAdminRefund,
} from './admin-operations'
