'use client'

/**
 * POSClient — Point of Sale main client component (SOTA rewrite)
 *
 * Holistic integration model:
 * - Capabilities derived from real `enable_pos_*` flags + `max_pos_payment_methods`
 * - Payment methods filtered by plan limits (not hardcoded with locks)
 * - Grey-out pattern for unavailable features (disabled + tooltip, not overlay)
 * - History derived from enable_pos_shifts, Dashboard from enable_pos_thermal_printer
 */

import { useReducer, useCallback, useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Maximize, Minimize, Wifi, WifiOff, CloudUpload, Receipt, BarChart3, Clock, User, RotateCcw, PauseCircle, ShoppingCart, X as XIcon, LogOut, Printer, Heart, FileText, Split } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    cartReducer,
    INITIAL_CART,
    calculateCartTotals,
    safeVariantPrice,
    type POSCartItem,
    type POSSale,
    type PaymentMethod,
    type POSDiscount,
    type PaymentProcessingState,
    type POSPanelView,
    type POSShift,
    type POSRefund,
    type POSSaleRecord,
} from '@/lib/pos/pos-config'
import type { FeatureFlags, PlanLimits } from '@/lib/config'
import { charge } from '@/lib/pos/payments/payment-adapter'
import { usePOSSounds, triggerHaptic } from '@/lib/pos/usePOSSounds'
import { useBarcodeScanner } from '@/lib/pos/useBarcodeScanner'
import { useOfflineSync } from '@/lib/pos/offline/useOfflineSync'
import { usePrinterConnection, type BusinessInfo } from '@/lib/pos/usePrinterConnection'
import { usePOSSync, type POSSyncEvent } from '@/lib/pos/usePOSSync'
import { getEnabledPOSPaymentMethods, isPOSHistoryAvailable, isPOSDashboardAvailable, formatPOSCurrency } from '@/lib/pos/pos-utils'
import { getUpsellTooltip, posLabel } from '@/lib/pos/pos-i18n'
import { PageEntrance } from '@/components/panel/PanelAnimations'
import { createPOSSale, searchPOSProducts } from './actions'
import {
    POSProductGrid, POSCart, POSPaymentOverlay, POSOfflineBanner,
    POSToolbar, getParkedSales,
    POSReceipt, POSSalesHistory, POSDashboard, POSShiftPanel,
    POSCustomerModal, POSRefundModal, POSRefundReceipt,
    POSParkedSales, POSPrinterSettings, POSSplitPayment,
    POSLoyaltyCard, POSEndOfDayReport, POSSettingsDrawer,
} from './pos-components'

// ─── Props ──────────────────────────────────────────────────────────────────

interface POSClientProps {
    products: any[]
    categories: { id: string; name: string }[]
    defaultCurrency: string
    businessName: string
    labels: Record<string, string>
    featureFlags: FeatureFlags
    planLimits: PlanLimits
    /** POS-specific config values from governance config table */
    posConfig?: Record<string, unknown>
    /** Tenant ID for multi-device sync */
    tenantId?: string
    /** Stock management mode from tenant config: 'always_in_stock' | 'managed' */
    stockMode?: 'always_in_stock' | 'managed'
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function POSClient({
    products,
    categories,
    defaultCurrency,
    businessName,
    labels,
    featureFlags,
    planLimits,
    posConfig = {},
    tenantId,
    stockMode = 'always_in_stock',
}: POSClientProps) {
    // ── State ──
    const [cart, dispatch] = useReducer(cartReducer, INITIAL_CART)
    const [processing, setProcessing] = useState(false)
    const [paymentState, setPaymentState] = useState<PaymentProcessingState>({ status: 'idle' })
    const [completedSale, setCompletedSale] = useState<POSSale | null>(null)
    const [panelView, setPanelView] = useState<POSPanelView>(null)
    const [isKiosk, setIsKiosk] = useState(false)
    const [currentShift, setCurrentShift] = useState<POSShift | null>(null)
    const [refundOrderId, setRefundOrderId] = useState<string | null>(null)
    const [refundReceipt, setRefundReceipt] = useState<POSRefund | null>(null)
    const [serverProducts, setServerProducts] = useState<any[]>([])
    const [parkedSalesCount, setParkedSalesCount] = useState(0)
    const [mobileCartOpen, setMobileCartOpen] = useState(false)
    const [shiftHistory, setShiftHistory] = useState<POSShift[]>([])
    const [couponCode, setCouponCode] = useState<string | undefined>(undefined)
    const [syncNotification, setSyncNotification] = useState<string | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const router = useRouter()

    // ── Sync parked count ──
    useEffect(() => {
        const updateCount = () => setParkedSalesCount(getParkedSales().length)
        updateCount()
        window.addEventListener('storage', updateCount)
        return () => window.removeEventListener('storage', updateCount)
    }, [])

    // ── Hooks ──
    const { playBeep, playTick, playCashRegister, playError } = usePOSSounds()
    const { isOnline, syncStatus, pendingCount, lastSyncTime, offlineInventoryOffsets, syncNow, queueOfflineSale, cachedProducts } = useOfflineSync()

    // ── Thermal printer ──
    const { status: printerStatus, printReceipt: thermalPrintReceipt, printRefund: thermalPrintRefund } = usePrinterConnection()

    // ── Multi-device sync ──
    const handlePOSSyncEvent = useCallback((event: POSSyncEvent) => {
        switch (event.type) {
            case 'sale_completed':
                setSyncNotification(`Sale completed on another device`)
                setTimeout(() => setSyncNotification(null), 3000)
                break
            case 'shift_changed':
                setSyncNotification(`Shift ${event.payload?.action || 'updated'} on another device`)
                setTimeout(() => setSyncNotification(null), 3000)
                break
            default:
                break
        }
    }, [])

    const { connected: syncConnected, deviceCount, broadcast: syncBroadcast } = usePOSSync({
        tenantId,
        enabled: featureFlags.enable_pos === true,
        onEvent: handlePOSSyncEvent,
    })

    // ── Derived capabilities ──
    const enabledPaymentMethods = useMemo(
        () => getEnabledPOSPaymentMethods(planLimits),
        [planLimits],
    )
    const canAccessHistory = useMemo(() => isPOSHistoryAvailable(featureFlags as unknown as Record<string, boolean>), [featureFlags])
    const canAccessDashboard = useMemo(() => isPOSDashboardAvailable(featureFlags as unknown as Record<string, boolean>), [featureFlags])
    const canAccessShifts = featureFlags.enable_pos_shifts === true
    const canKiosk = featureFlags.enable_pos_kiosk === true
    const canShortcuts = featureFlags.enable_pos_keyboard_shortcuts === true
    const canOffline = featureFlags.enable_pos_offline_cart === true
    const canThermalPrint = featureFlags.enable_pos_thermal_printer === true
    const canLineDiscounts = featureFlags.enable_pos_line_discounts === true
    const canCustomerSearch = featureFlags.enable_pos_customer_search === true
    const canSplitPayment = canAccessDashboard  // Enterprise gated
    const canLoyalty = canAccessShifts           // Pro+ gated
    const canEndOfDay = canAccessDashboard       // Enterprise gated

    // ── Thermal printer derived state (after capabilities) ──
    const businessInfo: BusinessInfo = useMemo(() => ({
        name: (posConfig.receipt_business_name as string) || businessName,
        address: (posConfig.receipt_address as string) || undefined,
        nif: (posConfig.receipt_nif as string) || undefined,
        phone: (posConfig.receipt_phone as string) || undefined,
        email: (posConfig.receipt_email as string) || undefined,
    }), [posConfig, businessName])

    const shouldAutoPrint = useCallback(() => {
        if (printerStatus !== 'connected') return false
        if (!canThermalPrint) return false
        if (typeof window === 'undefined') return false
        return localStorage.getItem('pos-auto-print') === 'true'
    }, [printerStatus, canThermalPrint])

    // ── Format helper ──
    const formatCurrency = useCallback(
        (amount: number) => formatPOSCurrency(amount, defaultCurrency),
        [defaultCurrency],
    )

    // ── Merged products (local + server search) + Offline Inventory Adjustments ──
    const adjustedProducts = useMemo(() => {
        let baseProducts = products
        if (serverProducts.length > 0) {
            const localIds = new Set(products.map((p: any) => p.id))
            const extras = serverProducts.filter((p: any) => !localIds.has(p.id))
            baseProducts = [...products, ...extras]
        }

        if (Object.keys(offlineInventoryOffsets).length === 0) return baseProducts

        return baseProducts.map((p: any) => {
            if (!p.variants || p.variants.length === 0) return p
            const hasOffset = p.variants.some((v: any) => offlineInventoryOffsets[v.id])
            if (!hasOffset) return p

            return {
                ...p,
                variants: p.variants.map((v: any) => {
                    const offset = offlineInventoryOffsets[v.id]
                    if (!offset) return v
                    return {
                        ...v,
                        inventory_quantity: Math.max(0, (v.inventory_quantity ?? 0) - offset),
                    }
                })
            }
        })
    }, [products, serverProducts, offlineInventoryOffsets])

    // ── Cart totals ──
    const totals = useMemo(() => calculateCartTotals(cart), [cart])

    // ── Cart persistence ──
    useEffect(() => {
        // Add pos-fullscreen class to hide sidebar
        document.body.classList.add('pos-fullscreen')
        return () => {
            document.body.classList.remove('pos-fullscreen')
        }
    }, [])

    useEffect(() => {
        const saved = localStorage.getItem('pos_cart')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (parsed.items?.length > 0) {
                    // Build a set of valid variant IDs from current server products
                    const validVariantIds = new Set(
                        products.flatMap((p: any) => (p.variants ?? []).map((v: any) => v.id))
                    )
                    // Filter out stale items (variants that no longer exist in Medusa)
                    const validItems = parsed.items
                        .filter((i: any) => validVariantIds.has(i.id))
                        .map((i: any) => ({
                            ...i,
                            unit_price: typeof i.unit_price === 'number' && !isNaN(i.unit_price) ? i.unit_price : 0,
                        }))

                    const droppedCount = parsed.items.length - validItems.length
                    if (droppedCount > 0) {
                        console.warn(`[POS] Dropped ${droppedCount} stale cart item(s) — variants no longer exist`)
                    }

                    if (validItems.length > 0) {
                        dispatch({ type: 'RESTORE_CART', cart: { ...parsed, items: validItems } })
                    } else {
                        // All items were stale — clear localStorage
                        localStorage.removeItem('pos_cart')
                    }
                }
            } catch { /* ignore corrupt data */ }
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (cart.items.length > 0) {
            localStorage.setItem('pos_cart', JSON.stringify(cart))
        } else {
            localStorage.removeItem('pos_cart')
        }
    }, [cart])

    // ── Keyboard shortcuts (gated by feature flag) ──
    useEffect(() => {
        if (!canShortcuts) return

        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            switch (e.key) {
                case 'F2':
                    e.preventDefault()
                    document.querySelector<HTMLInputElement>('[data-pos-search]')?.focus()
                    break
                case 'F3':
                    e.preventDefault()
                    if (canAccessHistory) setPanelView(v => v === 'history' ? null : 'history')
                    break
                case 'F4':
                    e.preventDefault()
                    // Quick sale — reserved for future
                    break
                case 'F5':
                    e.preventDefault()
                    if (canAccessDashboard) setPanelView(v => v === 'dashboard' ? null : 'dashboard')
                    break
                case 'F11':
                    e.preventDefault()
                    if (canKiosk) toggleKiosk()
                    break
            }
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [canShortcuts, canAccessHistory, canAccessDashboard, canKiosk, mobileCartOpen])

    // ── Cart operations ──
    const handleAddToCart = useCallback((item: POSCartItem) => {
        dispatch({ type: 'ADD_ITEM', item })
        playBeep()
        triggerHaptic()
        syncBroadcast('cart_updated', { action: 'add', itemTitle: item.title })
    }, [playBeep, syncBroadcast])

    // ── Barcode scanner ──
    const handleBarcodeScan = useCallback(async (barcode: string) => {
        // Try local products first
        const localMatch = adjustedProducts.find((p: any) =>
            p.variants?.some((v: any) => v.sku === barcode || v.barcode === barcode),
        )

        if (localMatch) {
            const variant = localMatch.variants.find((v: any) => v.sku === barcode || v.barcode === barcode)
            if (variant) {
                const priceInfo = safeVariantPrice(variant, defaultCurrency)
                if (!priceInfo.has_price) {
                    playError()
                    return
                }
                handleAddToCart({
                    id: variant.id,
                    product_id: localMatch.id,
                    title: localMatch.title,
                    variant_title: localMatch.variants.length > 1 ? variant.title : null,
                    thumbnail: localMatch.thumbnail,
                    sku: variant.sku || null,
                    unit_price: priceInfo.unit_price,
                    quantity: 1,
                    currency_code: priceInfo.currency_code,
                })
            }
        } else if (isOnline) {
            // Search server
            try {
                const { products: results } = await searchPOSProducts(barcode)
                if (results.length > 0) {
                    setServerProducts(prev => [...prev, ...results])
                    const product = results[0]
                    const variant = product.variants?.[0]
                    if (variant) {
                        const priceInfo = safeVariantPrice(variant, defaultCurrency)
                        if (!priceInfo.has_price) {
                            playError()
                            return
                        }
                        handleAddToCart({
                            id: variant.id,
                            product_id: product.id,
                            title: product.title,
                            variant_title: product.variants.length > 1 ? variant.title : null,
                            thumbnail: product.thumbnail,
                            sku: variant.sku || null,
                            unit_price: priceInfo.unit_price,
                            quantity: 1,
                            currency_code: priceInfo.currency_code,
                        })
                    }
                } else {
                    playError()
                }
            } catch {
                playError()
            }
        } else {
            playError()
        }
    }, [adjustedProducts, handleAddToCart, defaultCurrency, isOnline, playError])

    useBarcodeScanner({ onScan: handleBarcodeScan })

    const handleUpdateQty = useCallback((variantId: string, qty: number) => {
        dispatch({ type: 'UPDATE_QTY', variant_id: variantId, quantity: qty })
        playTick()
    }, [playTick])

    const handleRemoveItem = useCallback((variantId: string) => {
        dispatch({ type: 'REMOVE_ITEM', variant_id: variantId })
        syncBroadcast('cart_updated', { action: 'remove', variantId })
    }, [syncBroadcast])

    const handleSetDiscount = useCallback((discount: POSDiscount | null) => {
        dispatch({ type: 'SET_DISCOUNT', discount })
    }, [])

    const handleSetPayment = useCallback((method: PaymentMethod) => {
        dispatch({ type: 'SET_PAYMENT', method })
        triggerHaptic(30)
    }, [])

    const handleSetCustomer = useCallback(() => {
        setPanelView('customer')
    }, [])

    const handleCustomerSelect = useCallback((customer: { id: string; name: string } | null) => {
        if (customer) {
            dispatch({ type: 'SET_CUSTOMER', customer_id: customer.id, customer_name: customer.name })
        } else {
            dispatch({ type: 'SET_CUSTOMER', customer_id: null, customer_name: null })
        }
        setPanelView(null)
    }, [])

    const handleRefundFromHistory = useCallback((orderId: string) => {
        setRefundOrderId(orderId)
        setPanelView('refund')
    }, [])

    const handleRefundComplete = useCallback((refund: POSRefund) => {
        setRefundOrderId(null)
        setPanelView(null)
        setRefundReceipt(refund)

        // Auto-print refund receipt
        if (shouldAutoPrint()) {
            const pw = (typeof window !== 'undefined' ? localStorage.getItem('pos-paper-width') : '80mm') as '80mm' | '58mm' || '80mm'
            thermalPrintRefund(refund, businessInfo, {
                mode: 'thermal',
                paperWidth: pw,
                labels,
                receiptConfig: {
                    receiptHeader: posConfig.receipt_header as string | undefined,
                    receiptFooter: posConfig.receipt_footer as string | undefined,
                },
            }).catch(() => { /* print error handled by engine events */ })
        }
    }, [shouldAutoPrint, thermalPrintRefund, businessInfo, labels, posConfig])

    // ── Charge ──
    const completeSale = useCallback(async (paymentIntentId?: string) => {
        const result = await createPOSSale({
            items: cart.items.map(i => ({
                variant_id: i.id,
                quantity: i.quantity,
                unit_price: i.unit_price,
            })),
            payment_method: cart.payment_method,
            customer_id: cart.customer_id || undefined,
            discount_amount: totals.discountAmount,
            note: paymentIntentId ? `stripe_pi:${paymentIntentId}` : undefined,
        })

        setProcessing(false)

        if (result.success) {
            playCashRegister()
            triggerHaptic(100)
            setPaymentState({ status: 'succeeded', payment_intent_id: paymentIntentId || '' })
            syncBroadcast('sale_completed', { total: totals.total, itemCount: cart.items.length })

            const sale: POSSale = {
                items: cart.items,
                discount: cart.discount,
                customer_id: cart.customer_id,
                customer_name: cart.customer_name,
                payment_method: cart.payment_method,
                subtotal: totals.subtotal,
                discount_amount: totals.discountAmount,
                tax_amount: totals.taxAmount,
                total: totals.total,
                currency_code: cart.items[0]?.currency_code || defaultCurrency,
                created_at: new Date().toISOString(),
                order_id: result.order_id || null,
                draft_order_id: result.draft_order_id || null,
            }

            // Auto-print receipt if thermal printer connected + user has auto-print enabled
            if (shouldAutoPrint()) {
                const pw = (typeof window !== 'undefined' ? localStorage.getItem('pos-paper-width') : '80mm') as '80mm' | '58mm' || '80mm'
                thermalPrintReceipt(sale, businessInfo, {
                    mode: 'thermal',
                    paperWidth: pw,
                    openCashDrawer: sale.payment_method === 'cash',
                    labels,
                    receiptConfig: {
                        receiptHeader: posConfig.receipt_header as string | undefined,
                        receiptFooter: posConfig.receipt_footer as string | undefined,
                    },
                }).catch(() => { /* print error handled by engine events */ })
            }

            setTimeout(() => {
                setCompletedSale(sale)
                setPaymentState({ status: 'idle' })
                localStorage.removeItem('pos_cart')
                setCouponCode(undefined)

                // Record co-occurrence for "Frequently bought together" recommendations
                if (cart.items.length >= 2) {
                    import('./POSRecommendations').then(mod => {
                        mod.recordCoOccurrence(cart.items.map(i => ({ title: i.title })))
                    }).catch(() => { /* non-critical */ })
                }
            }, 1500)
        } else {
            playError()
            // Auto-clear cart if items are stale (variants deleted from Medusa)
            if (result.error?.startsWith('STALE_CART')) {
                dispatch({ type: 'CLEAR' })
                localStorage.removeItem('pos_cart')
                setPaymentState({ status: 'failed', error: posLabel('panel.pos.staleCart', labels) || 'Items in cart are outdated. Cart has been cleared. Please add items again.' })
            } else {
                setPaymentState({ status: 'failed', error: result.error || posLabel('panel.pos.paymentFailed', labels) })
            }
        }
    }, [cart, totals, defaultCurrency, playCashRegister, playError, labels, shouldAutoPrint, thermalPrintReceipt, businessInfo, posConfig])

    const handleCharge = useCallback(async () => {
        if (cart.items.length === 0 || processing) return
        setProcessing(true)

        const method = cart.payment_method

        // ── Offline fallback ──
        if (!isOnline) {
            if (method !== 'cash' && method !== 'manual_card') {
                setPaymentState({ status: 'failed', error: posLabel('panel.pos.offlineNoCard', labels) })
                setProcessing(false)
                return
            }

            // Only queue offline if feature is enabled
            if (!canOffline) {
                setPaymentState({ status: 'failed', error: 'Offline mode not available' })
                setProcessing(false)
                return
            }

            try {
                await queueOfflineSale({
                    items: cart.items.map(i => ({
                        variant_id: i.id,
                        quantity: i.quantity,
                        unit_price: i.unit_price,
                    })),
                    payment_method: method,
                    customer_id: cart.customer_id || undefined,
                    customer_name: cart.customer_name || undefined,
                    discount_amount: totals.discountAmount,
                    created_at: new Date().toISOString(),
                })

                playCashRegister()
                triggerHaptic(100)

                const sale: POSSale = {
                    items: cart.items,
                    discount: cart.discount,
                    customer_id: cart.customer_id,
                    customer_name: cart.customer_name,
                    payment_method: cart.payment_method,
                    subtotal: totals.subtotal,
                    discount_amount: totals.discountAmount,
                    tax_amount: totals.taxAmount,
                    total: totals.total,
                    currency_code: cart.items[0]?.currency_code || defaultCurrency,
                    created_at: new Date().toISOString(),
                    order_id: null,
                    draft_order_id: null,
                }
                setCompletedSale(sale)
                localStorage.removeItem('pos_cart')
            } catch {
                playError()
                setPaymentState({ status: 'failed', error: 'Failed to save sale offline' })
            }

            setProcessing(false)
            return
        }

        // Cash / manual_card: no payment processing
        if (method === 'cash' || method === 'manual_card') {
            await completeSale()
            return
        }

        // Card Terminal or Twint: use payment adapter
        setPaymentState({ status: 'creating_intent' })

        const result = await charge({
            amount: totals.total,
            currency: cart.items[0]?.currency_code || defaultCurrency,
            method,
            metadata: {
                source: 'pos',
                customer_id: cart.customer_id || '',
            },
        })

        if (result.success) {
            await completeSale(result.payment_intent_id)
            return
        }

        if (result.requires_action === 'present_card') {
            setPaymentState({
                status: 'awaiting_card',
                reader_display: result.action_data?.reader_display || '',
            })
            startTerminalPolling(result.action_data?.payment_intent_id)
        } else if (result.requires_action === 'scan_qr') {
            setPaymentState({
                status: 'awaiting_twint_scan',
                qr_url: result.action_data?.qr_url || '',
                expires_at: result.action_data?.expires_at || '',
                payment_intent_id: result.action_data?.payment_intent_id || '',
            })
            startTwintPolling(result.action_data?.payment_intent_id || '')
        } else {
            setPaymentState({ status: 'failed', error: result.error || posLabel('panel.pos.paymentFailed', labels) })
            setProcessing(false)
        }
    }, [cart, processing, totals, defaultCurrency, completeSale, canOffline, isOnline, labels])

    // ── Terminal polling ──
    const startTerminalPolling = useCallback((piId?: string) => {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = setInterval(async () => {
            try {
                const { pollTwintPaymentAction } = await import('./actions')
                const status = await pollTwintPaymentAction(piId || '')

                if (status.status === 'succeeded') {
                    if (pollRef.current) clearInterval(pollRef.current)
                    setPaymentState({ status: 'processing' })
                    await completeSale(piId)
                } else if (status.status === 'failed') {
                    if (pollRef.current) clearInterval(pollRef.current)
                    setPaymentState({ status: 'failed', error: status.error || 'Payment failed on reader' })
                    setProcessing(false)
                }
            } catch { /* keep polling */ }
        }, 2000)
    }, [completeSale])

    // ── Twint polling ──
    const startTwintPolling = useCallback((piId: string) => {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = setInterval(async () => {
            try {
                const { pollTwintPaymentAction } = await import('./actions')
                const status = await pollTwintPaymentAction(piId)

                if (status.status === 'succeeded') {
                    if (pollRef.current) clearInterval(pollRef.current)
                    setPaymentState({ status: 'processing' })
                    await completeSale(piId)
                } else if (status.status === 'canceled' || status.status === 'failed') {
                    if (pollRef.current) clearInterval(pollRef.current)
                    setPaymentState({ status: 'failed', error: status.error || posLabel('panel.pos.paymentCancelled', labels) })
                    setProcessing(false)
                }
            } catch { /* keep polling */ }
        }, 2000)
    }, [completeSale, labels])

    // ── Cancel payment ──
    const handleCancelPayment = useCallback(async () => {
        if (pollRef.current) clearInterval(pollRef.current)

        if (paymentState.status === 'awaiting_twint_scan') {
            const { cancelTwintPaymentAction } = await import('./actions')
            await cancelTwintPaymentAction(paymentState.payment_intent_id)
        }

        setPaymentState({ status: 'cancelled' })
        setProcessing(false)
        setTimeout(() => setPaymentState({ status: 'idle' }), 2000)
    }, [paymentState])

    // ── Universal Escape — always active, cascading close ──
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            e.preventDefault()
            // Cascade: innermost modal first → outermost
            if (completedSale) { setCompletedSale(null); return }
            if (refundReceipt) { setRefundReceipt(null); return }
            if (paymentState.status !== 'idle') { handleCancelPayment(); return }
            if (refundOrderId) { setRefundOrderId(null); return }
            if (panelView) { setPanelView(null); return }
            if (mobileCartOpen) { setMobileCartOpen(false); return }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [completedSale, refundReceipt, paymentState.status, refundOrderId, panelView, mobileCartOpen, handleCancelPayment])

    // ── Clean up polling on unmount ──
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current)
        }
    }, [])

    // ── Exit POS → Panel ──
    const handleExitPOS = useCallback(() => {
        if (cart.items.length > 0) {
            const msg = posLabel('panel.pos.confirmExit', labels) ||
                '¿Seguro que deseas salir del POS? Los artículos del carrito se guardarán.'
            if (!window.confirm(msg)) return
        }
        const lang = document.documentElement.lang || 'es'
        router.push(`/${lang}/panel`)
    }, [cart.items.length, router, labels])

    // ── Kiosk mode (gated) ──
    const toggleKiosk = useCallback(() => {
        if (!canKiosk) return
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.()
            setIsKiosk(true)
        } else {
            document.exitFullscreen?.()
            setIsKiosk(false)
        }
    }, [canKiosk])

    // NOTE: Print is now handled internally by POSReceipt via useReactToPrint

    // ── New sale ──
    const handleNewSale = useCallback(() => {
        setCompletedSale(null)
        dispatch({ type: 'CLEAR' })
    }, [])

    // ── Park / Resume ──
    const handleParkFromCart = useCallback(() => {
        setParkedSalesCount(prev => prev + 1)
    }, [])

    const handleResumeParked = useCallback((items: POSCartItem[]) => {
        dispatch({
            type: 'RESTORE_CART',
            cart: {
                items,
                discount: null,
                customer_id: null,
                customer_name: null,
                payment_method: 'cash',
            },
        })
        setPanelView(null)
        setParkedSalesCount(getParkedSales().length)
    }, [])

    // ── Load shift history for End-of-Day ──
    useEffect(() => {
        if (!canAccessShifts) return
        import('@/lib/pos/shifts/shift-manager').then(mod => {
            mod.getShiftHistory(20).then(setShiftHistory)
        }).catch(() => {})
    }, [canAccessShifts, currentShift])

    // ── Coupon handlers ──
    const handleCouponApply = useCallback((discount: POSDiscount, code: string) => {
        dispatch({ type: 'SET_DISCOUNT', discount })
        setCouponCode(code)
    }, [])

    const handleCouponRemove = useCallback(() => {
        dispatch({ type: 'SET_DISCOUNT', discount: null })
        setCouponCode(undefined)
    }, [])

    // ── Split payment handler ──
    const handleSplitPaymentConfirm = useCallback((entries: { method: PaymentMethod; amount: number }[]) => {
        // Use the first method as primary for the sale record
        if (entries.length > 0) {
            dispatch({ type: 'SET_PAYMENT', method: entries[0].method })
        }
        setPanelView(null)
        // Proceed with charge
        handleCharge()
    }, [handleCharge])

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════

    return (
        <PageEntrance className="h-full max-h-full flex flex-col overflow-hidden bg-sf-0 print:hidden">
            {/* ── POS Toolbar ── */}
            <POSToolbar
                labels={labels}
                isOnline={isOnline}
                pendingCount={pendingCount}
                lastSyncTime={lastSyncTime}
                currentShift={currentShift}
                panelView={panelView}
                setPanelView={(v: POSPanelView | null) => setPanelView(v as unknown as POSPanelView)}
                canAccessHistory={canAccessHistory}
                canAccessDashboard={canAccessDashboard}
                canAccessShifts={canAccessShifts}
                canShortcuts={canShortcuts}
                canKiosk={canKiosk}
                canThermalPrint={canThermalPrint}
                canLoyalty={canLoyalty}
                canEndOfDay={canEndOfDay}
                isKiosk={isKiosk}
                toggleKiosk={toggleKiosk}
                parkedSalesCount={parkedSalesCount}
                handleExitPOS={handleExitPOS}
            />

            {/* Offline banner (gated) */}
            {canOffline && (
                <POSOfflineBanner
                    isOnline={isOnline}
                    syncStatus={syncStatus}
                    pendingCount={pendingCount}
                    lastSyncTime={lastSyncTime}
                    onSyncNow={syncNow}
                    labels={labels}
                />
            )}

            {/* ── Main split panel (responsive: pos-grid handles 1-col mobile / 2-col desktop) ── */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
                <div className="h-full pos-grid">
                    {/* Product Grid — fills full width on mobile, ~62% on desktop */}
                    <div className="pos-products-panel border-r border-sf-2">
                        <POSProductGrid
                            products={isOnline ? adjustedProducts : cachedProducts}
                            stockMode={stockMode}
                            categories={categories}
                            defaultCurrency={defaultCurrency}
                            onAddToCart={handleAddToCart}
                            labels={labels}
                            onPriceSet={() => router.refresh()}
                        />
                    </div>

                    {/* Cart sidebar — DESKTOP ONLY (hidden on mobile) */}
                    <div className="hidden md:flex pos-cart-sidebar">
                        <POSCart
                            items={cart.items}
                            discount={cart.discount}
                            customerName={cart.customer_name}
                            paymentMethod={cart.payment_method}
                            subtotal={totals.subtotal}
                            discountAmount={totals.discountAmount}
                            taxAmount={totals.taxAmount}
                            total={totals.total}
                            processing={processing}
                            enabledPaymentMethods={enabledPaymentMethods}
                            canLineDiscounts={canLineDiscounts}
                            canCustomerSearch={canCustomerSearch}
                            canThermalPrint={canThermalPrint}
                            onUpdateQty={handleUpdateQty}
                            onRemoveItem={handleRemoveItem}
                            onSetDiscount={handleSetDiscount}
                            onSetCustomer={handleSetCustomer}
                            onSetPayment={handleSetPayment}
                            onCharge={handleCharge}
                            onClear={() => dispatch({ type: 'CLEAR' })}
                            labels={labels}
                            couponCode={couponCode}
                            onCouponApply={handleCouponApply}
                            onCouponRemove={handleCouponRemove}
                            showRecommendations={featureFlags.enable_pos_shifts === true}
                            products={isOnline ? adjustedProducts : cachedProducts}
                            onAddToCart={handleAddToCart}
                            defaultCurrency={defaultCurrency}
                        />
                    </div>
                </div>

                {/* ═══ MOBILE: Floating mini-cart bar (md:hidden) ═══ */}
                {cart.items.length > 0 && !mobileCartOpen && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                        <button
                            onClick={() => setMobileCartOpen(true)}
                            aria-label={`${posLabel('panel.pos.cart', labels)} — ${cart.items.reduce((s, i) => s + i.quantity, 0)} ${posLabel('panel.pos.items', labels) || 'items'}`}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px]
                                       text-white rounded-2xl active:scale-[0.98] transition-transform
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2
                                       bg-brand shadow-xl shadow-brand/20"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                                    <ShoppingCart className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <span className="text-xs opacity-80">
                                        {cart.items.reduce((s, i) => s + i.quantity, 0)} {posLabel('panel.pos.items', labels) || 'items'}
                                    </span>
                                    <p className="text-sm font-bold tabular-nums">
                                        {formatCurrency(totals.total)}
                                    </p>
                                </div>
                            </div>
                            <span className="text-sm font-bold flex items-center gap-1.5">
                                {posLabel('panel.pos.pay', labels)} →
                            </span>
                        </button>
                    </div>
                )}

                {/* ═══ MOBILE: Bottom sheet cart overlay ═══ */}
                <AnimatePresence>
                    {mobileCartOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setMobileCartOpen(false)}
                                className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                role="dialog"
                                aria-modal="true"
                                aria-label={posLabel('panel.pos.cart', labels)}
                                className="md:hidden fixed inset-x-0 bottom-0 z-50
                                           bg-sf-0 rounded-t-3xl flex flex-col"
                                style={{ maxHeight: '90dvh', boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.12)' }}
                            >
                                <div className="flex items-center justify-center pt-2 pb-1">
                                    <div className="w-10 h-1 rounded-full bg-sf-3" />
                                </div>
                                <div className="flex items-center justify-between px-4 pb-2">
                                    <span className="text-sm font-bold text-tx">
                                        {posLabel('panel.pos.cart', labels)}
                                    </span>
                                    <button
                                        onClick={() => setMobileCartOpen(false)}
                                        aria-label={posLabel('panel.pos.close', labels) || 'Close cart'}
                                        className="w-8 h-8 rounded-full bg-sf-1 flex items-center justify-center
                                                   hover:bg-sf-2 transition-colors
                                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                    >
                                        <XIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0 overflow-hidden">
                                    <POSCart
                                        items={cart.items}
                                        discount={cart.discount}
                                        customerName={cart.customer_name}
                                        paymentMethod={cart.payment_method}
                                        subtotal={totals.subtotal}
                                        discountAmount={totals.discountAmount}
                                        taxAmount={totals.taxAmount}
                                        total={totals.total}
                                        processing={processing}
                                        enabledPaymentMethods={enabledPaymentMethods}
                                        canLineDiscounts={canLineDiscounts}
                                        canCustomerSearch={canCustomerSearch}
                                        canThermalPrint={canThermalPrint}
                                        onUpdateQty={handleUpdateQty}
                                        onRemoveItem={handleRemoveItem}
                                        onSetDiscount={handleSetDiscount}
                                        onSetCustomer={handleSetCustomer}
                                        onSetPayment={handleSetPayment}
                                        onCharge={() => { handleCharge(); setMobileCartOpen(false) }}
                                        onClear={() => { dispatch({ type: 'CLEAR' }); setMobileCartOpen(false) }}
                                        labels={labels}
                                        couponCode={couponCode}
                                        onCouponApply={handleCouponApply}
                                        onCouponRemove={handleCouponRemove}
                                        defaultCurrency={defaultCurrency}
                                    />
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Payment overlay */}
            {paymentState.status !== 'idle' && (
                <POSPaymentOverlay
                    state={paymentState}
                    onCancel={handleCancelPayment}
                    labels={labels}
                />
            )}

            {/* Receipt modal */}
            {completedSale && (
                <Suspense fallback={null}>
                    <POSReceipt
                        sale={completedSale}
                        businessName={businessName}
                        canThermalPrint={canThermalPrint}
                        onNewSale={handleNewSale}
                        labels={labels}
                        posConfig={posConfig}
                    />
                </Suspense>
            )}

            {/* ── Side panels ── */}
            {panelView === 'history' && canAccessHistory && (
                <Suspense fallback={null}>
                    <POSSalesHistory
                        onClose={() => setPanelView(null)}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}
            {panelView === 'dashboard' && canAccessDashboard && (
                <Suspense fallback={null}>
                    <POSDashboard
                        onClose={() => setPanelView(null)}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}
            {panelView === 'shift' && canAccessShifts && (
                <Suspense fallback={null}>
                    <POSShiftPanel
                        onClose={() => setPanelView(null)}
                        onShiftChange={setCurrentShift}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}
            {panelView === 'customer' && (
                <Suspense fallback={null}>
                    <POSCustomerModal
                        onClose={() => setPanelView(null)}
                        onSelect={handleCustomerSelect}
                        labels={labels}
                    />
                </Suspense>
            )}
            {panelView === 'refund' && refundOrderId && (
                <Suspense fallback={null}>
                    <POSRefundModal
                        orderId={refundOrderId}
                        onClose={() => { setRefundOrderId(null); setPanelView(null) }}
                        onComplete={handleRefundComplete}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}
            {panelView === 'parkedSales' && (
                <Suspense fallback={null}>
                    <POSParkedSales
                        onClose={() => setPanelView(null)}
                        onResume={handleResumeParked}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}
            {refundReceipt && (
                <Suspense fallback={null}>
                    <POSRefundReceipt
                        refund={refundReceipt}
                        businessName={businessName}
                        onClose={() => setRefundReceipt(null)}
                        labels={labels}
                    />
                </Suspense>
            )}
            {panelView === 'printerSettings' && canThermalPrint && (
                <Suspense fallback={null}>
                    <POSPrinterSettings
                        isOpen={true}
                        onClose={() => setPanelView(null)}
                        labels={labels}
                    />
                </Suspense>
            )}
            {panelView === 'splitPayment' && canSplitPayment && (
                <Suspense fallback={null}>
                    <POSSplitPayment
                        total={totals.total}
                        enabledPaymentMethods={enabledPaymentMethods}
                        onConfirm={handleSplitPaymentConfirm}
                        onCancel={() => setPanelView(null)}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}
            {panelView === 'loyalty' && canLoyalty && (
                <Suspense fallback={null}>
                    <POSLoyaltyCard
                        customerId={cart.customer_id}
                        customerName={cart.customer_name}
                        onClose={() => setPanelView(null)}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                    />
                </Suspense>
            )}
            {panelView === 'endOfDay' && canEndOfDay && (
                <Suspense fallback={null}>
                    <POSEndOfDayReport
                        onClose={() => setPanelView(null)}
                        labels={labels}
                        defaultCurrency={defaultCurrency}
                        shifts={shiftHistory}
                    />
                </Suspense>
            )}
            {panelView === 'posSettings' && (
                <Suspense fallback={null}>
                    <POSSettingsDrawer
                        isOpen={true}
                        onClose={() => setPanelView(null)}
                        initialValues={posConfig}
                        labels={labels}
                    />
                </Suspense>
            )}
        </PageEntrance>
    )
}
