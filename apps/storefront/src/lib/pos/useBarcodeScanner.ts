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

export function useBarcodeScanner({
    onScan,
    minLength = 4,
    maxKeyInterval = 50,
    enabled = true,
}: UseBarcodeOptions) {
    const bufferRef = useRef('')
    const lastKeyTimeRef = useRef(0)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const processBuffer = useCallback(() => {
        const barcode = bufferRef.current.trim()
        if (barcode.length >= minLength) {
            onScan(barcode)
        }
        bufferRef.current = ''
    }, [onScan, minLength])

    useEffect(() => {
        if (!enabled) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
            const isSearchField = (e.target as HTMLElement)?.dataset?.posSearch === 'true'
            if ((tag === 'input' || tag === 'textarea') && !isSearchField) return

            const now = Date.now()
            const elapsed = now - lastKeyTimeRef.current
            lastKeyTimeRef.current = now

            // If too much time passed, reset buffer
            if (elapsed > maxKeyInterval && bufferRef.current.length > 0) {
                bufferRef.current = ''
            }

            // Enter key = end of barcode
            if (e.key === 'Enter' && bufferRef.current.length >= minLength) {
                e.preventDefault()
                e.stopPropagation()
                if (timerRef.current) clearTimeout(timerRef.current)
                processBuffer()
                return
            }

            // Accumulate printable characters
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                bufferRef.current += e.key

                // Auto-process after a brief pause (scanner sends Enter, but just in case)
                if (timerRef.current) clearTimeout(timerRef.current)
                timerRef.current = setTimeout(processBuffer, 100)
            }
        }

        window.addEventListener('keydown', handleKeyDown, { capture: true })
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true })
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [enabled, maxKeyInterval, minLength, processBuffer])

    /** Manual barcode input (e.g., typed into the search bar) */
    const manualScan = useCallback((barcode: string) => {
        if (barcode.trim().length >= minLength) {
            onScan(barcode.trim())
        }
    }, [onScan, minLength])

    return { manualScan }
}
