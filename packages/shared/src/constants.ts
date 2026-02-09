// ============================================
// Shared Constants
// ============================================

/** Default region for Medusa */
export const DEFAULT_REGION = "es";

/** Medusa backend URL */
export const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

/** Order status display labels (Spanish) */
export const ORDER_STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente",
    pending_whatsapp: "Pendiente (WhatsApp)",
    confirmed: "Confirmado",
    processing: "En preparación",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
};

/** WhatsApp message template */
export const WHATSAPP_BASE_URL = "https://wa.me";

/** Max items per page in catalog */
export const CATALOG_PAGE_SIZE = 24;

/** Max file size for product images (5 MB) */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/** Accepted image MIME types */
export const ACCEPTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
];
