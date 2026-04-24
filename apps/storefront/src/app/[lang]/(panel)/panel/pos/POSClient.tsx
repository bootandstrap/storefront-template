'use client'

/**
 * POSClient — Point of Sale orchestrator (SOTA v2 — decomposed)
 *
 * Thin orchestrator that composes:
 * - State declarations (useReducer cart + local state)
 * - Hook composition (sounds, sync, barcode, offline, printer)
 * - Render composition (POSToolbar, POSProductGrid, POSCart,
 *   POSMobileCartSheet, POSSidePanelManager, POSPaymentOverlay)
 *
 * Business logic extracted to:
 * - Payment: inline (completeSale, handleCharge, polling) — tightly coupled to state
 * - Cart actions: inline callbacks — lightweight enough to stay
 *
 * @module pos/POSClient
 */

import { useReducer, useCallback, useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
} from '@/lib/pos/pos-config'
import type { POSProduct, POSCategory } from '@/lib/pos/pos-product-types'
import type { FeatureFlags, PlanLimits } from '@/lib/config'
import { charge } from '@/lib/pos/payments/payment-adapter'
import { usePOSSounds, triggerHaptic } from '@/lib/pos/usePOSSounds'
import { useBarcodeScanner } from '@/lib/pos/useBarcodeScanner'
import { useOfflineSync } from '@/lib/pos/offline/useOfflineSync'
import { usePrinterConnection, type BusinessInfo } from '@/lib/pos/usePrinterConnection'
import { usePOSSync, type POSSyncEvent } from '@/lib/pos/usePOSSync'
import { getEnabledPOSPaymentMethods, isPOSHistoryAvailable, isPOSDashboardAvailable, formatPOSCurrency } from '@/lib/pos/pos-utils'
import { posLabel } from '@/lib/pos/pos-i18n'
import { PageEntrance } from '@/components/panel/PanelAnimations'
import { createPOSSale, searchPOSProducts } from './actions'
import { POSProductGrid, POSCart, POSPaymentOverlay, POSOfflineBanner, POSToolbar, getParkedSales } from './pos-components'
import POSSidePanelManager from './POSSidePanelManager'
import POSMobileCartSheet from './POSMobileCartSheet'

// ─── Props ──────────────────────────────────────────────────────────────────

interface POSClientProps {
    /* Products arrive as AdminProductFull[] from server but we pass them through to
       POSProductGrid unchanged. Using any[] as the bridge type avoids coupling to Medusa SDK types. */
    products: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    categories: POSCategory[]
    defaultCurrency: string
    businessName: string
    labels: Record<string, string>
    featureFlags: FeatureFlags
    planLimits: PlanLimits
    posConfig?: Record<string, unknown>
    tenantId?: string
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
    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════════════
    // HOOKS
    // ═══════════════════════════════════════════════════════════════════════

    const { playBeep, playTick, playCashRegister, playError } = usePOSSounds()
    const { isOnline, syncStatus, pendingCount, lastSyncTime, offlineInventoryOffsets, syncNow, queueOfflineSale, cachedProducts } = useOfflineSync()
    const { status: printerStatus, printReceipt: thermalPrintReceipt, printRefund: thermalPrintRefund } = usePrinterConnection()

    // ── Multi-device sync ──
    const handlePOSSyncEvent = useCallback((event: POSSyncEvent) => {
        if (event.type === 'sale_completed' || event.type === 'shift_changed') {
            setSyncNotification(`${event.type === 'sale_completed' ? 'Sale completed' : `Shift ${event.payload?.action || 'updated'}`} on another device`)
            setTimeout(() => setSyncNotification(null), 3000)
        }
    }, [])

    const { broadcast: syncBroadcast } = usePOSSync({
        tenantId,
        enabled: featureFlags.enable_pos === true,
        onEvent: handlePOSSyncEvent,
    })

    // ═══════════════════════════════════════════════════════════════════════
    // DERIVED
    // ═══════════════════════════════════════════════════════════════════════

    const enabledPaymentMethods = useMemo(() => getEnabledPOSPaymentMethods(planLimits), [planLimits])
    const canAccessHistory = useMemo(() => isPOSHistoryAvailable(featureFlags as unknown as Record<string, boolean>), [featureFlags])
    const canAccessDashboard = useMemo(() => isPOSDashboardAvailable(featureFlags as unknown as Record<string, boolean>), [featureFlags])
    const canAccessShifts = featureFlags.enable_pos_shifts === true
    const canKiosk = featureFlags.enable_pos_kiosk === true
    const canShortcuts = featureFlags.enable_pos_keyboard_shortcuts === true
    const canOffline = featureFlags.enable_pos_offline_cart === true
    const canThermalPrint = featureFlags.enable_pos_thermal_printer === true
    const canLineDiscounts = featureFlags.enable_pos_line_discounts === true
    const canCustomerSearch = featureFlags.enable_pos_customer_search === true
    const canSplitPayment = featureFlags.enable_pos_multi_device === true
    const canLoyalty = canCustomerSearch
    const canEndOfDay = canAccessShifts

    const businessInfo: BusinessInfo = useMemo(() => ({
        name: (posConfig.receipt_business_name as string) || businessName,
        address: (posConfig.receipt_address as string) || undefined,
        nif: (posConfig.receipt_nif as string) || undefined,
        phone: (posConfig.receipt_phone as string) || undefined,
        email: (posConfig.receipt_email as string) || undefined,
    }), [posConfig, businessName])

    const shouldAutoPrint = useCallback(() => {
        if (printerStatus !== 'connected' || !canThermalPrint) return false
        return typeof window !== 'undefined' && localStorage.getItem('pos-auto-print') === 'true'
    }, [printerStatus, canThermalPrint])

    const formatCurrency = useCallback(
        (amount: number) => formatPOSCurrency(amount, defaultCurrency),
        [defaultCurrency],
    )

    // ── Products with offline inventory offsets ──
    const adjustedProducts = useMemo(() => {
        let baseProducts = products as any[] // eslint-disable-line @typescript-eslint/no-explicit-any
        if (serverProducts.length > 0) {
            const localIds = new Set(products.map((p: any) => p.id)) // eslint-disable-line @typescript-eslint/no-explicit-any
            const extras = serverProducts.filter((p: any) => !localIds.has(p.id)) // eslint-disable-line @typescript-eslint/no-explicit-any
            baseProducts = [...products, ...extras]
        }

        if (Object.keys(offlineInventoryOffsets).length === 0) return baseProducts

        return baseProducts.map((p: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (!p.variants || p.variants.length === 0) return p
            const hasOffset = p.variants.some((v: any) => offlineInventoryOffsets[v.id]) // eslint-disable-line @typescript-eslint/no-explicit-any
            if (!hasOffset) return p

            return {
                ...p,
                variants: p.variants.map((v: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    const offset = offlineInventoryOffsets[v.id]
                    if (!offset) return v
                    return { ...v, inventory_quantity: Math.max(0, (v.inventory_quantity ?? 0) - offset) }
                }),
            }
        })
    }, [products, serverProducts, offlineInventoryOffsets])

    const taxRate = typeof posConfig.tax_rate === 'number' ? posConfig.tax_rate : 0
    const totals = useMemo(() => calculateCartTotals(cart, taxRate), [cart, taxRate])

    // ═══════════════════════════════════════════════════════════════════════
    // EFFECTS
    // ═══════════════════════════════════════════════════════════════════════

    // Fullscreen mode
    useEffect(() => {
        document.body.classList.add('pos-fullscreen')
        return () => { document.body.classList.remove('pos-fullscreen') }
    }, [])

    // Parked sales counter
    useEffect(() => {
        const updateCount = () => setParkedSalesCount(getParkedSales().length)
        updateCount()
        window.addEventListener('storage', updateCount)
        return () => window.removeEventListener('storage', updateCount)
    }, [])

    // Cart persistence — restore
    useEffect(() => {
        const saved = localStorage.getItem('pos_cart')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (parsed.items?.length > 0) {
                    const validVariantIds = new Set(
                        products.flatMap((p: any) => (p.variants ?? []).map((v: any) => v.id)) // eslint-disable-line @typescript-eslint/no-explicit-any
                    )
                    const validItems = parsed.items
                        .filter((i: POSCartItem) => validVariantIds.has(i.id))
                        .map((i: POSCartItem) => ({
                            ...i,
                            unit_price: typeof i.unit_price === 'number' && !isNaN(i.unit_price) ? i.unit_price : 0,
                        }))

                    if (validItems.length > 0) {
                        dispatch({ type: 'RESTORE_CART', cart: { ...parsed, items: validItems } })
                    } else {
                        localStorage.removeItem('pos_cart')
                    }
                }
            } catch { /* ignore corrupt data */ }
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Cart persistence — save
    useEffect(() => {
        if (cart.items.length > 0) {
            localStorage.setItem('pos_cart', JSON.stringify(cart))
        } else {
            localStorage.removeItem('pos_cart')
        }
    }, [cart])

    // Keyboard shortcuts
    useEffect(() => {
        if (!canShortcuts) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            switch (e.key) {
                case 'F2': e.preventDefault(); document.querySelector<HTMLInputElement>('[data-pos-search]')?.focus(); break
                case 'F3': e.preventDefault(); if (canAccessHistory) setPanelView(v => v === 'history' ? null : 'history'); break
                case 'F5': e.preventDefault(); if (canAccessDashboard) setPanelView(v => v === 'dashboard' ? null : 'dashboard'); break
                case 'F11': e.preventDefault(); if (canKiosk) toggleKiosk(); break
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [canShortcuts, canAccessHistory, canAccessDashboard, canKiosk]) // eslint-disable-line react-hooks/exhaustive-deps

    // Universal Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
            e.preventDefault()
            if (completedSale) { setCompletedSale(null); return }
            if (refundReceipt) { setRefundReceipt(null); return }
            if (paymentState.status !== 'idle') { handleCancelPayment(); return }
            if (refundOrderId) { setRefundOrderId(null); return }
            if (panelView) { setPanelView(null); return }
            if (mobileCartOpen) { setMobileCartOpen(false); return }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [completedSale, refundReceipt, paymentState.status, refundOrderId, panelView, mobileCartOpen]) // eslint-disable-line react-hooks/exhaustive-deps

    // Shift history
    useEffect(() => {
        if (!canAccessShifts) return
        import('@/lib/pos/shifts/shift-actions').then(mod => {
            mod.listShiftsAction({ status: 'closed' }).then(result => {
                if (result.shifts) {
                    setShiftHistory(result.shifts.map(s => ({
                        id: s.id,
                        opened_at: s.created_at,
                        closed_at: s.closed_at ?? undefined,
                        opening_cash: s.expected_cash,
                        closing_cash: s.actual_cash ?? undefined,
                        expected_cash: s.expected_cash,
                        cash_difference: s.discrepancy ?? undefined,
                        total_sales: s.transaction_count,
                        total_revenue: s.total_revenue,
                        status: s.status as 'open' | 'closed',
                    })))
                }
            })
        }).catch(() => {})
    }, [canAccessShifts, currentShift])

    // Clean up polling on unmount
    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

    // ═══════════════════════════════════════════════════════════════════════
    // HANDLERS
    // ═══════════════════════════════════════════════════════════════════════

    const handleAddToCart = useCallback((item: POSCartItem) => {
        dispatch({ type: 'ADD_ITEM', item })
        playBeep()
        triggerHaptic()
        syncBroadcast('cart_updated', { action: 'add', itemTitle: item.title })
    }, [playBeep, syncBroadcast])

    // ── Barcode scanner ──
    const handleBarcodeScan = useCallback(async (barcode: string) => {
        const localMatch = adjustedProducts.find((p: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            p.variants?.some((v: any) => v.sku === barcode || v.barcode === barcode), // eslint-disable-line @typescript-eslint/no-explicit-any
        )

        if (localMatch) {
            const variant = localMatch.variants.find((v: any) => v.sku === barcode || v.barcode === barcode) // eslint-disable-line @typescript-eslint/no-explicit-any
            if (variant) {
                const priceInfo = safeVariantPrice(variant, defaultCurrency)
                if (!priceInfo.has_price) { playError(); return }
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
            try {
                const { products: results } = await searchPOSProducts(barcode)
                if (results.length > 0) {
                    setServerProducts(prev => [...prev, ...results])
                    const product = results[0]
                    const variant = product.variants?.[0]
                    if (variant) {
                        const priceInfo = safeVariantPrice(variant, defaultCurrency)
                        if (!priceInfo.has_price) { playError(); return }
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
                } else { playError() }
            } catch { playError() }
        } else { playError() }
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

    const handleSetDiscount = useCallback((discount: POSDiscount | null) => dispatch({ type: 'SET_DISCOUNT', discount }), [])
    const handleSetPayment = useCallback((method: PaymentMethod) => { dispatch({ type: 'SET_PAYMENT', method }); triggerHaptic(30) }, [])
    const handleSetCustomer = useCallback(() => setPanelView('customer'), [])

    const handleCustomerSelect = useCallback((customer: { id: string; name: string } | null) => {
        if (customer) dispatch({ type: 'SET_CUSTOMER', customer_id: customer.id, customer_name: customer.name })
        else dispatch({ type: 'SET_CUSTOMER', customer_id: null, customer_name: null })
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
        if (shouldAutoPrint()) {
            const pw = (typeof window !== 'undefined' ? localStorage.getItem('pos-paper-width') : '80mm') as '80mm' | '58mm' || '80mm'
            thermalPrintRefund(refund, businessInfo, {
                mode: 'thermal', paperWidth: pw, labels,
                receiptConfig: { receiptHeader: posConfig.receipt_header as string | undefined, receiptFooter: posConfig.receipt_footer as string | undefined },
            }).catch(() => {})
        }
    }, [shouldAutoPrint, thermalPrintRefund, businessInfo, labels, posConfig])

    const handleCouponApply = useCallback((discount: POSDiscount, code: string) => { dispatch({ type: 'SET_DISCOUNT', discount }); setCouponCode(code) }, [])
    const handleCouponRemove = useCallback(() => { dispatch({ type: 'SET_DISCOUNT', discount: null }); setCouponCode(undefined) }, [])
    const handleNewSale = useCallback(() => { setCompletedSale(null); dispatch({ type: 'CLEAR' }) }, [])
    const handleParkFromCart = useCallback(() => setParkedSalesCount(prev => prev + 1), [])
    const handleResumeParked = useCallback((items: POSCartItem[]) => {
        dispatch({ type: 'RESTORE_CART', cart: { items, discount: null, customer_id: null, customer_name: null, payment_method: 'cash' } })
        setPanelView(null)
        setParkedSalesCount(getParkedSales().length)
    }, [])

    const handleExitPOS = useCallback(() => {
        if (cart.items.length > 0) {
            const msg = posLabel('panel.pos.confirmExit', labels) || '¿Seguro que deseas salir del POS? Los artículos del carrito se guardarán.'
            if (!window.confirm(msg)) return
        }
        const lang = document.documentElement.lang || 'es'
        router.push(`/${lang}/panel`)
    }, [cart.items.length, router, labels])

    const toggleKiosk = useCallback(() => {
        if (!canKiosk) return
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.(); setIsKiosk(true) }
        else { document.exitFullscreen?.(); setIsKiosk(false) }
    }, [canKiosk])

    const handleSplitPaymentConfirm = useCallback((entries: { method: PaymentMethod; amount: number }[]) => {
        if (entries.length > 0) dispatch({ type: 'SET_PAYMENT', method: entries[0].method })
        setPanelView(null)
        handleCharge()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ═══════════════════════════════════════════════════════════════════════
    // PAYMENT
    // ═══════════════════════════════════════════════════════════════════════

    const completeSale = useCallback(async (paymentIntentId?: string) => {
        const result = await createPOSSale({
            items: cart.items.map(i => ({ variant_id: i.id, quantity: i.quantity, unit_price: i.unit_price })),
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
                items: cart.items, discount: cart.discount, customer_id: cart.customer_id, customer_name: cart.customer_name,
                payment_method: cart.payment_method, subtotal: totals.subtotal, discount_amount: totals.discountAmount,
                tax_amount: totals.taxAmount, total: totals.total, currency_code: cart.items[0]?.currency_code || defaultCurrency,
                created_at: new Date().toISOString(), order_id: result.order_id || null, draft_order_id: result.draft_order_id || null,
            }

            if (shouldAutoPrint()) {
                const pw = (typeof window !== 'undefined' ? localStorage.getItem('pos-paper-width') : '80mm') as '80mm' | '58mm' || '80mm'
                thermalPrintReceipt(sale, businessInfo, {
                    mode: 'thermal', paperWidth: pw, openCashDrawer: sale.payment_method === 'cash', labels,
                    receiptConfig: { receiptHeader: posConfig.receipt_header as string | undefined, receiptFooter: posConfig.receipt_footer as string | undefined },
                }).catch(() => {})
            }

            setTimeout(() => {
                setCompletedSale(sale)
                setPaymentState({ status: 'idle' })
                localStorage.removeItem('pos_cart')
                setCouponCode(undefined)
                if (cart.items.length >= 2) {
                    import('./POSRecommendations').then(mod => mod.recordCoOccurrence(cart.items.map(i => ({ title: i.title })))).catch(() => {})
                }
            }, 1500)
        } else {
            playError()
            if (result.error?.startsWith('STALE_CART')) {
                dispatch({ type: 'CLEAR' })
                localStorage.removeItem('pos_cart')
                setPaymentState({ status: 'failed', error: posLabel('panel.pos.staleCart', labels) || 'Items in cart are outdated. Cart has been cleared.' })
            } else {
                setPaymentState({ status: 'failed', error: result.error || posLabel('panel.pos.paymentFailed', labels) })
            }
        }
    }, [cart, totals, defaultCurrency, playCashRegister, playError, labels, shouldAutoPrint, thermalPrintReceipt, businessInfo, posConfig, syncBroadcast])

    const handleCharge = useCallback(async () => {
        if (cart.items.length === 0 || processing) return
        setProcessing(true)
        const method = cart.payment_method

        // Offline fallback
        if (!isOnline) {
            if (method !== 'cash' && method !== 'manual_card') {
                setPaymentState({ status: 'failed', error: posLabel('panel.pos.offlineNoCard', labels) })
                setProcessing(false)
                return
            }
            if (!canOffline) {
                setPaymentState({ status: 'failed', error: 'Offline mode not available' })
                setProcessing(false)
                return
            }
            try {
                await queueOfflineSale({
                    items: cart.items.map(i => ({ variant_id: i.id, quantity: i.quantity, unit_price: i.unit_price })),
                    payment_method: method, customer_id: cart.customer_id || undefined,
                    customer_name: cart.customer_name || undefined, discount_amount: totals.discountAmount,
                    created_at: new Date().toISOString(),
                })
                playCashRegister()
                triggerHaptic(100)
                const sale: POSSale = {
                    items: cart.items, discount: cart.discount, customer_id: cart.customer_id, customer_name: cart.customer_name,
                    payment_method: cart.payment_method, subtotal: totals.subtotal, discount_amount: totals.discountAmount,
                    tax_amount: totals.taxAmount, total: totals.total, currency_code: cart.items[0]?.currency_code || defaultCurrency,
                    created_at: new Date().toISOString(), order_id: null, draft_order_id: null,
                }
                setCompletedSale(sale)
                localStorage.removeItem('pos_cart')
            } catch { playError(); setPaymentState({ status: 'failed', error: 'Failed to save sale offline' }) }
            setProcessing(false)
            return
        }

        if (method === 'cash' || method === 'manual_card') { await completeSale(); return }

        setPaymentState({ status: 'creating_intent' })
        const result = await charge({
            amount: totals.total, currency: cart.items[0]?.currency_code || defaultCurrency, method,
            metadata: { source: 'pos', customer_id: cart.customer_id || '' },
        })

        if (result.success) { await completeSale(result.payment_intent_id); return }

        if (result.requires_action === 'present_card') {
            setPaymentState({ status: 'awaiting_card', reader_display: result.action_data?.reader_display || '' })
            startTerminalPolling(result.action_data?.payment_intent_id)
        } else if (result.requires_action === 'scan_qr') {
            setPaymentState({
                status: 'awaiting_twint_scan', qr_url: result.action_data?.qr_url || '',
                expires_at: result.action_data?.expires_at || '', payment_intent_id: result.action_data?.payment_intent_id || '',
            })
            startTwintPolling(result.action_data?.payment_intent_id || '')
        } else {
            setPaymentState({ status: 'failed', error: result.error || posLabel('panel.pos.paymentFailed', labels) })
            setProcessing(false)
        }
    }, [cart, processing, totals, defaultCurrency, completeSale, canOffline, isOnline, labels, playCashRegister, playError, queueOfflineSale])

    const startTerminalPolling = useCallback((piId?: string) => {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = setInterval(async () => {
            try {
                const { pollTwintPaymentAction } = await import('./actions')
                const status = await pollTwintPaymentAction(piId || '')
                if (status.status === 'succeeded') { if (pollRef.current) clearInterval(pollRef.current); setPaymentState({ status: 'processing' }); await completeSale(piId) }
                else if (status.status === 'failed') { if (pollRef.current) clearInterval(pollRef.current); setPaymentState({ status: 'failed', error: status.error || 'Payment failed on reader' }); setProcessing(false) }
            } catch { /* keep polling */ }
        }, 2000)
    }, [completeSale])

    const startTwintPolling = useCallback((piId: string) => {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = setInterval(async () => {
            try {
                const { pollTwintPaymentAction } = await import('./actions')
                const status = await pollTwintPaymentAction(piId)
                if (status.status === 'succeeded') { if (pollRef.current) clearInterval(pollRef.current); setPaymentState({ status: 'processing' }); await completeSale(piId) }
                else if (status.status === 'canceled' || status.status === 'failed') { if (pollRef.current) clearInterval(pollRef.current); setPaymentState({ status: 'failed', error: status.error || posLabel('panel.pos.paymentCancelled', labels) }); setProcessing(false) }
            } catch { /* keep polling */ }
        }, 2000)
    }, [completeSale, labels])

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

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <PageEntrance className="h-full max-h-full flex flex-col overflow-hidden bg-sf-0 print:hidden">
            {/* Toolbar */}
            <POSToolbar
                labels={labels}
                isOnline={isOnline}
                pendingCount={pendingCount}
                lastSyncTime={lastSyncTime}
                currentShift={currentShift}
                panelView={panelView}
                setPanelView={(v: string | null) => setPanelView(v as POSPanelView)}
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

            {/* Offline banner */}
            {canOffline && (
                <POSOfflineBanner isOnline={isOnline} syncStatus={syncStatus} pendingCount={pendingCount} lastSyncTime={lastSyncTime} onSyncNow={syncNow} labels={labels} />
            )}

            {/* Main grid */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
                <div className="h-full pos-grid">
                    {/* Product Grid */}
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

                    {/* Cart sidebar — desktop only */}
                    <div className="hidden md:flex pos-cart-sidebar">
                        <POSCart
                            items={cart.items} discount={cart.discount} customerName={cart.customer_name}
                            paymentMethod={cart.payment_method} subtotal={totals.subtotal} discountAmount={totals.discountAmount}
                            taxAmount={totals.taxAmount} total={totals.total} processing={processing}
                            enabledPaymentMethods={enabledPaymentMethods} canLineDiscounts={canLineDiscounts}
                            canCustomerSearch={canCustomerSearch} canThermalPrint={canThermalPrint}
                            onUpdateQty={handleUpdateQty} onRemoveItem={handleRemoveItem}
                            onSetDiscount={handleSetDiscount} onSetCustomer={handleSetCustomer}
                            onSetPayment={handleSetPayment} onCharge={handleCharge}
                            onClear={() => dispatch({ type: 'CLEAR' })} labels={labels}
                            couponCode={couponCode} onCouponApply={handleCouponApply} onCouponRemove={handleCouponRemove}
                            showRecommendations={featureFlags.enable_pos_shifts === true}
                            products={isOnline ? adjustedProducts : cachedProducts}
                            onAddToCart={handleAddToCart} defaultCurrency={defaultCurrency}
                        />
                    </div>
                </div>

                {/* Mobile cart */}
                <POSMobileCartSheet
                    items={cart.items} discount={cart.discount} customerName={cart.customer_name}
                    paymentMethod={cart.payment_method} subtotal={totals.subtotal} discountAmount={totals.discountAmount}
                    taxAmount={totals.taxAmount} total={totals.total} processing={processing}
                    enabledPaymentMethods={enabledPaymentMethods} canLineDiscounts={canLineDiscounts}
                    canCustomerSearch={canCustomerSearch} canThermalPrint={canThermalPrint}
                    onUpdateQty={handleUpdateQty} onRemoveItem={handleRemoveItem}
                    onSetDiscount={handleSetDiscount} onSetCustomer={handleSetCustomer}
                    onSetPayment={handleSetPayment} onCharge={handleCharge}
                    onClear={() => dispatch({ type: 'CLEAR' })} labels={labels}
                    couponCode={couponCode} onCouponApply={handleCouponApply} onCouponRemove={handleCouponRemove}
                    defaultCurrency={defaultCurrency} formatCurrency={formatCurrency}
                    isOpen={mobileCartOpen} onOpen={() => setMobileCartOpen(true)} onClose={() => setMobileCartOpen(false)}
                />
            </div>

            {/* Payment overlay */}
            {paymentState.status !== 'idle' && (
                <POSPaymentOverlay state={paymentState} onCancel={handleCancelPayment} labels={labels} />
            )}

            {/* Side panels */}
            <POSSidePanelManager
                panelView={panelView} setPanelView={setPanelView} labels={labels} defaultCurrency={defaultCurrency}
                businessName={businessName} canAccessHistory={canAccessHistory} canAccessDashboard={canAccessDashboard}
                canAccessShifts={canAccessShifts} canThermalPrint={canThermalPrint} canSplitPayment={canSplitPayment}
                canLoyalty={canLoyalty} canEndOfDay={canEndOfDay} currentShift={currentShift}
                onShiftChange={setCurrentShift} shiftHistory={shiftHistory} refundOrderId={refundOrderId}
                onRefundClose={() => { setRefundOrderId(null); setPanelView(null) }} onRefundComplete={handleRefundComplete}
                refundReceipt={refundReceipt} onRefundReceiptClose={() => setRefundReceipt(null)}
                completedSale={completedSale} onNewSale={handleNewSale} posConfig={posConfig}
                featureFlags={featureFlags} onResumeParked={handleResumeParked}
                parkedSalesMultiDevice={featureFlags.enable_pos_multi_device === true}
                onCustomerSelect={handleCustomerSelect} customerId={cart.customer_id} customerName={cart.customer_name}
                splitTotal={totals.total} enabledPaymentMethods={enabledPaymentMethods}
                onSplitPaymentConfirm={handleSplitPaymentConfirm} onRefundFromHistory={handleRefundFromHistory}
            />
        </PageEntrance>
    )
}
