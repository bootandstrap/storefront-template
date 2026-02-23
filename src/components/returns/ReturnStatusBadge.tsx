import { Clock, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'

interface ReturnStatusBadgeProps {
    status: 'pending' | 'approved' | 'rejected' | 'completed'
    labels: Record<string, string>
}

const STATUS_CONFIG = {
    pending: {
        icon: Clock,
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
    },
    approved: {
        icon: CheckCircle2,
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
    },
    rejected: {
        icon: XCircle,
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
    },
    completed: {
        icon: RotateCcw,
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
    },
}

export default function ReturnStatusBadge({ status, labels }: ReturnStatusBadgeProps) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
    const Icon = config.icon

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
            <Icon className="w-3.5 h-3.5" />
            {labels[status] || status}
        </span>
    )
}
