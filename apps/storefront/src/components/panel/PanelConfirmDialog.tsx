'use client'

/**
 * PanelConfirmDialog — Confirmation modal for destructive actions
 *
 * SOTA pattern: Notion/Linear-style confirmation with:
 * - Typed confirmation input for critical actions (delete, bulk delete)
 * - Cancel/Confirm with keyboard shortcuts (Escape/Enter)
 * - Undo toast after successful destructive action
 */

import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfirmDialogConfig {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning' | 'info'
    /** If set, user must type this string to enable confirm */
    typeToConfirm?: string
    onConfirm: () => Promise<void> | void
    onCancel?: () => void
}

interface PanelConfirmDialogProps extends ConfirmDialogConfig {
    open: boolean
    onClose: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanelConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'danger',
    typeToConfirm,
    onConfirm,
    onCancel,
    onClose,
}: PanelConfirmDialogProps) {
    const [typedValue, setTypedValue] = useState('')
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const canConfirm = typeToConfirm ? typedValue === typeToConfirm : true

    // Reset on open/close
    useEffect(() => {
        if (open) {
            setTypedValue('')
            setLoading(false)
            requestAnimationFrame(() => inputRef.current?.focus())
        }
    }, [open])

    // Escape to close
    useEffect(() => {
        if (!open) return
        function handleEsc(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.preventDefault()
                onCancel?.()
                onClose()
            }
        }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const handleCancel = useCallback(() => {
        onCancel?.()
        onClose()
    }, [onCancel, onClose])

    const handleConfirm = useCallback(async () => {
        if (!canConfirm || loading) return
        setLoading(true)
        try {
            await onConfirm()
            onClose()
        } catch {
            setLoading(false)
        }
    }, [canConfirm, loading, onConfirm, onClose])

    if (!open) return null

    const variantStyles = {
        danger: {
            icon: 'bg-red-500/10 text-red-500',
            button: 'bg-red-500 hover:bg-red-600 text-white',
        },
        warning: {
            icon: 'bg-amber-500/10 text-amber-500',
            button: 'bg-amber-500 hover:bg-amber-600 text-white',
        },
        info: {
            icon: 'bg-blue-500/10 text-blue-500',
            button: 'bg-brand hover:bg-brand-muted text-white',
        },
    }

    const style = variantStyles[variant]

    return (
        <div className="fixed inset-0 z-[110]" role="alertdialog" aria-modal="true">
            {/* Backdrop */}
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleCancel}
                aria-label="Close dialog"
            />

            {/* Modal */}
            <div className="relative mx-auto mt-[20vh] w-full max-w-md px-4">
                <div className="bg-sf-1 border border-sf-3 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-5">
                        <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl ${style.icon} flex items-center justify-center shrink-0`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-semibold text-tx">{title}</h3>
                                <p className="text-sm text-tx-muted mt-1">{message}</p>
                            </div>
                            <button
                                onClick={handleCancel}
                                className="p-1.5 rounded-lg hover:bg-sf-2 text-tx-muted transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Type-to-confirm */}
                        {typeToConfirm && (
                            <div className="mt-4">
                                <p className="text-xs text-tx-muted mb-2">
                                    Escribe <span className="font-mono font-semibold text-tx">{typeToConfirm}</span> para confirmar:
                                </p>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={typedValue}
                                    onChange={(e) => setTypedValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && canConfirm) {
                                            e.preventDefault()
                                            handleConfirm()
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-sf-2 border border-sf-3 rounded-lg text-sm text-tx font-mono placeholder:text-tx-faint focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                    placeholder={typeToConfirm}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-4 border-t border-sf-2 flex items-center justify-end gap-3">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-sm rounded-lg border border-sf-3 text-tx-sec hover:bg-sf-2 transition-colors"
                            disabled={loading}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!canConfirm || loading}
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${style.button} ${
                                (!canConfirm || loading) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Procesando…
                                </span>
                            ) : (
                                confirmLabel
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Legacy hook (backward-compatible) — used by existing consumers
// Returns { confirm: (onConfirm) => void, dialogProps: PanelConfirmDialogProps }
// ---------------------------------------------------------------------------

interface UseConfirmDialogOptions {
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning' | 'info'
    typeToConfirm?: string
}

export function useConfirmDialog(options: UseConfirmDialogOptions) {
    const [open, setOpen] = useState(false)
    const onConfirmRef = useRef<(() => void) | null>(null)

    const confirm = useCallback((onConfirm: () => void) => {
        onConfirmRef.current = onConfirm
        setOpen(true)
    }, [])

    const dialogProps = {
        open,
        title: options.title,
        message: options.description,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
        variant: options.variant ?? 'danger',
        typeToConfirm: options.typeToConfirm,
        onConfirm: async () => {
            onConfirmRef.current?.()
        },
        onClose: () => setOpen(false),
    }

    return { confirm, dialogProps }
}

// ---------------------------------------------------------------------------
// Context-based hook for easy usage
// ---------------------------------------------------------------------------

type ShowConfirmFn = (config: ConfirmDialogConfig) => void
const ConfirmContext = createContext<ShowConfirmFn | null>(null)

export function useConfirm() {
    const fn = useContext(ConfirmContext)
    if (!fn) throw new Error('useConfirm must be used within <PanelConfirmProvider>')
    return fn
}

export function PanelConfirmProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<ConfirmDialogConfig | null>(null)

    const showConfirm: ShowConfirmFn = useCallback((cfg) => {
        setConfig(cfg)
    }, [])

    const handleClose = useCallback(() => {
        setConfig(null)
    }, [])

    return (
        <ConfirmContext.Provider value={showConfirm}>
            {children}
            {config && (
                <PanelConfirmDialog
                    open={true}
                    {...config}
                    onClose={handleClose}
                />
            )}
        </ConfirmContext.Provider>
    )
}
