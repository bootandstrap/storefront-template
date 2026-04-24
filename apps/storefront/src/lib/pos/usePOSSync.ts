'use client'

/**
 * usePOSSync — Multi-Device POS Synchronization via Supabase Realtime
 *
 * Enables real-time communication between multiple POS sessions (e.g.,
 * a cashier tablet and a customer-facing kiosk) within the same tenant.
 *
 * Architecture:
 *   Browser A → broadcast({ event: 'pos_event', payload }) → Supabase Realtime
 *   → Supabase Channel `pos:{tenantId}` → Browser B callback
 *
 * Events:
 *   - cart_updated: Cart items changed on another device
 *   - sale_completed: A sale was completed on another device
 *   - shift_changed: A shift was opened/closed on another device
 *   - parked_sale_sync: A sale was parked/resumed on another device
 *   - printer_status: Printer connection status changed
 *
 * Uses the existing governance-browser.ts Supabase client (reuses
 * the same connection pool and anon key).
 *
 * Feature gated: only active when `enable_pos` is true (enforced by caller).
 *
 * @module lib/pos/usePOSSync
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { getGovernanceBrowserClient } from '@/lib/supabase/governance-browser'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type POSSyncEventType =
    | 'cart_updated'
    | 'sale_completed'
    | 'shift_changed'
    | 'parked_sale_sync'
    | 'printer_status'

export interface POSSyncEvent {
    type: POSSyncEventType
    /** Unique ID of the sender session (to ignore own broadcasts) */
    senderId: string
    /** Arbitrary payload data */
    payload: Record<string, unknown>
    /** ISO timestamp */
    timestamp: string
}

export interface UsePOSSyncOptions {
    /** Tenant ID for the channel name */
    tenantId: string | undefined
    /** Whether the feature is enabled (caller checks feature flags) */
    enabled: boolean
    /** Callback when an event is received from another device */
    onEvent?: (event: POSSyncEvent) => void
}

export interface UsePOSSyncReturn {
    /** Whether the realtime channel is connected */
    connected: boolean
    /** Number of other devices currently subscribed */
    deviceCount: number
    /** Broadcast an event to other devices */
    broadcast: (type: POSSyncEventType, payload?: Record<string, unknown>) => void
}

// ---------------------------------------------------------------------------
// Session ID — unique per browser tab
// ---------------------------------------------------------------------------

const SESSION_ID = typeof crypto !== 'undefined'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Debounce for cart_updated events to prevent spam during rapid edits */
const CART_UPDATE_DEBOUNCE_MS = 300

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePOSSync({
    tenantId,
    enabled,
    onEvent,
}: UsePOSSyncOptions): UsePOSSyncReturn {
    const [connected, setConnected] = useState(false)
    const [deviceCount, setDeviceCount] = useState(0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channelRef = useRef<any>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const onEventRef = useRef(onEvent)

    // Keep callback ref fresh without re-subscribing
    useEffect(() => {
        onEventRef.current = onEvent
    }, [onEvent])

    // ── Subscribe to POS channel ──
    useEffect(() => {
        if (!tenantId || !enabled) {
            setConnected(false)
            setDeviceCount(0)
            return
        }

        const client = getGovernanceBrowserClient()
        if (!client) {
            logger.warn('[pos-sync] No Supabase client — multi-device disabled')
            return
        }

        const channelName = `pos:${tenantId}`
        const channel = client.channel(channelName, {
            config: {
                broadcast: { self: false }, // Don't receive own broadcasts
                presence: { key: SESSION_ID },
            },
        })

        // ── Broadcast events ──
        channel.on('broadcast', { event: 'pos_event' }, (msg) => {
            const event = msg.payload as POSSyncEvent
            // Double-check: ignore own events (belt-and-suspenders with self:false)
            if (event.senderId === SESSION_ID) return

            logger.info(
                `[pos-sync] Received ${event.type} from ${event.senderId.slice(0, 8)}…`
            )
            onEventRef.current?.(event)
        })

        // ── Presence: track connected devices ──
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState()
            setDeviceCount(Object.keys(state).length)
        })

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                setConnected(true)
                // Track this session in presence
                await channel.track({
                    session_id: SESSION_ID,
                    joined_at: new Date().toISOString(),
                })
                logger.info(`[pos-sync] Connected to ${channelName} (session: ${SESSION_ID.slice(0, 8)}…)`)
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                setConnected(false)
                logger.warn(`[pos-sync] Channel ${status} for ${channelName}`)
            }
        })

        channelRef.current = channel

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            channel.unsubscribe()
            channelRef.current = null
            setConnected(false)
            setDeviceCount(0)
        }
    }, [tenantId, enabled])

    // ── Broadcast function ──
    const broadcast = useCallback(
        (type: POSSyncEventType, payload: Record<string, unknown> = {}) => {
            const channel = channelRef.current
            if (!channel) return

            const event: POSSyncEvent = {
                type,
                senderId: SESSION_ID,
                payload,
                timestamp: new Date().toISOString(),
            }

            // Debounce cart updates
            if (type === 'cart_updated') {
                if (debounceRef.current) clearTimeout(debounceRef.current)
                debounceRef.current = setTimeout(() => {
                    channel.send({
                        type: 'broadcast',
                        event: 'pos_event',
                        payload: event,
                    })
                }, CART_UPDATE_DEBOUNCE_MS)
            } else {
                // Immediate broadcast for non-cart events
                channel.send({
                    type: 'broadcast',
                    event: 'pos_event',
                    payload: event,
                })
            }
        },
        []
    )

    return {
        connected,
        deviceCount,
        broadcast,
    }
}
