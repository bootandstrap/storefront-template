'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface ErrorLabels {
    title?: string
    description?: string
    retry?: string
}

interface Props {
    children: ReactNode
    fallback?: ReactNode
    labels?: ErrorLabels
}

interface State {
    hasError: boolean
    error: Error | null
}

/**
 * Reusable ErrorBoundary with i18n support.
 * Accepts optional `labels` prop for localized error messages.
 * Falls back to English defaults.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    reset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            const labels = this.props.labels ?? {}

            return (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mb-4">
                        <span className="text-xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-bold text-tx mb-2">
                        {labels.title || 'Something went wrong'}
                    </h3>
                    <p className="text-sm text-tx-muted mb-4 max-w-sm">
                        {labels.description || 'An error occurred loading this section. Please try again.'}
                    </p>
                    <button onClick={this.reset} className="btn btn-secondary text-sm">
                        <RefreshCw className="w-4 h-4" />
                        {labels.retry || 'Retry'}
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}
