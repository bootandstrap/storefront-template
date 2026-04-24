'use client'

/**
 * PanelTourDriver — Modern tour system using driver.js
 *
 * Replaces the old PanelTour that used ugly box-shadow spotlights.
 * driver.js provides proper element cutout spotlights with smooth
 * animated transitions between steps.
 *
 * Usage:
 *   <PanelTourDriver
 *     steps={[...]}
 *     onComplete={() => {}}
 *     t={(key) => translations[key]}
 *   />
 *
 * Elements are targeted via `data-tour-id` attributes (same as before).
 */

import { useEffect, useRef, useCallback } from 'react'
import { driver, type DriveStep, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { completeTourAction } from '@/app/[lang]/(panel)/panel/actions'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TourStep {
    targetId: string
    title: string
    description: string
}

interface PanelTourDriverProps {
    steps: TourStep[]
    onComplete: () => void
    t: (key: string) => string
    isReplay?: boolean
}

// ---------------------------------------------------------------------------
// Custom CSS overrides for driver.js to match our brand
// ---------------------------------------------------------------------------

const DRIVER_CSS = `
.driver-popover {
    background: var(--sf-1, #1a1a2e) !important;
    border: 1px solid var(--sf-3, #2a2a4a) !important;
    border-radius: 16px !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
    padding: 20px !important;
    max-width: 320px !important;
    color: var(--tx, #e4e4e7) !important;
}

.driver-popover .driver-popover-title {
    font-family: var(--font-display), system-ui, sans-serif !important;
    font-size: 16px !important;
    font-weight: 700 !important;
    color: var(--tx, #e4e4e7) !important;
    margin-bottom: 6px !important;
}

.driver-popover .driver-popover-description {
    font-size: 13px !important;
    line-height: 1.5 !important;
    color: var(--tx-muted, #a1a1aa) !important;
}

.driver-popover .driver-popover-progress-text {
    font-size: 11px !important;
    color: var(--tx-faint, #71717a) !important;
}

.driver-popover .driver-popover-footer {
    margin-top: 16px !important;
    gap: 8px !important;
}

.driver-popover .driver-popover-prev-btn {
    background: transparent !important;
    border: 1px solid var(--sf-3, #2a2a4a) !important;
    color: var(--tx-muted, #a1a1aa) !important;
    border-radius: 10px !important;
    padding: 8px 14px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    transition: all 0.2s !important;
}

.driver-popover .driver-popover-prev-btn:hover {
    background: var(--sf-2, #1e1e3a) !important;
    color: var(--tx, #e4e4e7) !important;
}

.driver-popover .driver-popover-next-btn,
.driver-popover .driver-popover-close-btn-inside {
    background: var(--brand, #2D5016) !important;
    color: white !important;
    border-radius: 10px !important;
    padding: 8px 14px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    border: none !important;
    transition: all 0.2s !important;
}

.driver-popover .driver-popover-next-btn:hover {
    opacity: 0.9 !important;
    transform: scale(1.02) !important;
}

.driver-popover-arrow {
    border-color: var(--sf-1, #1a1a2e) !important;
}

.driver-popover .driver-popover-close-btn {
    color: var(--tx-faint, #71717a) !important;
    width: 28px !important;
    height: 28px !important;
}

.driver-popover .driver-popover-close-btn:hover {
    color: var(--tx, #e4e4e7) !important;
}

/* Overlay color */
.driver-overlay {
    background: rgba(0, 0, 0, 0.65) !important;
}
`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanelTourDriver({
    steps,
    onComplete,
    t,
    isReplay = false,
}: PanelTourDriverProps) {
    const driverRef = useRef<Driver | null>(null)
    const styleRef = useRef<HTMLStyleElement | null>(null)

    const handleComplete = useCallback(async () => {
        // Remove custom styles
        if (styleRef.current) {
            styleRef.current.remove()
            styleRef.current = null
        }

        if (!isReplay) {
            try {
                await completeTourAction()
            } catch (err) {
                logger.warn('[PanelTourDriver] Tour completion save failed:', err)
            }
            try {
                localStorage.setItem('bns-tour-done', '1')
            } catch { /* noop */ }
        }

        onComplete()
    }, [isReplay, onComplete])

    useEffect(() => {
        // Inject custom CSS
        const style = document.createElement('style')
        style.textContent = DRIVER_CSS
        document.head.appendChild(style)
        styleRef.current = style

        // Build driver steps
        const driveSteps: DriveStep[] = []
        for (const step of steps) {
            const el = document.querySelector(`[data-tour-id="${step.targetId}"]`)
            if (!el) continue
            driveSteps.push({
                element: `[data-tour-id="${step.targetId}"]`,
                popover: {
                    title: step.title,
                    description: step.description,
                },
            })
        }

        if (driveSteps.length === 0) {
            handleComplete()
            return
        }

        // Initialize driver
        const driverObj = driver({
            showProgress: true,
            animate: true,
            smoothScroll: true,
            stagePadding: 8,
            stageRadius: 12,
            allowClose: true,
            overlayOpacity: 0.65,
            popoverOffset: 12,
            progressText: `{{current}} ${t('tour.of') || 'de'} {{total}}`,
            nextBtnText: t('tour.next') || 'Siguiente',
            prevBtnText: t('tour.prev') || 'Atrás',
            doneBtnText: isReplay
                ? (t('tour.replayDone') || '¡Revisitado!')
                : (t('tour.finish') || '¡Entendido!'),
            steps: driveSteps,
            onDestroyStarted: () => {
                // Called when driver is about to be destroyed (close, finish, etc.)
                handleComplete()
            },
        })

        driverRef.current = driverObj

        // Small delay to ensure DOM is ready after any layout shifts
        const timer = setTimeout(() => {
            driverObj.drive()
        }, 200)

        return () => {
            clearTimeout(timer)
            if (driverRef.current) {
                try {
                    driverRef.current.destroy()
                } catch { /* noop */ }
                driverRef.current = null
            }
            if (styleRef.current) {
                styleRef.current.remove()
                styleRef.current = null
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Only run on mount

    return null // driver.js manages its own DOM
}
