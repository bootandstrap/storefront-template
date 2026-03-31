'use client'

/**
 * PanelNotificationCenter — Enhanced notification dropdown
 *
 * Replaces basic order bell with a full notification center supporting:
 * - Multiple notification types (orders, alerts, tips, system)
 * - Read/unread state tracking  
 * - Grouped by type with icons
 * - Clear all / dismiss individual
 * - Smooth animations
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import {
    Bell, Package, AlertTriangle, Lightbulb, ShieldAlert,
    X, Check, CheckCheck, Trash2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType = 'order' | 'alert' | 'tip' | 'system'

export interface Notification {
    id: string
    type: NotificationType
    title: string
    message: string
    timestamp: Date
    read: boolean
    href?: string
}

interface PanelNotificationCenterProps {
    notifications: Notification[]
    onMarkRead?: (id: string) => void
    onMarkAllRead?: () => void
    onDismiss?: (id: string) => void
    onClearAll?: () => void
    labels?: {
        title?: string
        noNotifications?: string
        markAllRead?: string
        clearAll?: string
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ICON_MAP: Record<NotificationType, { icon: typeof Bell; color: string }> = {
    order: { icon: Package, color: 'text-brand' },
    alert: { icon: AlertTriangle, color: 'text-amber-500' },
    tip: { icon: Lightbulb, color: 'text-emerald-500' },
    system: { icon: ShieldAlert, color: 'text-blue-500' },
}

function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return 'Ahora'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `Hace ${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Hace ${hours}h`
    const days = Math.floor(hours / 24)
    return `Hace ${days}d`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanelNotificationCenter({
    notifications,
    onMarkRead,
    onMarkAllRead,
    onDismiss,
    onClearAll,
    labels = {},
}: PanelNotificationCenterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const unreadCount = notifications.filter(n => !n.read).length
    const title = labels.title ?? 'Notificaciones'
    const noNotifs = labels.noNotifications ?? 'No hay notificaciones'
    const markAllLabel = labels.markAllRead ?? 'Marcar todo'
    const clearAllLabel = labels.clearAll ?? 'Limpiar'

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Close on Escape
    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape' && isOpen) setIsOpen(false)
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen])

    const handleToggle = useCallback(() => {
        setIsOpen(prev => !prev)
    }, [])

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell trigger */}
            <button
                onClick={handleToggle}
                className="relative p-2 rounded-lg hover:bg-glass transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                aria-label={title}
                aria-expanded={isOpen}
            >
                <Bell className="w-5 h-5 text-tx-muted" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-[32rem] bg-sf-1 border border-sf-3 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-sf-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-tx">{title}</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold text-white bg-brand px-1.5 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && onMarkAllRead && (
                                <button
                                    onClick={onMarkAllRead}
                                    className="text-[11px] text-tx-muted hover:text-brand transition-colors px-2 py-1 rounded"
                                    title={markAllLabel}
                                >
                                    <CheckCheck className="w-4 h-4" />
                                </button>
                            )}
                            {notifications.length > 0 && onClearAll && (
                                <button
                                    onClick={onClearAll}
                                    className="text-[11px] text-tx-muted hover:text-red-400 transition-colors px-2 py-1 rounded"
                                    title={clearAllLabel}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <Bell className="w-8 h-8 text-tx-faint mx-auto mb-2" />
                                <p className="text-sm text-tx-muted">{noNotifs}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-sf-2">
                                {notifications.map(notif => {
                                    const { icon: TypeIcon, color } = ICON_MAP[notif.type]

                                    return (
                                        <div
                                            key={notif.id}
                                            className={`px-4 py-3 flex items-start gap-3 transition-colors hover:bg-sf-2/50 ${
                                                !notif.read ? 'bg-brand-subtle/20' : ''
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg bg-sf-2 flex items-center justify-center shrink-0 mt-0.5`}>
                                                <TypeIcon className={`w-4 h-4 ${color}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm truncate ${!notif.read ? 'font-semibold text-tx' : 'text-tx-sec'}`}>
                                                    {notif.title}
                                                </p>
                                                <p className="text-xs text-tx-muted line-clamp-2 mt-0.5">
                                                    {notif.message}
                                                </p>
                                                <p className="text-[10px] text-tx-faint mt-1">
                                                    {timeAgo(notif.timestamp)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {!notif.read && onMarkRead && (
                                                    <button
                                                        onClick={() => onMarkRead(notif.id)}
                                                        className="p-1 rounded hover:bg-sf-2 text-tx-faint hover:text-brand transition-colors"
                                                        title="Marcar como leída"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {onDismiss && (
                                                    <button
                                                        onClick={() => onDismiss(notif.id)}
                                                        className="p-1 rounded hover:bg-sf-2 text-tx-faint hover:text-red-400 transition-colors"
                                                        title="Descartar"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
