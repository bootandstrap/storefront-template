'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, Package, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

interface OrderNotification {
    id: string
    orderId: string
    customerName: string
    total: string
    timestamp: Date
}

/**
 * Real-time order notification bell for the owner panel.
 * Polls the orders API at a configurable interval (default 30s) 
 * instead of SSE to keep infrastructure simple (no persistent connections needed).
 * Shows a dropdown with the latest unread orders.
 */
export default function OrderNotifications() {
    const { t } = useI18n()
    const [notifications, setNotifications] = useState<OrderNotification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const lastCheckRef = useRef<string>(new Date().toISOString())
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Poll for new orders
    useEffect(() => {
        async function checkNewOrders() {
            try {
                const res = await fetch(`/api/orders/lookup?since=${lastCheckRef.current}`, {
                    credentials: 'same-origin',
                })
                if (!res.ok) return

                const data = await res.json()
                if (data.orders && data.orders.length > 0) {
                    const newNotifs: OrderNotification[] = data.orders.map((order: { id: string; display_id?: string; email?: string; total?: number; currency_code?: string; created_at?: string }) => ({
                        id: `order-${order.id}`,
                        orderId: order.display_id || order.id.slice(0, 8),
                        customerName: order.email || t('panel.orders.unknown'),
                        total: order.total
                            ? new Intl.NumberFormat(undefined, {
                                style: 'currency',
                                currency: order.currency_code || 'EUR',
                            }).format(order.total / 100)
                            : '—',
                        timestamp: new Date(order.created_at || Date.now()),
                    }))

                    setNotifications(prev => [...newNotifs, ...prev].slice(0, 20))
                    setUnreadCount(prev => prev + newNotifs.length)
                }

                lastCheckRef.current = new Date().toISOString()
            } catch {
                // Silently fail — network issues shouldn't break the panel
            }
        }

        // Initial check
        checkNewOrders()

        // Poll every 30 seconds
        const interval = setInterval(checkNewOrders, 30000)
        return () => clearInterval(interval)
    }, [t])

    const handleToggle = useCallback(() => {
        setIsOpen(prev => !prev)
        if (!isOpen) {
            setUnreadCount(0)
        }
    }, [isOpen])

    const handleDismiss = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className="relative p-2 rounded-lg hover:bg-glass transition-colors"
                aria-label={t('panel.orders.notifications')}
            >
                <Bell className="w-5 h-5 text-tx-muted" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-xl rounded-xl border border-border z-50">
                    <div className="p-3 border-b border-border flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-tx">
                            {t('panel.orders.recentOrders')}
                        </h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={() => setNotifications([])}
                                className="text-xs text-tx-muted hover:text-tx-sec"
                            >
                                {t('common.clearAll')}
                            </button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                            <Package className="w-8 h-8 text-tx-muted mx-auto mb-2" />
                            <p className="text-sm text-tx-muted">
                                {t('panel.orders.noNew')}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map(notif => (
                                <div key={notif.id} className="p-3 flex items-start gap-3 hover:bg-white/3 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-brand-subtle flex items-center justify-center shrink-0 mt-0.5">
                                        <Package className="w-4 h-4 text-brand" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-tx truncate">
                                            #{notif.orderId}
                                        </p>
                                        <p className="text-xs text-tx-muted truncate">
                                            {notif.customerName} · {notif.total}
                                        </p>
                                        <p className="text-[10px] text-tx-muted mt-1">
                                            {notif.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDismiss(notif.id)}
                                        className="p-1 hover:bg-glass rounded"
                                    >
                                        <X className="w-3 h-3 text-tx-muted" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
