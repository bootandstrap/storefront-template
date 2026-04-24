/**
 * POS i18n — Centralized labels, payment method config, and upsell text
 *
 * All POS strings are consolidated here. Components reference these
 * via the labels dictionary or directly for static config.
 */

import { Banknote, CreditCard, Smartphone, FileText, type LucideIcon } from 'lucide-react'
import type { PaymentMethod } from '@/lib/pos/pos-config'

// ---------------------------------------------------------------------------
// Payment method visual config (replaces emoji in pos-config.ts)
// ---------------------------------------------------------------------------

export interface POSPaymentMethodConfig {
    key: PaymentMethod
    icon: LucideIcon
    labelKey: string
    /** Fallback label */
    label: string
    /** Tailwind classes for active pill */
    activeClass: string
    /** Tailwind classes for bg color indicator */
    colorClass: string
}

export const POS_PAYMENT_CONFIG: POSPaymentMethodConfig[] = [
    {
        key: 'cash',
        icon: Banknote,
        labelKey: 'panel.pos.cash',
        label: 'Efectivo',
        activeClass: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20',
        colorClass: 'text-emerald-500',
    },
    {
        key: 'card_terminal',
        icon: CreditCard,
        labelKey: 'panel.pos.cardTerminal',
        label: 'Tarjeta',
        activeClass: 'bg-blue-500 text-white shadow-sm shadow-blue-500/20',
        colorClass: 'text-blue-500',
    },
    {
        key: 'twint',
        icon: Smartphone,
        labelKey: 'panel.pos.twint',
        label: 'Twint',
        activeClass: 'bg-[#000] text-white shadow-sm shadow-black/20',
        colorClass: 'text-black dark:text-white',
    },
    {
        key: 'manual_card',
        icon: FileText,
        labelKey: 'panel.pos.manualCard',
        label: 'Manual',
        activeClass: 'bg-violet-500 text-white shadow-sm shadow-violet-500/20',
        colorClass: 'text-violet-500',
    },
]

// ---------------------------------------------------------------------------
// Refund reasons (for POSRefundModal)
// ---------------------------------------------------------------------------

export const REFUND_REASONS = [
    { key: 'damaged' as const, labelKey: 'panel.pos.reason.damaged', label: 'Producto dañado' },
    { key: 'wrong_item' as const, labelKey: 'panel.pos.reason.wrongItem', label: 'Producto equivocado' },
    { key: 'dissatisfied' as const, labelKey: 'panel.pos.reason.dissatisfied', label: 'Cliente insatisfecho' },
    { key: 'other' as const, labelKey: 'panel.pos.reason.other', label: 'Otro motivo' },
]

// ---------------------------------------------------------------------------
// Default POS labels (fallback when i18n dictionary not loaded)
// ---------------------------------------------------------------------------

export const POS_DEFAULT_LABELS: Record<string, string> = {
    // ── Core ──
    'panel.pos.title': 'POS',
    'panel.pos.search': 'Buscar productos…',
    'panel.pos.allCategories': 'Todos',
    'panel.pos.noProducts': 'No hay productos',
    'panel.pos.noResults': 'Sin resultados',
    'panel.pos.clearSearch': 'Limpiar búsqueda',

    // ── Cart ──
    'panel.pos.cart': 'Carrito',
    'panel.pos.emptyCart': 'Carrito vacío',
    'panel.pos.items': 'artículos',
    'panel.pos.clearCart': 'Vaciar',
    'panel.pos.subtotal': 'Subtotal',
    'panel.pos.discount': 'Descuento',
    'panel.pos.tax': 'Impuesto',
    'panel.pos.total': 'Total',
    'panel.pos.charge': 'Cobrar',
    'panel.pos.pay': 'Cobrar',
    'panel.pos.selectPayment': 'Método de pago',
    'panel.pos.confirmPayment': 'Confirmar pago',
    'panel.pos.holdSale': 'Aparcar venta',
    'panel.pos.parkedSales': 'Ventas aparcadas',

    // ── Payment methods ──
    'panel.pos.cash': 'Efectivo',
    'panel.pos.cardTerminal': 'Tarjeta',
    'panel.pos.twint': 'Twint',
    'panel.pos.manualCard': 'Manual',

    // ── Cash tendered ──
    'panel.pos.cashTendered': 'Importe entregado',
    'panel.pos.change': 'Cambio',
    'panel.pos.shortAmount': 'Falta',
    'panel.pos.confirmCharge': 'Confirmar Cobro',

    // ── Payment processing ──
    'panel.pos.creatingPayment': 'Creando pago…',
    'panel.pos.presentCard': 'Presente la tarjeta…',
    'panel.pos.scanTwint': 'Escanee el código QR…',
    'panel.pos.processing': 'Procesando pago…',
    'panel.pos.paymentSuccess': '¡Pago exitoso!',
    'panel.pos.paymentFailed': 'Pago fallido',
    'panel.pos.paymentCancelled': 'Pago cancelado',
    'panel.pos.cancel': 'Cancelar',
    'panel.pos.retry': 'Reintentar',
    'panel.pos.offlineNoCard': 'Pagos con tarjeta no disponibles sin conexión',
    'panel.pos.enterAmount': 'Introducir Importe',
    'panel.pos.exact': 'Exacto',
    'panel.pos.totalDue': 'Total',
    'panel.pos.emptyCartHint': 'Selecciona productos del catálogo para comenzar',
    'panel.pos.deleteHint': 'Tap: borrar · Doble-tap: limpiar',
    'panel.pos.cashPaymentTitle': 'Pago en efectivo',
    'panel.pos.cashPaymentHint': 'Pulse Confirmar para entrar el importe recibido',
    'panel.pos.cardTerminalTitle': 'Terminal de tarjeta',
    'panel.pos.cardTerminalHint': 'Presente la tarjeta o dispositivo en el terminal',
    'panel.pos.twintTitle': 'Pago con Twint',
    'panel.pos.twintHint': 'Se mostrará un código QR para el cliente',
    'panel.pos.manualCardTitle': 'Registro manual',
    'panel.pos.manualCardHint': 'Confirme que el pago con tarjeta ha sido procesado',

    // ── Receipt ──
    'panel.pos.receipt': 'Recibo',
    'panel.pos.newSale': 'Nueva Venta',
    'panel.pos.printReceipt': 'Imprimir',
    'panel.pos.emailReceipt': 'Enviar por email',
    'panel.pos.saleComplete': '¡Venta completada!',
    'panel.pos.orderNumber': 'Pedido #',
    'panel.pos.paymentMethod': 'Método de pago',
    'panel.pos.card': 'Tarjeta',
    'panel.pos.other': 'Otro',
    'panel.pos.customer': 'Cliente',
    'panel.pos.thankYou': '¡Gracias por su compra!',
    'panel.pos.nif': 'NIF',
    'panel.pos.tel': 'Tel',
    'panel.pos.order': 'Pedido',
    'panel.pos.payment': 'Pago',
    'panel.pos.refundBanner': '*** DEVOLUCIÓN ***',
    'panel.pos.ref': 'Ref',
    'panel.pos.reason': 'Motivo',
    'panel.pos.digitalVerification': 'Verificación digital',
    'panel.pos.digitalReceipt': 'Recibo digital',
    'panel.pos.invoice': 'Factura',
    'panel.pos.date': 'Fecha',
    'panel.pos.product': 'Producto',
    'panel.pos.qty': 'Cant.',
    'panel.pos.unitPrice': 'P. Unit.',

    // ── Settings drawer ──
    'panel.pos.settings': 'Configuración POS',
    'panel.pos.receiptHeaderLabel': 'Cabecera del recibo',
    'panel.pos.receiptFooterLabel': 'Pie del recibo',
    'panel.pos.receiptPreview': 'Vista previa del recibo',
    'panel.pos.defaultPaymentLabel': 'Método de pago predeterminado',
    'panel.pos.taxDisplayLabel': 'Mostrar impuestos',
    'panel.pos.tipsLabel': 'Propinas',
    'panel.pos.tipsPercentagesLabel': 'Porcentajes de propina',
    'panel.pos.soundLabel': 'Sonido',
    'panel.pos.soundEnabled': 'Activado',
    'panel.pos.soundDisabled': 'Desactivado',

    // ── History ──
    'panel.pos.history': 'Historial',
    'panel.pos.historySales': 'ventas',
    'panel.pos.noHistory': 'Sin ventas registradas',
    'panel.pos.refund': 'Reembolso',
    'panel.pos.viewDetails': 'Ver detalles',

    // ── Dashboard ──
    'panel.pos.dashboard': 'Dashboard',
    'panel.pos.todaySales': 'Ventas hoy',
    'panel.pos.todayRevenue': 'Facturación',
    'panel.pos.avgTicket': 'Ticket medio',
    'panel.pos.byMethod': 'Por método de pago',
    'panel.pos.topProducts': 'Top productos',

    // ── Shifts ──
    'panel.pos.shift': 'Turno',
    'panel.pos.openShift': 'Abrir turno',
    'panel.pos.closeShift': 'Cerrar turno',
    'panel.pos.currentShift': 'Turno actual',
    'panel.pos.openingCash': 'Caja inicial',
    'panel.pos.closingCash': 'Caja final',
    'panel.pos.expectedCash': 'Efectivo esperado',
    'panel.pos.difference': 'Diferencia',

    // ── Customer ──
    'panel.pos.addCustomer': 'Añadir cliente',
    'panel.pos.removeCustomer': 'Quitar cliente',
    'panel.pos.searchCustomer': 'Buscar cliente…',
    'panel.pos.walkIn': 'Cliente sin registro',
    'panel.pos.noCustomers': 'Sin resultados',
    'panel.pos.recentCustomers': 'Recientes',

    // ── Refund ──
    'panel.pos.refundTitle': 'Reembolso',
    'panel.pos.selectItems': 'Seleccionar artículos',
    'panel.pos.selectReason': 'Motivo del reembolso',
    'panel.pos.refundAmount': 'Importe a devolver',
    'panel.pos.confirmRefund': 'Confirmar reembolso',
    'panel.pos.refundComplete': 'Reembolso completado',
    'panel.pos.reason.damaged': 'Producto dañado',
    'panel.pos.reason.wrongItem': 'Producto equivocado',
    'panel.pos.reason.dissatisfied': 'Cliente insatisfecho',
    'panel.pos.reason.other': 'Otro motivo',

    // ── Discount ──
    'panel.pos.addDiscount': 'Añadir descuento',
    'panel.pos.removeDiscount': 'Quitar descuento',
    'panel.pos.percentage': 'Porcentaje',
    'panel.pos.fixedAmount': 'Importe fijo',

    // ── Status ──
    'panel.pos.online': 'Online',
    'panel.pos.offline': 'Offline',
    'panel.pos.pendingSync': 'Pendientes de sincronizar',
    'panel.pos.lastSync': 'Últ. sync',

    // ── Kiosk ──
    'panel.pos.kioskMode': 'Modo Kiosco',
    'panel.pos.exitKiosk': 'Salir del kiosco',

    // ── Variant picker ──
    'panel.pos.selectVariant': 'Seleccionar variante',
    'panel.pos.outOfStock': 'Sin stock',

    // ── Offline ──
    'panel.pos.offlineMode': 'Modo offline',
    'panel.pos.offlineDesc': 'Las ventas se guardarán localmente y se sincronizarán al recuperar conexión',
    'panel.pos.syncNow': 'Sincronizar ahora',

    // ── Refund (posLabel keys used by POSRefundModal) ──
    'panel.pos.refundDamaged': 'Producto dañado',
    'panel.pos.refundWrongItem': 'Producto equivocado',
    'panel.pos.refundDissatisfied': 'Cliente insatisfecho',
    'panel.pos.refundOther': 'Otro motivo',
    'panel.pos.refundReason': 'Motivo de la devolución',
    'panel.pos.fullRefund': 'Devolución total',
    'panel.pos.partialRefund': 'Devolución parcial',
    'panel.pos.continue': 'Continuar',
    'panel.pos.back': 'Volver',
    'panel.pos.confirm': 'Confirmar',
    'panel.pos.confirmRefundTitle': '¿Confirmar devolución?',
    'panel.pos.processRefund': 'Procesar devolución',
    'panel.pos.selectAll': 'Todo',
    'panel.pos.describeReason': 'Describe el motivo…',

    // ── Customer (posLabel keys used by POSCustomerModal) ──
    'panel.pos.selectCustomer': 'Seleccionar cliente',
    'panel.pos.nameEmailRequired': 'Nombre y email requeridos',
    'panel.pos.noCustomersFound': 'No se encontraron clientes',
    'panel.pos.recent': 'Recientes',
    'panel.pos.createNew': 'Crear nuevo',
    'panel.pos.newCustomer': 'Nuevo cliente',
    'panel.pos.firstName': 'Nombre',
    'panel.pos.lastName': 'Apellido',
    'panel.pos.creating': 'Creando…',
    'panel.pos.createAndSelect': 'Crear y seleccionar',

    // ── Payment overlay (posLabel keys) ──
    'panel.pos.terminalPayment': 'Pago con Terminal',
    'panel.pos.twintPayment': 'Pago con Twint',
    'panel.pos.paymentError': 'Error de pago',
    'panel.pos.qrExpired': 'QR expirado',
    'panel.pos.twintScanHint': 'Abra la app Twint y escanee',
    'panel.pos.staleCart': 'Algunos productos del carrito ya no existen. Se ha vaciado el carrito — añade los productos de nuevo.',

    // ── Shift panel extras ──
    'panel.pos.shiftActive': 'Turno activo',
    'panel.pos.noActiveShift': 'No hay turno activo',
    'panel.pos.openShiftHint': 'Abre un turno para comenzar a registrar ventas',
    'panel.pos.pastShifts': 'Turnos anteriores',
    'panel.pos.countCash': 'Cuenta el efectivo en caja',
    'panel.pos.closingCount': 'Cuenta el efectivo final en caja',
    'panel.pos.duration': 'Duración',
    'panel.pos.revenue': 'Ingresos',
    'panel.pos.opened': 'Apertura',
    'panel.pos.confirmClose': 'Cerrar turno',
    'panel.pos.exactMatch': 'Cuadra perfectamente',
    'panel.pos.cashOver': 'Sobrante',
    'panel.pos.cashUnder': 'Faltante',

    // ── Sales / History extras ──
    'panel.pos.salesHistory': 'Historial de ventas',
    'panel.pos.sales': 'ventas',
    'panel.pos.searchSales': 'Buscar venta…',
    'panel.pos.allMethods': 'Todos',
    'panel.pos.loading': 'Cargando…',
    'panel.pos.noSales': 'No hay ventas en este período',
    'panel.pos.today': 'Hoy',
    'panel.pos.yesterday': 'Ayer',
    'panel.pos.week': 'Semana',
    'panel.pos.month': 'Mes',

    // ── Parked sales extras ──
    'panel.pos.noParkedSales': 'No hay ventas en espera',
    'panel.pos.resume': 'Retomar',
    'panel.pos.delete': 'Eliminar',
    'panel.pos.clearAll': 'Eliminar todas las ventas en espera',
    'panel.pos.justNow': 'Ahora mismo',

    // ── Variant picker ──
    'panel.pos.variants': 'variantes',

    // ── Dashboard extras ──
    'panel.pos.daySummary': 'Resumen del día',
    'panel.pos.totalSales': 'Ventas',
    'panel.pos.cashSales': 'Efectivo',
    'panel.pos.byPaymentMethod': 'Por método de pago',
    'panel.pos.salesByHour': 'Ventas por hora',

    // ── Offline extras ──
    'panel.pos.syncing': 'Sincronizando ventas pendientes…',
    'panel.pos.syncError': 'Error de sincronización',
    'panel.pos.synced': 'Todo sincronizado',

    // ── Refund receipt extras ──
    'panel.pos.refundReceipt': 'Comprobante de devolución',
    'panel.pos.originalOrder': 'Pedido original',
    'panel.pos.close': 'Cerrar',

    // ── Phase 6: Split Payment ──
    'panel.pos.splitPayment': 'Pago dividido',
    'panel.pos.addMethod': 'Añadir método',
    'panel.pos.splitEvenly': 'Dividir igual',
    'panel.pos.fullyAllocated': '✓ Totalmente asignado',
    'panel.pos.overage': 'Excede el total',
    'panel.pos.remaining': 'Restante',
    'panel.pos.confirmSplit': 'Confirmar pago',

    // ── Phase 6: Loyalty Program ──
    'panel.pos.loyaltyCard': 'Tarjeta de fidelidad',
    'panel.pos.loyaltyProgram': 'Programa de fidelidad',
    'panel.pos.loyaltySubtitle': 'Sellos y recompensas',
    'panel.pos.stampCard': 'Tarjeta',
    'panel.pos.noCustomer': 'Sin cliente seleccionado',
    'panel.pos.selectCustomerLoyalty': 'Selecciona un cliente para ver su tarjeta de fidelidad',
    'panel.pos.rewardsRedeemed': 'recompensas canjeadas',
    'panel.pos.almostThere': '¡Casi!',
    'panel.pos.reward': 'Recompensa',
    'panel.pos.addStamp': 'Añadir sello',
    'panel.pos.stamped': '✓ Sellado',
    'panel.pos.redeemReward': '¡Canjear!',
    'panel.pos.rewardRedeemed': '¡Recompensa canjeada!',
    'panel.pos.noRedemptions': 'Sin canjes anteriores',
    'panel.pos.stampAdded': 'Sello añadido',

    // ── Phase 6: End-of-Day Report ──
    'panel.pos.endOfDayReport': 'Cierre del día',
    'panel.pos.summary': 'Resumen',
    'panel.pos.shifts': 'Turnos',
    'panel.pos.paymentBreakdown': 'Desglose por método',
    'panel.pos.peakHour': 'Hora punta',
    'panel.pos.exportCSV': 'Exportar CSV',
    'panel.pos.exportReport': 'Exportar CSV',
    'panel.pos.noShifts': 'Sin turnos registrados hoy',
    'panel.pos.cashVariance': 'Variación de caja',
    'panel.pos.expected': 'Esperado',
    'panel.pos.actual': 'Real',
    'panel.pos.open': 'Abierto',
    'panel.pos.closed': 'Cerrado',
    'panel.pos.bestDay': 'Mejor día',
    'panel.pos.worstDay': 'Día más bajo',
    'panel.pos.weekOverview': 'Semana',
    'panel.pos.weeklyTrend': 'Tendencia semanal',
    'panel.pos.previousDay': 'Día anterior',
    'panel.pos.nextDay': 'Día siguiente',
    'panel.pos.noData': 'No hay datos para esta semana',

    // ── Phase 6: Coupon Codes ──
    'panel.pos.enterCoupon': 'Código cupón',
    'panel.pos.apply': 'Aplicar',
    'panel.pos.invalidCoupon': 'Cupón no válido',
    'panel.pos.freeProduct': 'Producto gratis',

    // ── Phase 6: Recommendations ──
    'panel.pos.suggestions': 'Sugerencias',
    'panel.pos.boughtWith': 'Comprado con',
    'panel.pos.add': 'Añadir',
}

// ---------------------------------------------------------------------------
// Upsell tooltips per feature flag
// ---------------------------------------------------------------------------

const UPSELL_TOOLTIPS: Record<string, { tier: string; labelKey: string; label: string }> = {
    enable_pos_kiosk:               { tier: 'Pro', labelKey: 'panel.pos.upsell.kiosk', label: 'Modo Kiosco — Disponible en POS Pro' },
    enable_pos_keyboard_shortcuts:  { tier: 'Pro', labelKey: 'panel.pos.upsell.shortcuts', label: 'Atajos de teclado — Disponible en POS Pro' },
    enable_pos_quick_sale:          { tier: 'Pro', labelKey: 'panel.pos.upsell.quickSale', label: 'Venta rápida — Disponible en POS Pro' },
    enable_pos_offline_cart:        { tier: 'Pro', labelKey: 'panel.pos.upsell.offline', label: 'Carrito offline — Disponible en POS Pro' },
    enable_pos_shifts:              { tier: 'Pro', labelKey: 'panel.pos.upsell.shifts', label: 'Turnos de caja — Disponible en POS Pro' },
    enable_pos_thermal_printer:     { tier: 'Enterprise', labelKey: 'panel.pos.upsell.printer', label: 'Impresora térmica — Disponible en POS Enterprise' },
    enable_pos_line_discounts:      { tier: 'Enterprise', labelKey: 'panel.pos.upsell.discounts', label: 'Descuentos por línea — Disponible en POS Enterprise' },
    enable_pos_customer_search:     { tier: 'Enterprise', labelKey: 'panel.pos.upsell.customer', label: 'Búsqueda de clientes — Disponible en POS Enterprise' },
    enable_pos_multi_device:        { tier: 'Enterprise', labelKey: 'panel.pos.upsell.multiDevice', label: 'Multi-dispositivo — Disponible en POS Enterprise' },
    enable_pos_reports:             { tier: 'Enterprise', labelKey: 'panel.pos.upsell.reports', label: 'Dashboard & Analíticas — Disponible en POS Enterprise' },
}

/**
 * Get the upsell tooltip for a gated POS feature.
 * Returns the tooltip string (localized if possible, else fallback).
 */
export function getUpsellTooltip(
    flagName: string,
    labels?: Record<string, string>,
): string {
    const entry = UPSELL_TOOLTIPS[flagName]
    if (!entry) return ''
    return labels?.[entry.labelKey] || entry.label
}

/**
 * Get the tier name required for a gated POS feature.
 */
export function getRequiredTier(flagName: string): string {
    return UPSELL_TOOLTIPS[flagName]?.tier || 'Pro'
}

// ---------------------------------------------------------------------------
// Label resolver helper
// ---------------------------------------------------------------------------

/**
 * Resolve a label key against the i18n dictionary, with fallback to POS_DEFAULT_LABELS.
 */
export function posLabel(key: string, labels?: Record<string, string>): string {
    return labels?.[key] || POS_DEFAULT_LABELS[key] || key
}
