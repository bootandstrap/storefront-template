'use client'

import { Scale } from 'lucide-react'
import { useCompare } from '@/contexts/CompareContext'

interface CompareButtonProps {
    productId: string
    className?: string
}

export default function CompareButton({ productId, className = '' }: CompareButtonProps) {
    const { addItem, removeItem, isInCompare, count } = useCompare()
    const active = isInCompare(productId)
    const isFull = count >= 4 && !active

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (active) {
            removeItem(productId)
        } else if (!isFull) {
            addItem(productId)
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={isFull}
            className={`p-1.5 rounded-lg transition-all duration-200
                ${active
                    ? 'bg-brand text-white shadow-md scale-110'
                    : 'bg-white/80 text-gray-500 hover:text-brand hover:bg-white hover:shadow-sm'
                }
                ${isFull ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                backdrop-blur-sm ${className}`}
            aria-label={active ? 'Remove from comparison' : 'Add to comparison'}
            title={isFull ? 'Max 4 products' : active ? 'Remove from compare' : 'Compare'}
        >
            <Scale className="w-4 h-4" />
        </button>
    )
}
