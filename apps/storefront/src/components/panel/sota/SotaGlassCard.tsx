import React from 'react'

interface SotaGlassCardProps {
    children: React.ReactNode
    className?: string
    /** Adds internal padding (default true) */
    padded?: boolean
    /** Add a colored top inset glow */
    glowColor?: 'brand' | 'accent' | 'danger' | 'warning' | 'blue' | 'purple' | 'gold' | 'emerald' | 'none'
    /** Render as a specific HTML tag */
    as?: React.ElementType
    /** Click handler if the card is interactive */
    onClick?: () => void
    /** Whether to hide overflow, useful for tables inside the card */
    overflowHidden?: boolean
}

export function SotaGlassCard({ 
    children, 
    className = '', 
    padded = true, 
    glowColor = 'none',
    as: Component = 'div',
    onClick,
    overflowHidden = false
}: SotaGlassCardProps) {
    const isInteractive = !!onClick
    
    // Mapping glow colors to tailwind radial gradients for the top-center 
    const glowMap = {
        brand: 'radial-gradient(ellipse at top, rgba(139, 195, 74, 0.15) 0%, transparent 70%)',
        accent: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        danger: 'radial-gradient(ellipse at top, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
        warning: 'radial-gradient(ellipse at top, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
        blue: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
        purple: 'radial-gradient(ellipse at top, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
        gold: 'radial-gradient(ellipse at top, rgba(234, 179, 8, 0.15) 0%, transparent 70%)',
        emerald: 'radial-gradient(ellipse at top, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
        none: 'none'
    }

    return (
        <Component 
            className={`sota-glass-card ${padded ? 'p-5 md:p-6 lg:p-8' : ''} ${isInteractive ? 'cursor-pointer' : ''} ${overflowHidden ? 'overflow-hidden' : ''} ${className}`}
            onClick={onClick}
            style={{
                // Inject the specific glow color at the top of the card
                backgroundImage: glowColor !== 'none' ? glowMap[glowColor] : undefined
            }}
        >
            {/* The film grain overlay for tactile SOTA feel */}
            <div className="sota-noise-overlay" />
            
            {/* Inner Content Container (z-10 ensures it stays above the noise mask) */}
            <div className="relative z-10 h-full flex flex-col">
                {children}
            </div>
        </Component>
    )
}
