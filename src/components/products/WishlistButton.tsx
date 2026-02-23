'use client'

import { Heart } from 'lucide-react'
import { useWishlist } from '@/contexts/WishlistContext'

interface WishlistButtonProps {
    productId: string
    size?: 'sm' | 'md'
    className?: string
}

export default function WishlistButton({ productId, size = 'md', className = '' }: WishlistButtonProps) {
    const { toggleItem, isInWishlist } = useWishlist()
    const active = isInWishlist(productId)
    const iconSize = size === 'sm' ? 16 : 20

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleItem(productId)
            }}
            className={`group/wish inline-flex items-center justify-center rounded-full transition-all duration-200 ${size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
                } ${active
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-500 scale-110'
                    : 'bg-white/80 dark:bg-surface-2/80 backdrop-blur-sm text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                } shadow-sm hover:shadow-md ${className}`}
            aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        >
            <Heart
                size={iconSize}
                className={`transition-all duration-200 ${active ? 'fill-current scale-110' : 'group-hover/wish:scale-110'
                    }`}
            />
        </button>
    )
}
