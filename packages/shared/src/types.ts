// ============================================
// Domain Types — Shared across Storefront & Backend
// ============================================

/** Checkout mode variants */
export type CheckoutMode = "stripe" | "whatsapp";

/** Order statuses reflecting the combined Stripe + WhatsApp flows */
export type OrderStatus =
    | "pending"
    | "pending_whatsapp"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";

/** Payment statuses */
export type PaymentStatus =
    | "pending"
    | "authorized"
    | "captured"
    | "refunded"
    | "failed";

/** User roles — Supabase Auth profiles */
export type UserRole = "customer" | "owner" | "super_admin";

/** CMS Page status */
export type PageStatus = "draft" | "published" | "archived";

/** Analytics event types */
export type AnalyticsEventType =
    | "page_view"
    | "view_product"
    | "add_to_cart"
    | "remove_from_cart"
    | "checkout_start"
    | "checkout_complete"
    | "whatsapp_checkout";

/** WhatsApp message template data */
export interface WhatsAppOrderData {
    customerName: string;
    customerPhone: string;
    items: Array<{
        name: string;
        variant?: string;
        quantity: number;
        unitPrice: number;
    }>;
    subtotal: number;
    discount?: number;
    total: number;
    notes?: string;
}

/** Store configuration (from Supabase `config` table) */
export interface StoreConfig {
    businessName: string;
    whatsappNumber: string;
    defaultCountryPrefix: string;
    enableOnlinePayments: boolean;
    enableWhatsappCheckout: boolean;
    accentColor: string;
    primaryColor: string;
    secondaryColor: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroImage?: string;
    footerDescription?: string;
}
