import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="text-8xl font-bold font-display text-surface-3 mb-4">404</div>
                <h1 className="text-2xl font-bold font-display text-text-primary mb-3">
                    Page not found
                </h1>
                <p className="text-text-muted mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/" className="btn btn-primary">
                        <Home className="w-4 h-4" />
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    )
}
