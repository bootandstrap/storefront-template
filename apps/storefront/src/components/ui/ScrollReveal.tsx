'use client'

import { useRef, useEffect, type ReactNode } from 'react'

interface ScrollRevealProps {
    children: ReactNode
    className?: string
    delay?: number
}

/**
 * ScrollReveal — Intersection Observer wrapper that adds `.revealed` class
 * on viewport entry, triggering the CSS transition defined in `.reveal`.
 * 
 * Usage:
 * ```tsx
 * <ScrollReveal>
 *   <section className="reveal">...</section>
 * </ScrollReveal>
 * ```
 */
export default function ScrollReveal({
    children,
    className = '',
    delay = 0,
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        // Respect prefers-reduced-motion
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (prefersReduced) {
            el.classList.add('revealed')
            return
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    if (delay > 0) {
                        setTimeout(() => el.classList.add('revealed'), delay)
                    } else {
                        el.classList.add('revealed')
                    }
                    observer.unobserve(el)
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [delay])

    return (
        <div ref={ref} className={`reveal ${className}`}>
            {children}
        </div>
    )
}
