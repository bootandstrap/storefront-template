'use client'

import { createContext, useContext, useState, useCallback, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: string
    type: ToastType
    message: string
    exiting?: boolean
}

interface ToastContextValue {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
    return ctx
}

// ---------------------------------------------------------------------------
// Icons map
// ---------------------------------------------------------------------------

const ICONS: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
}

const COLORS: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200',
}

// ---------------------------------------------------------------------------
// Provider + Portal
// ---------------------------------------------------------------------------

const AUTO_DISMISS_MS = 4000

// Hydration-safe mount detection (avoids setState-in-effect)
const subscribe = () => () => { }
const getSnapshot = () => true
const getServerSnapshot = () => false

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 250)
    }, [])

    const addToast = useCallback(
        (type: ToastType, message: string) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
            setToasts((prev) => [...prev.slice(-4), { id, type, message }]) // max 5 visible
            setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
        },
        [dismiss]
    )

    const value: ToastContextValue = {
        success: (msg) => addToast('success', msg),
        error: (msg) => addToast('error', msg),
        info: (msg) => addToast('info', msg),
    }

    return (
        <ToastContext.Provider value={value}>
            {children}
            {mounted &&
                createPortal(
                    <div
                        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
                        aria-live="polite"
                    >
                        {toasts.map((toast) => {
                            const Icon = ICONS[toast.type]
                            return (
                                <div
                                    key={toast.id}
                                    className={`
                    pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3
                    shadow-lg max-w-sm ${COLORS[toast.type]}
                    ${toast.exiting ? 'toast-exit' : 'toast-enter'}
                  `}
                                >
                                    <Icon className="w-5 h-5 shrink-0" />
                                    <p className="text-sm font-medium flex-1">{toast.message}</p>
                                    <button
                                        onClick={() => dismiss(toast.id)}
                                        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>,
                    document.body
                )}
        </ToastContext.Provider>
    )
}
