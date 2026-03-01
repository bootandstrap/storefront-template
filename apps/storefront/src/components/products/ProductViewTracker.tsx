'use client'

import { useEffect } from 'react'
import { trackProductView } from '@/components/products/RecentlyViewed'

/**
 * Thin client wrapper that calls trackProductView() on mount.
 * Used inside the PDP server page to record the view without
 * turning the whole page into a client component.
 */
export default function ProductViewTracker({
    handle,
    title,
    thumbnail,
}: {
    handle: string
    title: string
    thumbnail: string | null
}) {
    useEffect(() => {
        trackProductView({ handle, title, thumbnail })
    }, [handle, title, thumbnail])
    return null
}
