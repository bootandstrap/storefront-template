'use client'

/**
 * ReturnActions — Interactive approve/reject buttons for returns
 *
 * Client Component that handles:
 * - Approve (receive) a return via server action
 * - Reject (cancel) a return via server action
 * - Loading states and toast feedback
 *
 * Zone: 🟡 EXTEND — new client component for panel interactivity
 */

import { useState, useTransition } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

interface ReturnActionsProps {
    returnId: string
    items: { id: string; quantity: number }[]
    approveAction: (returnId: string, items: { id: string; quantity: number }[]) => Promise<{ success: boolean; error?: string }>
    rejectAction: (returnId: string) => Promise<{ success: boolean; error?: string }>
    labels: {
        approve: string
        reject: string
        approving: string
        rejecting: string
        approved: string
        rejected: string
        error: string
    }
}

export default function ReturnActions({
    returnId,
    items,
    approveAction,
    rejectAction,
    labels,
}: ReturnActionsProps) {
    const [isPendingApprove, startApprove] = useTransition()
    const [isPendingReject, startReject] = useTransition()
    const [completed, setCompleted] = useState<'approved' | 'rejected' | null>(null)
    const toast = useToast()

    if (completed) {
        return (
            <span className={`text-xs font-medium ${completed === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                {completed === 'approved' ? labels.approved : labels.rejected}
            </span>
        )
    }

    const isLoading = isPendingApprove || isPendingReject

    return (
        <div className="flex items-center justify-end gap-1.5">
            <button
                onClick={() => {
                    startApprove(async () => {
                        const result = await approveAction(returnId, items)
                        if (result.success) {
                            setCompleted('approved')
                            toast.success(labels.approved)
                        } else {
                            toast.error(result.error || labels.error)
                        }
                    })
                }}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={labels.approve}
            >
                {isPendingApprove ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                )}
                {isPendingApprove ? labels.approving : labels.approve}
            </button>
            <button
                onClick={() => {
                    startReject(async () => {
                        const result = await rejectAction(returnId)
                        if (result.success) {
                            setCompleted('rejected')
                            toast.success(labels.rejected)
                        } else {
                            toast.error(result.error || labels.error)
                        }
                    })
                }}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={labels.reject}
            >
                {isPendingReject ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <XCircle className="w-3.5 h-3.5" />
                )}
                {isPendingReject ? labels.rejecting : labels.reject}
            </button>
        </div>
    )
}
