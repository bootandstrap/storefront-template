import { Package, Search, ShoppingCart, Heart, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description?: string
    /** CTA button config */
    action?: {
        label: string
        href: string
    }
    /** Preset styles for common scenarios */
    variant?: 'products' | 'search' | 'cart' | 'wishlist' | 'generic'
}

const VARIANT_ICONS: Record<string, LucideIcon> = {
    products: Package,
    search: Search,
    cart: ShoppingCart,
    wishlist: Heart,
    generic: Package,
}

/**
 * Premium empty state component with subtle animation.
 * Used across storefront: product grids, search results, cart, wishlist.
 */
export default function EmptyState({
    icon,
    title,
    description,
    action,
    variant = 'generic',
}: EmptyStateProps) {
    const Icon = icon || VARIANT_ICONS[variant] || Package

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-sf-2 flex items-center justify-center mb-5">
                <Icon className="w-7 h-7 text-tx-muted" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-tx mb-1.5 font-display">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-tx-muted max-w-sm leading-relaxed">
                    {description}
                </p>
            )}
            {action && (
                <Link
                    href={action.href}
                    className="btn btn-primary mt-6"
                >
                    {action.label}
                </Link>
            )}
        </div>
    )
}
