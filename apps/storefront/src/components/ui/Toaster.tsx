'use client'

import { createContext, useContext, useState, useCallback, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastAction {
    label: string
    onClick: () => void
}

interface Toast {
    id: string
    type: ToastType
    message: string
    action?: ToastAction
    exiting?: boolean
    duration: number
}

interface ToastOptions {
    action?: ToastAction
    duration?: number
}

interface ToastContextValue {
    success: (message: string, options?: ToastOptions) => void
    error: (message: string, options?: ToastOptions) => void
    warning: (message: string, options?: ToastOptions) => void
    info: (message: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
    return ctx
}

// ---------------------------------------------------------------------------
// Icons & Colors
// ---------------------------------------------------------------------------

const ICONS: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
}

const COLORS: Record<ToastType, string> = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/90 dark:border-green-800 dark:text-green-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/90 dark:border-red-800 dark:text-red-200',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/90 dark:border-blue-800 dark:text-blue-200',
}

const PROGRESS_COLORS: Record<ToastType, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
}

const ICON_COLORS: Record<ToastType, string> = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-amber-600 dark:text-amber-400',
    info: 'text-blue-600 dark:text-blue-400',
}

// ---------------------------------------------------------------------------
// Toast Item Component (with swipe-to-dismiss)
// ---------------------------------------------------------------------------

function ToastItem({
    toast,
    onDismiss,
}: {
    toast: Toast
    onDismiss: (id: string) => void
}) {
    const Icon = ICONS[toast.type]
    const touchStartX = useRef(0)
    const touchDeltaX = useRef(0)
    const itemRef = useRef<HTMLDivElement>(null)

    function handleTouchStart(e: React.TouchEvent) {
        touchStartX.current = e.touches[0].clientX
        touchDeltaX.current = 0
    }

    function handleTouchMove(e: React.TouchEvent) {
        touchDeltaX.current = e.touches[0].clientX - touchStartX.current
        if (itemRef.current) {
            const x = Math.max(0, touchDeltaX.current)
            itemRef.current.style.transform = `translateX(${x}px)`
            itemRef.current.style.opacity = `${1 - x / 200}`
        }
    }

    function handleTouchEnd() {
        if (touchDeltaX.current > 80) {
            onDismiss(toast.id)
        } else if (itemRef.current) {
            itemRef.current.style.transform = ''
            itemRef.current.style.opacity = ''
        }
    }

    return (
        <div
            ref={itemRef}
            className={`
                pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3
                shadow-lg backdrop-blur-sm max-w-sm w-full
                ${COLORS[toast.type]}
                ${toast.exiting ? 'toast-exit' : 'toast-enter'}
                transition-[transform,opacity] duration-150 ease-out
            `}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="alert"
        >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${ICON_COLORS[toast.type]}`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{toast.message}</p>
                {toast.action && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            toast.action!.onClick()
                            onDismiss(toast.id)
                        }}
                        className="mt-1 text-xs font-bold underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50 rounded-sm"
                    >
                        {toast.action.label} →
                    </button>
                )}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 mt-0.5 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/50"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress bar */}
            {!toast.exiting && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full overflow-hidden bg-black/5 dark:bg-white/10">
                    <div
                        className={`h-full rounded-full ${PROGRESS_COLORS[toast.type]} toast-progress-bar`}
                        style={{ animationDuration: `${toast.duration}ms` }}
                    />
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Provider + Portal
// ---------------------------------------------------------------------------

const DEFAULT_DURATION = 4000

// Hydration-safe mount detection
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
        (type: ToastType, message: string, options?: ToastOptions) => {
            const duration = options?.duration ?? DEFAULT_DURATION
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
            setToasts((prev) => [
                ...prev.slice(-2), // max 3 visible
                { id, type, message, action: options?.action, duration },
            ])
            setTimeout(() => dismiss(id), duration)
        },
        [dismiss]
    )

    const value: ToastContextValue = {
        success: (msg, opts) => addToast('success', msg, opts),
        error: (msg, opts) => addToast('error', msg, opts),
        warning: (msg, opts) => addToast('warning', msg, opts),
        info: (msg, opts) => addToast('info', msg, opts),
    }

    return (
        <ToastContext.Provider value={value}>
            {children}
            {mounted &&
                createPortal(
                    <div
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none w-full max-w-sm px-4"
                        aria-live="polite"
                    >
                        {toasts.map((toast) => (
                            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                        ))}
                    </div>,
                    document.body
                )}
        </ToastContext.Provider>
    )
}
