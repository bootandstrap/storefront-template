'use client'

/**
 * PanelBatchProgress — Progress bar for bulk operations
 *
 * Shows a fixed bottom-right toast-like progress indicator when
 * batch operations (bulk edit, import, export) are running.
 *
 * Features:
 * - Animated progress bar with gradient
 * - Auto-dismiss on completion with success animation
 * - Cancel button for interruptible operations
 * - Queue support (show multiple operations)
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BatchStatus = 'running' | 'completed' | 'error'

export interface BatchOperation {
    id: string
    label: string
    progress: number // 0-100
    status: BatchStatus
    error?: string
}

interface BatchProgressContextType {
    operations: BatchOperation[]
    startBatch: (id: string, label: string) => void
    updateBatch: (id: string, progress: number) => void
    completeBatch: (id: string) => void
    failBatch: (id: string, error: string) => void
    cancelBatch: (id: string) => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const BatchProgressContext = createContext<BatchProgressContextType | null>(null)

export function useBatchProgress() {
    const ctx = useContext(BatchProgressContext)
    if (!ctx) throw new Error('useBatchProgress must be used within <PanelBatchProvider>')
    return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PanelBatchProvider({ children }: { children: React.ReactNode }) {
    const [operations, setOperations] = useState<BatchOperation[]>([])

    const startBatch = useCallback((id: string, label: string) => {
        setOperations(prev => [
            ...prev.filter(o => o.id !== id),
            { id, label, progress: 0, status: 'running' },
        ])
    }, [])

    const updateBatch = useCallback((id: string, progress: number) => {
        setOperations(prev =>
            prev.map(o => o.id === id ? { ...o, progress: Math.min(100, progress) } : o)
        )
    }, [])

    const completeBatch = useCallback((id: string) => {
        setOperations(prev =>
            prev.map(o => o.id === id ? { ...o, progress: 100, status: 'completed' } : o)
        )
    }, [])

    const failBatch = useCallback((id: string, error: string) => {
        setOperations(prev =>
            prev.map(o => o.id === id ? { ...o, status: 'error', error } : o)
        )
    }, [])

    const cancelBatch = useCallback((id: string) => {
        setOperations(prev => prev.filter(o => o.id !== id))
    }, [])

    // Auto-remove completed operations after 3 seconds
    useEffect(() => {
        const completed = operations.filter(o => o.status === 'completed')
        if (completed.length === 0) return

        const timeout = setTimeout(() => {
            setOperations(prev => prev.filter(o => o.status !== 'completed'))
        }, 3000)

        return () => clearTimeout(timeout)
    }, [operations])

    return (
        <BatchProgressContext.Provider value={{ operations, startBatch, updateBatch, completeBatch, failBatch, cancelBatch }}>
            {children}
            <BatchProgressDisplay operations={operations} onCancel={cancelBatch} />
        </BatchProgressContext.Provider>
    )
}

// ---------------------------------------------------------------------------
// Display component
// ---------------------------------------------------------------------------

function BatchProgressDisplay({
    operations,
    onCancel,
}: {
    operations: BatchOperation[]
    onCancel: (id: string) => void
}) {
    if (operations.length === 0) return null

    return (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 space-y-2 w-80">
            {operations.map(op => (
                <div
                    key={op.id}
                    className="bg-sf-1 border border-sf-3 rounded-xl shadow-lg p-4 space-y-2 animate-fade-in"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {op.status === 'running' && (
                                <Loader2 className="w-4 h-4 text-brand animate-spin" />
                            )}
                            {op.status === 'completed' && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            )}
                            {op.status === 'error' && (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium text-tx truncate">{op.label}</span>
                        </div>
                        {op.status === 'running' && (
                            <button
                                onClick={() => onCancel(op.id)}
                                className="p-1 rounded hover:bg-sf-2 text-tx-faint hover:text-red-400 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-sf-2 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${
                                op.status === 'error'
                                    ? 'bg-red-500'
                                    : op.status === 'completed'
                                    ? 'bg-emerald-500'
                                    : 'bg-gradient-to-r from-brand to-brand-muted'
                            }`}
                            style={{ width: `${op.progress}%` }}
                        />
                    </div>

                    {/* Status text */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-tx-faint">
                            {op.status === 'running' && `${op.progress}%`}
                            {op.status === 'completed' && 'Completado'}
                            {op.status === 'error' && (op.error || 'Error')}
                        </span>
                        {op.status === 'running' && (
                            <span className="text-[10px] text-tx-faint">
                                {Math.round(op.progress)}%
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
