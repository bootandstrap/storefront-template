/**
 * POS Spring Presets — Consistent Framer Motion physics across all POS animations
 *
 * Based on industry best practices for touch-first retail UIs:
 * - snappy: buttons, toggles, active states
 * - bouncy: badges, notifications, success feedback
 * - gentle: panels, overlays, step transitions
 * - layout: list reorder, item add/remove
 *
 * @module pos/hooks/pos-springs
 */

export const POS_SPRINGS = {
    /** Buttons, toggles, active states — fast settle */
    snappy: { type: 'spring', stiffness: 500, damping: 30 } as const,
    /** Badges, notifications, success feedback — playful overshoot */
    bouncy: { type: 'spring', stiffness: 300, damping: 15 } as const,
    /** Panels, overlays, step transitions — smooth and deliberate */
    gentle: { type: 'spring', stiffness: 200, damping: 25 } as const,
    /** List reorder, item add/remove — balanced */
    layout: { type: 'spring', stiffness: 350, damping: 35 } as const,
} as const

/** Standardized animation durations for non-spring animations */
export const POS_DURATIONS = {
    fast: 0.15,
    normal: 0.2,
    slow: 0.35,
} as const

/** Standardized easing curves */
export const POS_EASINGS = {
    /** Apple-style deceleration */
    smooth: [0.22, 1, 0.36, 1] as const,
    /** Snappy exit */
    exit: [0.4, 0, 1, 1] as const,
} as const
