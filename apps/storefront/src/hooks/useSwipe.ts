import { useRef, useCallback } from 'react'

interface SwipeHandlers {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
}

interface UseSwipeOptions {
    onSwipeLeft: () => void
    onSwipeRight: () => void
    threshold?: number
}

/**
 * Lightweight touch swipe hook for product image gallery.
 * Detects horizontal swipes and fires callbacks.
 * Threshold prevents accidental swipes during vertical scroll.
 */
export function useSwipe({
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
}: UseSwipeOptions): SwipeHandlers {
    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }, [])

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return

        const deltaX = e.changedTouches[0].clientX - touchStartX.current
        const deltaY = e.changedTouches[0].clientY - touchStartY.current

        // Only trigger horizontal swipe if X movement > Y movement
        // This prevents conflict with vertical scrolling
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
            if (deltaX < 0) {
                onSwipeLeft()
            } else {
                onSwipeRight()
            }
        }

        touchStartX.current = null
        touchStartY.current = null
    }, [onSwipeLeft, onSwipeRight, threshold])

    return { onTouchStart, onTouchEnd }
}
