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

import { useState, useEffect, useCallback } from 'react'
import {
    createPrintEngine,
    type PrintEngine,
    type PrinterStatus,
    type PrinterDevice,
    type PrintEngineEvent,
    type BusinessInfo,
    type PrintOptions,
} from '@/lib/pos/print-engine'
import {
    runPOSVirtualPrinterSelfTest,
    type POSVirtualPrinterSelfTestOptions,
    type POSVirtualPrinterSelfTestResult,
} from '@/lib/pos/virtual-printer-tools'
import type { VirtualPrintJob, VirtualPrinterProfile } from '@/lib/pos/virtual-printer'
import type { POSSale, POSRefund } from '@/lib/pos/pos-config'

// Re-export types for consumers
export type { BusinessInfo, PrintOptions }

// Singleton engine — shared across all hook instances
let engineSingleton: PrintEngine | null = null

function getEngine(): PrintEngine {
    if (!engineSingleton) {
        engineSingleton = createPrintEngine()
    }
    return engineSingleton
}

const printerEngine = getEngine()

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
    /** Virtual printer profiles available to POS tooling */
    virtualPrinters: VirtualPrinterProfile[]
    /** Captured virtual print jobs */
    virtualPrintJobs: VirtualPrintJob[]

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
    /** Record a virtual cash drawer pulse */
    openVirtualCashDrawer: (printerId?: string) => Promise<VirtualPrintJob>
    /** Run the POS virtual printer self-test */
    runVirtualPrinterSelfTest: (options?: POSVirtualPrinterSelfTestOptions) => Promise<POSVirtualPrinterSelfTestResult>
    /** Clear captured virtual print jobs */
    clearVirtualPrintJobs: () => void
}

export function usePrinterConnection(): UsePrinterConnectionReturn {
    const [status, setStatus] = useState<PrinterStatus>(() => printerEngine.getState().status)
    const [device, setDevice] = useState<PrinterDevice | null>(() => printerEngine.getState().device)
    const [lastError, setLastError] = useState<string | null>(() => printerEngine.getState().lastError)
    const [isPrinting, setIsPrinting] = useState(false)
    const [virtualPrintJobs, setVirtualPrintJobs] = useState<VirtualPrintJob[]>(() => printerEngine.getVirtualPrintJobs())
    const [virtualPrinters] = useState<VirtualPrinterProfile[]>(() => printerEngine.getVirtualPrinters())

    // Subscribe to engine events
    useEffect(() => {
        const unsubscribe = printerEngine.on((event: PrintEngineEvent) => {
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
                    setVirtualPrintJobs(printerEngine.getVirtualPrintJobs())
                    break
                case 'print-error':
                    setIsPrinting(false)
                    setLastError(event.error)
                    setVirtualPrintJobs(printerEngine.getVirtualPrintJobs())
                    break
            }
        })
        return unsubscribe
    }, [])

    const connect = useCallback(async () => {
        return printerEngine.connect()
    }, [])

    const disconnect = useCallback(async () => {
        return printerEngine.disconnect()
    }, [])

    const printReceipt = useCallback(async (sale: POSSale, business: BusinessInfo, options?: Partial<PrintOptions>) => {
        return printerEngine.printReceipt(sale, business, options)
    }, [])

    const printRefund = useCallback(async (refund: POSRefund, business: BusinessInfo, options?: Partial<PrintOptions>) => {
        return printerEngine.printRefund(refund, business, options)
    }, [])

    const openCashDrawer = useCallback(async () => {
        return printerEngine.openCashDrawer()
    }, [])

    const openVirtualCashDrawer = useCallback(async (printerId?: string) => {
        const job = await printerEngine.openVirtualCashDrawer(printerId)
        setVirtualPrintJobs(printerEngine.getVirtualPrintJobs())
        return job
    }, [])

    const runVirtualPrinterSelfTest = useCallback(async (options?: POSVirtualPrinterSelfTestOptions) => {
        const result = await runPOSVirtualPrinterSelfTest(printerEngine, options)
        setVirtualPrintJobs(printerEngine.getVirtualPrintJobs())
        return result
    }, [])

    const clearVirtualPrintJobs = useCallback(() => {
        printerEngine.clearVirtualPrintJobs()
        setVirtualPrintJobs([])
    }, [])

    return {
        status,
        device,
        lastError,
        isSerialAvailable: printerEngine.isSerialAvailable(),
        isPrinting,
        virtualPrinters,
        virtualPrintJobs,
        connect,
        disconnect,
        printReceipt,
        printRefund,
        openCashDrawer,
        openVirtualCashDrawer,
        runVirtualPrinterSelfTest,
        clearVirtualPrintJobs,
    }
}
