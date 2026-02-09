'use client'

import { useEffect, useRef } from 'react'

/**
 * Scroll-reveal hook — observes a container and adds `.revealed` class
 * to children with `.reveal` class when they enter the viewport.
 * 
 * Usage:
 *   const ref = useScrollReveal()
 *   <div ref={ref}>
 *     <div className="reveal stagger-1">...</div>
 *     <div className="reveal stagger-2">...</div>
 *   </div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
    threshold = 0.1
) {
    const ref = useRef<T>(null)

    useEffect(() => {
        const container = ref.current
        if (!container) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed')
                        observer.unobserve(entry.target) // Only animate once
                    }
                })
            },
            { threshold, rootMargin: '0px 0px -50px 0px' }
        )

        const targets = container.querySelectorAll('.reveal')
        targets.forEach((el) => observer.observe(el))

        return () => observer.disconnect()
    }, [threshold])

    return ref
}
