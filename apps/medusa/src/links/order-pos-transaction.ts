/**
 * Link: Medusa Order ↔ POS Transaction
 *
 * Establishes a relationship between Medusa's native Order entity
 * and our custom POS Transaction. This enables:
 *   - Identifying which orders came from POS vs online
 *   - Linking POS receipt data to order fulfillment
 *   - Revenue reporting segmented by channel (POS/Online)
 *
 * Not all orders have POS transactions — only those created via the POS terminal.
 */
import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import PosModule from "../modules/pos"

export default defineLink(
    OrderModule.linkable.order,
    PosModule.linkable.posTransaction,
)
