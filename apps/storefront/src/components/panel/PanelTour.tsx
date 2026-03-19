'use client'

/**
 * PanelTour — Lightweight spotlight-based guided tour of the Owner Panel
 *
 * Walks new owners through key panel sections using a floating tooltip
 * with spotlight overlay. Each step targets a sidebar nav item by
 * `data-tour-id` attribute.
 *
 * - Skippable at any point
 * - Progress saved to localStorage
 * - No external dependencies
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TourStep {
    targetId: string     // data-tour-id value on sidebar element
    title: string
    description: string
}

interface PanelTourProps {
    steps: TourStep[]
    onComplete: () => void
    t: (key: string) => string
    /** When true, skips localStorage guard and shows celebratory ending */
    isReplay?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanelTour({ steps, onComplete, t, isReplay = false }: PanelTourProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
    const [visible, setVisible] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    const step = steps[currentStep]
    const isLast = currentStep === steps.length - 1

    // Find and highlight the target element
    const updateSpotlight = useCallback(() => {
        if (!step) return
        const el = document.querySelector(`[data-tour-id="${step.targetId}"]`)
        if (el) {
            const rect = el.getBoundingClientRect()
            setSpotlightRect(rect)

            // Scroll element into view if needed (mobile sidebar)
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

            // Add highlight class
            el.classList.add('tour-highlight')
        }
    }, [step])

    // Setup spotlight on step change
    useEffect(() => {
        // Remove previous highlights
        document.querySelectorAll('.tour-highlight').forEach(el =>
            el.classList.remove('tour-highlight')
        )

        const raf = window.requestAnimationFrame(() => {
            updateSpotlight()
            setVisible(true)
        })

        // Cleanup
        return () => {
            window.cancelAnimationFrame(raf)
            document.querySelectorAll('.tour-highlight').forEach(el =>
                el.classList.remove('tour-highlight')
            )
        }
    }, [currentStep, updateSpotlight])

    // Handle resize
    useEffect(() => {
        const handleResize = () => updateSpotlight()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [updateSpotlight])

    const goNext = useCallback(() => {
        if (isLast) {
            // Show confetti burst before completing
            setShowConfetti(true)
            document.querySelectorAll('.tour-highlight').forEach(el =>
                el.classList.remove('tour-highlight')
            )
            setTimeout(() => onComplete(), 1800)
        } else {
            setVisible(false)
            setTimeout(() => setCurrentStep(s => s + 1), 200)
        }
    }, [isLast, onComplete])

    const goBack = useCallback(() => {
        if (currentStep > 0) {
            setVisible(false)
            setTimeout(() => setCurrentStep(s => s - 1), 200)
        }
    }, [currentStep])

    const handleSkip = useCallback(() => {
        document.querySelectorAll('.tour-highlight').forEach(el =>
            el.classList.remove('tour-highlight')
        )
        onComplete()
    }, [onComplete])

    // Calculate tooltip position (to the right of sidebar on desktop, below on mobile)
    const tooltipStyle: React.CSSProperties = spotlightRect
        ? {
            position: 'fixed',
            top: Math.max(8, Math.min(spotlightRect.top - 8, window.innerHeight - 200)),
            left: spotlightRect.right + 16,
            zIndex: 60,
        }
        : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 60 }

    // On mobile, position below the topbar
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (isMobile && spotlightRect) {
        tooltipStyle.top = 72
        tooltipStyle.left = 16
        tooltipStyle.right = 16
        delete tooltipStyle.transform
    }

    return (
        <>
            {/* Semi-transparent overlay */}
            <div
                className="fixed inset-0 z-[55] pointer-events-none"
                style={{
                    background: spotlightRect
                        ? `radial-gradient(ellipse 200px 100px at ${spotlightRect.left + spotlightRect.width / 2}px ${spotlightRect.top + spotlightRect.height / 2}px, transparent 60%, rgba(0,0,0,0.5) 100%)`
                        : 'rgba(0,0,0,0.4)',
                }}
            />

            {/* Tooltip */}
            <div
                ref={tooltipRef}
                style={tooltipStyle}
                className={`w-72 bg-surface-1 rounded-xl shadow-2xl border border-surface-3 overflow-hidden transition-all duration-300 pointer-events-auto ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                    }`}
            >
                {/* Step counter + skip */}
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <span className="text-xs text-text-muted font-medium">
                        {currentStep + 1} {t('tour.of') || 'of'} {steps.length}
                    </span>
                    <button
                        type="button"
                        onClick={handleSkip}
                        className="text-text-muted/50 hover:text-text-muted transition-colors"
                        aria-label={t('tour.skip') || 'Skip tour'}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                    <h3 className="text-sm font-bold text-text-primary mb-1">
                        {step?.title}
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                        {step?.description}
                    </p>
                </div>

                {/* Progress bar */}
                <div className="h-0.5 bg-surface-3">
                    <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2/50">
                    <button
                        type="button"
                        onClick={goBack}
                        disabled={currentStep === 0}
                        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-3 h-3" />
                        {t('tour.prev') || 'Back'}
                    </button>

                    <button
                        type="button"
                        onClick={goNext}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                    >
                        {isLast ? (t('tour.finish') || 'Got it!') : (t('tour.next') || 'Next')}
                        {!isLast && <ChevronRight className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            {/* Inject tour styles */}
            <style>{`
                .tour-highlight {
                    position: relative;
                    z-index: 56;
                    box-shadow: 0 0 0 4px var(--color-primary, #6366f1),
                                0 0 20px rgba(99, 102, 241, 0.3);
                    border-radius: 12px;
                    transition: box-shadow 0.3s ease;
                }
            `}</style>

            {/* Confetti burst on completion */}
            {showConfetti && (
                <div className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center">
                    <div className="text-center animate-fade-in">
                        <p className="text-4xl mb-2">🎉</p>
                        <p className="text-lg font-bold text-text-primary">
                            {isReplay
                                ? (t('tour.replayDone') || 'Tour revisited!')
                                : (t('tour.congrats') || 'Tour complete!')}
                        </p>
                    </div>
                    {/* 24 confetti particles */}
                    {Array.from({ length: 24 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 rounded-full animate-confetti"
                            style={{
                                backgroundColor: ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4'][i % 6],
                                left: `${(i * 17 + 5) % 100}%`,
                                animationDelay: `${i * 80}ms`,
                            }}
                        />
                    ))}
                </div>
            )}
        </>
    )
}
