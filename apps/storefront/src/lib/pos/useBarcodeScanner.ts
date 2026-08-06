/**
 * POS Barcode Scanner Hook
 *
 * Strategy:
 * 1. Primary: keyboard wedge (most USB scanners emulate keyboard input)
 * 2. The hook listens for rapid keypress sequences (< 50ms between chars)
 *    which distinguishes scanner input from human typing.
 *
 * This approach works with 99% of USB barcode scanners without
 * requiring WebHID permissions — truly zero-config.
 */
'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseBarcodeOptions {
    /** Called when a barcode is successfully scanned */
    onScan: (barcode: string) => void
    /** Minimum barcode length to accept (default: 4) */
    minLength?: number
    /** Max time between keystrokes in ms (default: 50) */
    maxKeyInterval?: number
    /** Whether scanning is enabled (default: true) */
    enabled?: boolean
}

interface BarcodeEventTarget {
    addEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void, options?: AddEventListenerOptions): void
    removeEventListener(type: 'keydown', listener: (event: KeyboardEvent) => void, options?: EventListenerOptions): void
}

export interface BarcodeScannerControllerOptions extends UseBarcodeOptions {
    eventTarget?: BarcodeEventTarget | null
}

export interface BarcodeScannerController {
    availability: 'ready' | 'unavailable'
    manualScan(barcode: string): void
    dispose(): void
}

export function createBarcodeScannerController({
    onScan,
    minLength = 4,
    maxKeyInterval = 50,
    enabled = true,
    eventTarget = typeof window === 'undefined' ? null : window,
}: BarcodeScannerControllerOptions): BarcodeScannerController {
    let buffer = ''
    let lastKeyTime = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const clearTimer = () => {
        if (timer !== null) clearTimeout(timer)
        timer = null
    }
    const processBuffer = () => {
        timer = null
        if (disposed) return
        const barcode = buffer.trim()
        buffer = ''
        if (barcode.length >= minLength) onScan(barcode)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
        const element = event.target as HTMLElement | null
        const tag = element?.tagName?.toLowerCase()
        if ((tag === 'input' || tag === 'textarea') && element?.dataset?.posSearch !== 'true') return

        const now = Date.now()
        if (now - lastKeyTime > maxKeyInterval && buffer.length > 0) buffer = ''
        lastKeyTime = now

        if (event.key === 'Enter' && buffer.length >= minLength) {
            event.preventDefault()
            event.stopPropagation()
            clearTimer()
            processBuffer()
            return
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            buffer += event.key
            clearTimer()
            timer = setTimeout(processBuffer, 100)
        }
    }

    if (enabled && eventTarget) eventTarget.addEventListener('keydown', handleKeyDown, { capture: true })

    return {
        availability: enabled && eventTarget ? 'ready' : 'unavailable',
        manualScan(barcode) {
            const normalized = barcode.trim()
            if (!disposed && normalized.length >= minLength) onScan(normalized)
        },
        dispose() {
            if (disposed) return
            disposed = true
            buffer = ''
            clearTimer()
            if (enabled && eventTarget) eventTarget.removeEventListener('keydown', handleKeyDown, { capture: true })
        },
    }
}

export function useBarcodeScanner({
    onScan,
    minLength = 4,
    maxKeyInterval = 50,
    enabled = true,
}: UseBarcodeOptions) {
    const controllerRef = useRef<BarcodeScannerController | null>(null)

    useEffect(() => {
        const controller = createBarcodeScannerController({ onScan, minLength, maxKeyInterval, enabled })
        controllerRef.current = controller
        return () => {
            controller.dispose()
            if (controllerRef.current === controller) controllerRef.current = null
        }
    }, [enabled, maxKeyInterval, minLength, onScan])

    /** Manual barcode input (e.g., typed into the search bar) */
    const manualScan = useCallback((barcode: string) => {
        const controller = controllerRef.current
        if (controller) controller.manualScan(barcode)
        else {
            const normalized = barcode.trim()
            if (normalized.length >= minLength) onScan(normalized)
        }
    }, [onScan, minLength])

    return { manualScan }
}
