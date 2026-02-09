'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

export default function AccountError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const { t } = useI18n()

    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
            <h2 className="text-lg font-bold text-text-primary mb-2">
                {t('common.error')}
            </h2>
            <p className="text-sm text-text-muted mb-6 max-w-md">
                {error.message || t('common.error')}
            </p>
            <button onClick={reset} className="btn btn-primary py-2.5 px-6">
                <RefreshCw className="w-4 h-4" />
                {t('common.retry')}
            </button>
        </div>
    )
}
