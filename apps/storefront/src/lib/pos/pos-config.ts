/**
 * POS System — Configuration & Types
 */

// ---------------------------------------------------------------------------
// Cart types
// ---------------------------------------------------------------------------

export interface POSCartItem {
    id: string                // variant_id
    product_id: string
    title: string
    variant_title: string | null
    thumbnail: string | null
    sku: string | null
    unit_price: number        // in minor units (cents)
    quantity: number
    currency_code: string
}

export interface POSDiscount {
    type: 'percentage' | 'fixed'
    value: number             // percentage (0-100) or fixed amount in minor units
}

export interface POSSale {
    items: POSCartItem[]
    discount: POSDiscount | null
    customer_id: string | null
    customer_name: string | null
    payment_method: PaymentMethod
    subtotal: number
    discount_amount: number
    tax_amount: number
    total: number
    currency_code: string
    created_at: string
    order_id: string | null
    draft_order_id: string | null
}

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------

export type PaymentMethod = 'cash' | 'card_terminal' | 'twint' | 'manual_card'

export const PAYMENT_METHODS: {
    key: PaymentMethod
    label_key: string
    /** Minimum POS tier required: 'basic' | 'pro' | 'enterprise' */
    minTier: 'basic' | 'pro' | 'enterprise'
}[] = [
    { key: 'cash', label_key: 'panel.pos.cash', minTier: 'basic' },
    { key: 'card_terminal', label_key: 'panel.pos.cardTerminal', minTier: 'pro' },
    { key: 'twint', label_key: 'panel.pos.twint', minTier: 'enterprise' },
    { key: 'manual_card', label_key: 'panel.pos.manualCard', minTier: 'basic' },
]

// ---------------------------------------------------------------------------
// Terminal connection state
// ---------------------------------------------------------------------------

export type TerminalConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// ---------------------------------------------------------------------------
// Payment processing state machine
// ---------------------------------------------------------------------------

export type PaymentProcessingState =
    | { status: 'idle' }
    | { status: 'creating_intent' }
    | { status: 'awaiting_card'; reader_display: string }
    | { status: 'awaiting_twint_scan'; qr_url: string; expires_at: string; payment_intent_id: string }
    | { status: 'processing' }
    | { status: 'succeeded'; payment_intent_id: string }
    | { status: 'failed'; error: string }
    | { status: 'cancelled' }

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

export const POS_SHORTCUTS = {
    SEARCH: 'F2',
    HISTORY: 'F3',
    QUICK_SALE: 'F4',
    DASHBOARD: 'F5',
    CLEAR_CART: 'Escape',
    PAY: 'Enter',
    KIOSK: 'F11',
} as const

// ---------------------------------------------------------------------------
// Sales history types (Sprint 4)
// ---------------------------------------------------------------------------

export interface POSSaleRecord {
    id: string                   // Medusa draft_order_id or order_id
    order_display_id?: string    // Human-readable order #
    items: { title: string; quantity: number; unit_price: number }[]
    item_count: number
    subtotal: number
    discount_amount: number
    total: number
    currency_code: string
    payment_method: PaymentMethod
    customer_name: string | null
    created_at: string           // ISO
    status: 'completed' | 'pending' | 'refunded'
    shift_id?: string
}

export interface POSSalesFilter {
    from?: string                // ISO date
    to?: string                  // ISO date
    payment_method?: PaymentMethod
    search?: string              // order# or customer
    limit?: number
    offset?: number
}

export interface DailyStats {
    date: string                 // YYYY-MM-DD
    totalSales: number
    totalRevenue: number
    avgTicket: number
    byPaymentMethod: Partial<Record<PaymentMethod, { count: number; total: number }>>
    byHour: { hour: number; count: number; total: number }[]
    topProducts: { title: string; quantity: number; revenue: number }[]
}

// ---------------------------------------------------------------------------
// Shift management types (Sprint 4)
// ---------------------------------------------------------------------------

export interface POSShift {
    id: string                   // UUID
    opened_at: string            // ISO
    closed_at?: string
    opening_cash: number         // minor units
    closing_cash?: number
    expected_cash?: number       // sum of cash sales
    cash_difference?: number     // closing - expected
    total_sales: number
    total_revenue: number
    status: 'open' | 'closed'
}

export type POSPanelView = 'history' | 'dashboard' | 'shift' | 'customer' | 'refund' | 'parkedSales' | 'printerSettings' | null

// ---------------------------------------------------------------------------
// Customer management types (Sprint 5)
// ---------------------------------------------------------------------------

export interface POSCustomerResult {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    phone: string | null
    orders_count: number
}

// ---------------------------------------------------------------------------
// Refund types (Sprint 5)
// ---------------------------------------------------------------------------

export interface POSRefund {
    id: string
    order_id: string
    items: { title: string; quantity: number; amount: number }[]
    reason: RefundReason
    reason_note?: string
    total_refund: number
    currency_code: string
    created_at: string
    status: 'completed' | 'pending' | 'failed'
}

export type RefundReason = 'damaged' | 'wrong_item' | 'dissatisfied' | 'other'

// ---------------------------------------------------------------------------
// Cart reducer
// ---------------------------------------------------------------------------

export type CartAction =
    | { type: 'ADD_ITEM'; item: POSCartItem }
    | { type: 'REMOVE_ITEM'; variant_id: string }
    | { type: 'UPDATE_QTY'; variant_id: string; quantity: number }
    | { type: 'SET_DISCOUNT'; discount: POSDiscount | null }
    | { type: 'SET_CUSTOMER'; customer_id: string | null; customer_name: string | null }
    | { type: 'SET_PAYMENT'; method: PaymentMethod }
    | { type: 'RESTORE_CART'; cart: CartState }
    | { type: 'CLEAR' }

export interface CartState {
    items: POSCartItem[]
    discount: POSDiscount | null
    customer_id: string | null
    customer_name: string | null
    payment_method: PaymentMethod
}

export const INITIAL_CART: CartState = {
    items: [],
    discount: null,
    customer_id: null,
    customer_name: null,
    payment_method: 'cash',
}

export function cartReducer(state: CartState, action: CartAction): CartState {
    switch (action.type) {
        case 'ADD_ITEM': {
            const existing = state.items.find(i => i.id === action.item.id)
            if (existing) {
                return {
                    ...state,
                    items: state.items.map(i =>
                        i.id === action.item.id
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    ),
                }
            }
            return { ...state, items: [...state.items, { ...action.item, quantity: 1 }] }
        }
        case 'REMOVE_ITEM':
            return { ...state, items: state.items.filter(i => i.id !== action.variant_id) }
        case 'UPDATE_QTY': {
            if (action.quantity <= 0) {
                return { ...state, items: state.items.filter(i => i.id !== action.variant_id) }
            }
            return {
                ...state,
                items: state.items.map(i =>
                    i.id === action.variant_id ? { ...i, quantity: action.quantity } : i
                ),
            }
        }
        case 'SET_DISCOUNT':
            return { ...state, discount: action.discount }
        case 'SET_CUSTOMER':
            return { ...state, customer_id: action.customer_id, customer_name: action.customer_name }
        case 'SET_PAYMENT':
            return { ...state, payment_method: action.method }
        case 'CLEAR':
            return INITIAL_CART
        case 'RESTORE_CART':
            return action.cart
        default:
            return state
    }
}

// ---------------------------------------------------------------------------
// Cart calculations
// ---------------------------------------------------------------------------

export function calculateCartTotals(state: CartState, taxRate = 0) {
    const subtotal = state.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

    let discountAmount = 0
    if (state.discount) {
        discountAmount = state.discount.type === 'percentage'
            ? Math.round(subtotal * state.discount.value / 100)
            : Math.min(state.discount.value, subtotal)
    }

    const taxableAmount = subtotal - discountAmount
    const taxAmount = Math.round(taxableAmount * taxRate / 100)
    const total = taxableAmount + taxAmount

    return { subtotal, discountAmount, taxAmount, total }
}
