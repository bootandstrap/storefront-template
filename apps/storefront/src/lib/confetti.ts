'use client'

import confetti from 'canvas-confetti'

/**
 * Fire a celebration confetti burst — used for order confirmation.
 * Subtle, brand-colored, multi-burst effect.
 */
export function fireConfetti() {
    const colors = ['#2D5016', '#8BC34A', '#FF9800', '#4a8030']

    // Burst 1 — center
    confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors,
        disableForReducedMotion: true,
    })

    // Burst 2 — left side with delay
    setTimeout(() => {
        confetti({
            particleCount: 30,
            angle: 60,
            spread: 40,
            origin: { x: 0.1, y: 0.6 },
            colors,
            disableForReducedMotion: true,
        })
    }, 150)

    // Burst 3 — right side with delay
    setTimeout(() => {
        confetti({
            particleCount: 30,
            angle: 120,
            spread: 40,
            origin: { x: 0.9, y: 0.6 },
            colors,
            disableForReducedMotion: true,
        })
    }, 300)
}

/**
 * Fire a subtle success confetti for promo code applied.
 */
export function firePromoConfetti() {
    confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#8BC34A', '#FF9800'],
        scalar: 0.8,
        disableForReducedMotion: true,
    })
}
