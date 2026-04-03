import React from 'react'
import Link from 'next/link'

interface SotaPillActionProps {
    href?: string
    onClick?: () => void
    icon: React.ReactNode
    label: string
    /** Adds a subtle hue to the pill */
    variant?: 'default' | 'brand' | 'glass'
}

export function SotaPillAction({ href, onClick, icon, label, variant = 'default' }: SotaPillActionProps) {
    const baseClasses = "group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-out will-change-transform"
    
    const variants = {
        default: "bg-sf-0 border border-sf-2 shadow-sm hover:shadow-md hover:border-brand-500/30 text-tx hover:-translate-y-0.5",
        brand: "bg-gradient-to-r from-brand-600 to-brand-500 border border-brand-400 text-white shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5",
        glass: "bg-white/5 backdrop-blur-md border border-white/10 text-tx hover:bg-white/10 hover:-translate-y-0.5"
    }

    const content = (
        <>
            <span className={`flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${variant === 'default' || variant === 'glass' ? 'text-brand-500 dark:text-brand-400' : 'text-white'}`}>
                {icon}
            </span>
            <span className="tracking-wide relative">
                {label}
            </span>
        </>
    )

    if (href) {
        return (
            <Link href={href} className={`${baseClasses} ${variants[variant]}`}>
                {content}
            </Link>
        )
    }

    return (
        <button onClick={onClick} className={`${baseClasses} ${variants[variant]}`}>
            {content}
        </button>
    )
}
