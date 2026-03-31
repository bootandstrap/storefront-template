'use client'

/**
 * POSPrinterSettings — Printer connection & configuration panel
 *
 * Slide-out panel shown from the POS topbar that lets owners:
 * - Connect/disconnect a thermal printer via Web Serial
 * - See connection status + device info
 * - Configure paper width (80mm / 58mm)
 * - Test print + cash drawer
 * - Toggle auto-print on sale completion
 */

import { useState, useCallback } from 'react'
import {
    Printer,
    Wifi,
    WifiOff,
    X,
    Loader2,
    CheckCircle,
    AlertCircle,
    Zap,
    Receipt,
    Settings2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePrinterConnection } from '@/lib/pos/usePrinterConnection'
import { posLabel } from '@/lib/pos/pos-i18n'

type PaperWidth = '80mm' | '58mm'

interface POSPrinterSettingsProps {
    isOpen: boolean
    onClose: () => void
    labels: Record<string, string>
}

function getPaperWidth(): PaperWidth {
    if (typeof window === 'undefined') return '80mm'
    return (localStorage.getItem('pos-paper-width') as PaperWidth) || '80mm'
}

function getAutoPrint(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('pos-auto-print') === 'true'
}

export default function POSPrinterSettings({ isOpen, onClose, labels }: POSPrinterSettingsProps) {
    const {
        status,
        device,
        lastError,
        isSerialAvailable,
        isPrinting,
        connect,
        disconnect,
        openCashDrawer,
    } = usePrinterConnection()

    const [paperWidth, setPaperWidth] = useState<PaperWidth>(getPaperWidth)
    const [autoPrint, setAutoPrint] = useState(getAutoPrint)
    const [testPrinting, setTestPrinting] = useState(false)

    const handlePaperWidth = useCallback((w: PaperWidth) => {
        setPaperWidth(w)
        localStorage.setItem('pos-paper-width', w)
    }, [])

    const handleAutoPrint = useCallback((v: boolean) => {
        setAutoPrint(v)
        localStorage.setItem('pos-auto-print', String(v))
    }, [])

    const handleTestPrint = useCallback(async () => {
        setTestPrinting(true)
        try {
            // Import engine directly for test print
            const { createPrintEngine } = await import('@/lib/pos/print-engine')
            const engine = createPrintEngine()
            const testSale = {
                items: [
                    { id: 'test-1', product_id: 'test', title: 'Test Item', variant_title: '', quantity: 2, unit_price: 1500, thumbnail: null, sku: 'TST-001', currency_code: 'EUR' },
                    { id: 'test-2', product_id: 'test', title: 'Another Item', variant_title: '', quantity: 1, unit_price: 2000, thumbnail: null, sku: 'TST-002', currency_code: 'EUR' },
                ],
                discount: null,
                customer_id: null,
                customer_name: 'Test Customer',
                payment_method: 'cash' as const,
                subtotal: 5000,
                discount_amount: 0,
                tax_amount: 1050,
                total: 6050,
                currency_code: 'EUR',
                created_at: new Date().toISOString(),
                order_id: null,
                draft_order_id: 'test-receipt-000001',
            }

            await engine.printReceipt(testSale, {
                name: 'Test Store',
                address: 'Calle de Prueba 1, Madrid',
                nif: 'B12345678',
                phone: '+34 600 000 000',
            }, { paperWidth, mode: 'thermal' })
        } catch {
            // error handled by engine events
        } finally {
            setTestPrinting(false)
        }
    }, [paperWidth])

    const statusIcon = {
        disconnected: <WifiOff className="w-4 h-4 text-tx-muted" />,
        connecting: <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />,
        connected: <CheckCircle className="w-4 h-4 text-emerald-500" />,
        error: <AlertCircle className="w-4 h-4 text-rose-500" />,
    }

    const statusLabel = {
        disconnected: labels['panel.pos.printerDisconnected'] || 'Desconectada',
        connecting: labels['panel.pos.printerConnecting'] || 'Conectando...',
        connected: labels['panel.pos.printerConnected'] || 'Conectada',
        error: labels['panel.pos.printerError'] || 'Error',
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-sf-0 shadow-2xl overflow-y-auto"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-sf-2">
                            <div className="flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-tx-sec" />
                                <h2 className="text-base font-bold text-tx">
                                    {labels['panel.pos.printerSettings'] || 'Impresora térmica'}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sf-1 text-tx-muted transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            {/* ── Connection status ── */}
                            <section>
                                <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-wider mb-3">
                                    {labels['panel.pos.connection'] || 'Conexión'}
                                </h3>

                                <div className="bg-sf-1 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {statusIcon[status]}
                                            <span className="text-sm font-medium text-tx">
                                                {statusLabel[status]}
                                            </span>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${
                                            status === 'connected' ? 'bg-emerald-500' :
                                            status === 'connecting' ? 'bg-amber-500 animate-pulse' :
                                            status === 'error' ? 'bg-rose-500' :
                                            'bg-sf-3'
                                        }`} />
                                    </div>

                                    {device && (
                                        <div className="text-xs text-tx-muted bg-sf-0 rounded-lg px-3 py-2">
                                            <span className="font-mono">{device.name}</span>
                                            <br />
                                            VID: {device.vendorId || '—'} · PID: {device.productId || '—'}
                                        </div>
                                    )}

                                    {lastError && (
                                        <div className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
                                            {lastError}
                                        </div>
                                    )}

                                    {!isSerialAvailable && (
                                        <div className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                                            {labels['panel.pos.serialNotSupported'] || 'Web Serial no disponible. Usa Chrome o Edge.'}
                                        </div>
                                    )}

                                    {status === 'connected' ? (
                                        <button
                                            onClick={disconnect}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                                                       border border-rose-200 text-rose-600 text-sm font-medium
                                                       hover:bg-rose-50 transition-colors min-h-[44px]"
                                        >
                                            <WifiOff className="w-4 h-4" />
                                            {labels['panel.pos.disconnect'] || 'Desconectar'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={connect}
                                            disabled={!isSerialAvailable || status === 'connecting'}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                                                       bg-brand text-white text-sm font-medium
                                                       hover:bg-brand-dark transition-colors min-h-[44px]
                                                       disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {status === 'connecting' ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Wifi className="w-4 h-4" />
                                            )}
                                            {labels['panel.pos.connectPrinter'] || 'Conectar impresora'}
                                        </button>
                                    )}
                                </div>
                            </section>

                            {/* ── Paper width ── */}
                            <section>
                                <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-wider mb-3">
                                    {labels['panel.pos.paperWidth'] || 'Ancho de papel'}
                                </h3>
                                <div className="flex gap-2">
                                    {(['80mm', '58mm'] as const).map((w) => (
                                        <button
                                            key={w}
                                            onClick={() => handlePaperWidth(w)}
                                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border min-h-[44px] ${
                                                paperWidth === w
                                                    ? 'bg-brand-subtle text-brand border-brand'
                                                    : 'text-tx-muted hover:bg-sf-1 border-sf-3'
                                            }`}
                                        >
                                            {w}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* ── Auto-print toggle ── */}
                            <section>
                                <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-wider mb-3">
                                    {labels['panel.pos.autoPrint'] || 'Impresión automática'}
                                </h3>
                                <button
                                    onClick={() => handleAutoPrint(!autoPrint)}
                                    className="w-full flex items-center justify-between bg-sf-1 rounded-xl px-4 py-3 min-h-[44px]"
                                >
                                    <span className="text-sm text-tx">
                                        {labels['panel.pos.autoPrintDescription'] || 'Imprimir ticket al completar venta'}
                                    </span>
                                    <div className={`w-10 h-6 rounded-full transition-colors relative ${
                                        autoPrint ? 'bg-brand' : 'bg-sf-3'
                                    }`}>
                                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                            autoPrint ? 'translate-x-[18px]' : 'translate-x-0.5'
                                        }`} />
                                    </div>
                                </button>
                            </section>

                            {/* ── Actions ── */}
                            {status === 'connected' && (
                                <section>
                                    <h3 className="text-xs font-semibold text-tx-muted uppercase tracking-wider mb-3">
                                        {labels['panel.pos.actions'] || 'Acciones'}
                                    </h3>
                                    <div className="space-y-2">
                                        <button
                                            onClick={handleTestPrint}
                                            disabled={testPrinting || isPrinting}
                                            className="w-full flex items-center gap-3 bg-sf-1 hover:bg-sf-2 rounded-xl px-4 py-3 min-h-[44px]
                                                       text-sm text-tx transition-colors disabled:opacity-40"
                                        >
                                            {testPrinting ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-brand" />
                                            ) : (
                                                <Receipt className="w-4 h-4 text-tx-muted" />
                                            )}
                                            {labels['panel.pos.testPrint'] || 'Imprimir ticket de prueba'}
                                        </button>
                                        <button
                                            onClick={openCashDrawer}
                                            className="w-full flex items-center gap-3 bg-sf-1 hover:bg-sf-2 rounded-xl px-4 py-3 min-h-[44px]
                                                       text-sm text-tx transition-colors"
                                        >
                                            <Zap className="w-4 h-4 text-tx-muted" />
                                            {labels['panel.pos.openCashDrawer'] || 'Abrir cajón de dinero'}
                                        </button>
                                    </div>
                                </section>
                            )}

                            {/* ── Help ── */}
                            <section className="border-t border-sf-2 pt-4">
                                <div className="text-xs text-tx-muted space-y-1">
                                    <p className="font-medium">{labels['panel.pos.printerHelp'] || 'Compatibilidad'}</p>
                                    <p>• {labels['panel.pos.printerHelpBrowser'] || 'Requiere Chrome 89+ o Edge 89+'}</p>
                                    <p>• {labels['panel.pos.printerHelpUSB'] || 'Conecta la impresora por USB'}</p>
                                    <p>• {labels['panel.pos.printerHelpProtocol'] || 'Compatible con ESC/POS (Epson, Star, etc.)'}</p>
                                </div>
                            </section>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
