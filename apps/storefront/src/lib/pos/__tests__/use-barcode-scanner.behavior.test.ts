import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createBarcodeScannerController } from '../useBarcodeScanner'

function key(key: string, overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
    return {
        key,
        target: { tagName: 'DIV', dataset: {} },
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...overrides,
    } as unknown as KeyboardEvent
}

describe('barcode scanner operational contract', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-08-06T10:00:00.000Z'))
    })

    afterEach(() => vi.useRealTimers())

    it('frames rapid keys and removes listener and timer on dispose', () => {
        let listener: ((event: KeyboardEvent) => void) | undefined
        const target = {
            addEventListener: vi.fn((_type, next) => { listener = next as (event: KeyboardEvent) => void }),
            removeEventListener: vi.fn((_type, next) => {
                if (listener === next) listener = undefined
            }),
        }
        const onScan = vi.fn()
        const controller = createBarcodeScannerController({ onScan, eventTarget: target })

        for (const value of ['1', '2', '3', '4']) listener?.(key(value))
        expect(vi.getTimerCount()).toBe(1)

        controller.dispose()
        vi.advanceTimersByTime(200)

        expect(onScan).not.toHaveBeenCalled()
        expect(target.removeEventListener).toHaveBeenCalledOnce()
        expect(vi.getTimerCount()).toBe(0)
    })

    it('accepts scanner Enter but ignores ordinary form typing', () => {
        let listener: ((event: KeyboardEvent) => void) | undefined
        const target = {
            addEventListener: vi.fn((_type, next) => { listener = next as (event: KeyboardEvent) => void }),
            removeEventListener: vi.fn(),
        }
        const onScan = vi.fn()
        const controller = createBarcodeScannerController({ onScan, eventTarget: target })

        listener?.(key('9', { target: { tagName: 'INPUT', dataset: {} } as HTMLElement }))
        for (const value of ['A', 'B', 'C', 'D']) listener?.(key(value))
        const enter = key('Enter')
        listener?.(enter)

        expect(onScan).toHaveBeenCalledWith('ABCD')
        expect(enter.preventDefault).toHaveBeenCalledOnce()
        controller.dispose()
    })

    it('is explicitly unavailable without browser event APIs while manual scan stays bounded', () => {
        const onScan = vi.fn()
        const controller = createBarcodeScannerController({ onScan, eventTarget: null })

        expect(controller.availability).toBe('unavailable')
        controller.manualScan(' abc ')
        controller.manualScan(' 1234 ')

        expect(onScan).toHaveBeenCalledTimes(1)
        expect(onScan).toHaveBeenCalledWith('1234')
    })
})
