'use client'

import { useCallback, useState } from 'react'

interface ShareData {
    title: string
    text?: string
    url?: string
}

interface UseShareReturn {
    share: (data: ShareData) => Promise<void>
    copied: boolean
    canShare: boolean
}

/**
 * useShare — Web Share API with clipboard fallback.
 *
 * On mobile/supported browsers: opens native share sheet.
 * On desktop/fallback: copies URL to clipboard + shows "copied" state for 2s.
 */
export function useShare(): UseShareReturn {
    const [copied, setCopied] = useState(false)

    const canShare = typeof navigator !== 'undefined' && !!navigator.share

    const share = useCallback(async (data: ShareData) => {
        const url = data.url || (typeof window !== 'undefined' ? window.location.href : '')

        // Try native Web Share API first
        if (navigator.share) {
            try {
                await navigator.share({
                    title: data.title,
                    text: data.text,
                    url,
                })
                return
            } catch (err) {
                // User cancelled or API failed — fall through to clipboard
                if (err instanceof Error && err.name === 'AbortError') return
            }
        }

        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Last resort: prompt user
            if (typeof window !== 'undefined') {
                window.prompt('Copy this link:', url)
            }
        }
    }, [])

    return { share, copied, canShare }
}
