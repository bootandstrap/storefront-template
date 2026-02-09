'use client'

import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo)
    }

    reset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                        Algo salió mal
                    </h3>
                    <p className="text-sm text-text-muted mb-4 max-w-md">
                        Hubo un error al cargar esta sección. Intenta de nuevo.
                    </p>
                    <button onClick={this.reset} className="btn btn-secondary text-sm">
                        <RefreshCw className="w-4 h-4" />
                        Reintentar
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
