'use client'

/**
 * useRealtimeGovernance — Live governance push for storefronts
 *
 * Subscribes to the tenant's governance broadcast channel via Supabase Realtime.
 * When any governance table changes (feature_flags, plan_limits, capability_overrides,
 * module_orders, config), the DB trigger fires → broadcast → this hook receives it →
 * calls revalidateConfig() Server Action to clear cache + revalidate the page.
 *
 * The broadcast carries no data — it's just a signal. All data re-fetching happens
 * server-side through the existing getConfig() RPC pipeline.
 *
 * Architecture:
 *   DB trigger → pg_notify('realtime:broadcast') → Supabase Realtime WS → this hook
 *   → revalidateConfig() → clearCachedConfig() + revalidatePath('/', 'layout')
 *   → Next.js re-renders with fresh data
 */

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getGovernanceBrowserClient } from '@/lib/supabase/governance-browser'

/** Debounce delay to batch rapid changes (e.g., setBatchOverrides writes 44 flags) */
const DEBOUNCE_MS = 1500

export function useRealtimeGovernance(tenantId: string | undefined) {
    const router = useRouter()
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelRef = useRef<any>(null)

    const handleGovernanceChange = useCallback(() => {
        // Debounce: batch rapid consecutive changes
        if (debounceRef.current) clearTimeout(debounceRef.current)

        debounceRef.current = setTimeout(() => {
            // router.refresh() triggers a server-side re-render which calls getConfig()
            // with fresh data (cache was cleared by the server-side mutation)
            router.refresh()
        }, DEBOUNCE_MS)
    }, [router])

    useEffect(() => {
        if (!tenantId) return

        const client = getGovernanceBrowserClient()
        if (!client) return // No governance URL configured — degrade gracefully

        const channelName = `governance:${tenantId}`
        const channel = client.channel(channelName)

        channel
            .on('broadcast', { event: 'governance_change' }, (payload) => {
                console.info(
                    `[realtime-governance] Received change:`,
                    payload?.payload?.table,
                    payload?.payload?.operation,
                )
                handleGovernanceChange()
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.info(`[realtime-governance] Subscribed to ${channelName}`)
                } else if (status === 'CHANNEL_ERROR') {
                    console.warn(`[realtime-governance] Channel error for ${channelName}`)
                }
            })

        channelRef.current = channel

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            channel.unsubscribe()
            channelRef.current = null
        }
    }, [tenantId, handleGovernanceChange])
}
