import { describe, expect, it, vi } from 'vitest'

import { createPrinterConnectionController } from '../usePrinterConnection'
import type { PrintEngine, PrintEngineEvent } from '../print-engine'

function engineFake(serialAvailable: boolean) {
    let listener: ((event: PrintEngineEvent) => void) | undefined
    const unsubscribe = vi.fn(() => { listener = undefined })
    const engine = {
        getState: vi.fn(() => ({ status: 'disconnected', device: null, lastError: null })),
        isSerialAvailable: vi.fn(() => serialAvailable),
        connect: vi.fn().mockResolvedValue(serialAvailable),
        disconnect: vi.fn().mockResolvedValue(undefined),
        on: vi.fn((next) => { listener = next; return unsubscribe }),
        getVirtualPrinters: vi.fn(() => []),
        getVirtualPrintJobs: vi.fn(() => []),
        clearVirtualPrintJobs: vi.fn(),
        printReceipt: vi.fn(),
        printRefund: vi.fn(),
        openCashDrawer: vi.fn(),
        openVirtualCashDrawer: vi.fn(),
    } as unknown as PrintEngine
    return { engine, unsubscribe, emit: (event: PrintEngineEvent) => listener?.(event) }
}

describe('printer connection operational contract', () => {
    it('exposes unavailable without Web Serial and does not imply connection readiness', async () => {
        const fake = engineFake(false)
        const controller = createPrinterConnectionController(fake.engine)

        expect(controller.getSnapshot()).toMatchObject({ availability: 'unavailable', status: 'disconnected' })
        await expect(controller.connect()).resolves.toBe(false)
        expect(fake.engine.connect).not.toHaveBeenCalled()
        controller.dispose()
    })

    it('tracks engine events, delegates disconnect and releases its listener', async () => {
        const fake = engineFake(true)
        const controller = createPrinterConnectionController(fake.engine)
        fake.emit({ type: 'status-change', status: 'connected' })
        fake.emit({ type: 'print-error', error: 'paper out' })

        expect(controller.getSnapshot()).toMatchObject({
            availability: 'ready',
            status: 'connected',
            isPrinting: false,
            lastError: 'paper out',
        })

        await controller.disconnect()
        controller.dispose()
        expect(fake.engine.disconnect).toHaveBeenCalledOnce()
        expect(fake.unsubscribe).toHaveBeenCalledOnce()
    })
})
