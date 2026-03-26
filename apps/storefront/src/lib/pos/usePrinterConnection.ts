'use client'

/**
 * usePrinterConnection — React hook for managing thermal printer state
 *
 * Wraps the print-engine singleton and provides reactive state for:
 * - Connection status (disconnected → connecting → connected → error)
 * - Device info (vendorId, productId)
 * - Print actions (printReceipt, printRefund, openCashDrawer)
 *
 * Usage:
 *   const { status, device, connect, disconnect, printReceipt } = usePrinterConnection()
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    createPrintEngine,
    type PrintEngine,
    type PrinterStatus,
    type PrinterDevice,
    type PrintEngineEvent,
    type BusinessInfo,
    type PrintOptions,
} from '@/lib/pos/print-engine'
import type { POSSale, POSRefund } from '@/lib/pos/pos-config'

// Singleton engine — shared across all hook instances
let engineSingleton: PrintEngine | null = null

function getEngine(): PrintEngine {
    if (!engineSingleton) {
        engineSingleton = createPrintEngine()
    }
    return engineSingleton
}

export interface UsePrinterConnectionReturn {
    /** Current connection status */
    status: PrinterStatus
    /** Connected device info (null if disconnected) */
    device: PrinterDevice | null
    /** Last error message */
    lastError: string | null
    /** Whether Web Serial API is available */
    isSerialAvailable: boolean
    /** Whether a print job is in progress */
    isPrinting: boolean

    /** Prompt user to select & connect a printer */
    connect: () => Promise<boolean>
    /** Disconnect current printer */
    disconnect: () => Promise<void>
    /** Print sale receipt via thermal printer */
    printReceipt: (sale: POSSale, business: BusinessInfo, options?: Partial<PrintOptions>) => Promise<void>
    /** Print refund receipt via thermal printer */
    printRefund: (refund: POSRefund, business: BusinessInfo, options?: Partial<PrintOptions>) => Promise<void>
    /** Open cash drawer */
    openCashDrawer: () => Promise<void>
}

export function usePrinterConnection(): UsePrinterConnectionReturn {
    const engine = useRef(getEngine())
    const [status, setStatus] = useState<PrinterStatus>(() => engine.current.getState().status)
    const [device, setDevice] = useState<PrinterDevice | null>(() => engine.current.getState().device)
    const [lastError, setLastError] = useState<string | null>(() => engine.current.getState().lastError)
    const [isPrinting, setIsPrinting] = useState(false)

    // Subscribe to engine events
    useEffect(() => {
        const unsubscribe = engine.current.on((event: PrintEngineEvent) => {
            switch (event.type) {
                case 'status-change':
                    setStatus(event.status)
                    break
                case 'connected':
                    setDevice(event.device)
                    setLastError(null)
                    break
                case 'disconnected':
                    setDevice(null)
                    break
                case 'print-start':
                    setIsPrinting(true)
                    break
                case 'print-complete':
                    setIsPrinting(false)
                    break
                case 'print-error':
                    setIsPrinting(false)
                    setLastError(event.error)
                    break
            }
        })
        return unsubscribe
    }, [])

    const connect = useCallback(async () => {
        return engine.current.connect()
    }, [])

    const disconnect = useCallback(async () => {
        return engine.current.disconnect()
    }, [])

    const printReceipt = useCallback(async (sale: POSSale, business: BusinessInfo, options?: Partial<PrintOptions>) => {
        return engine.current.printReceipt(sale, business, options)
    }, [])

    const printRefund = useCallback(async (refund: POSRefund, business: BusinessInfo, options?: Partial<PrintOptions>) => {
        return engine.current.printRefund(refund, business, options)
    }, [])

    const openCashDrawer = useCallback(async () => {
        return engine.current.openCashDrawer()
    }, [])

    return {
        status,
        device,
        lastError,
        isSerialAvailable: engine.current.isSerialAvailable(),
        isPrinting,
        connect,
        disconnect,
        printReceipt,
        printRefund,
        openCashDrawer,
    }
}
