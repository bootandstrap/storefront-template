import React from 'react'

interface SotaBentoGridProps {
    children: React.ReactNode
    className?: string
}

export function SotaBentoGrid({ children, className = '' }: SotaBentoGridProps) {
    return (
        <div className={`sota-bento-grid ${className}`}>
            {children}
        </div>
    )
}

export type SotaSpanValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | 'full'
export type SotaResponsiveSpan = SotaSpanValue | {
    base?: SotaSpanValue
    sm?: SotaSpanValue
    md?: SotaSpanValue
    lg?: SotaSpanValue
    xl?: SotaSpanValue
}

interface SotaBentoItemProps {
    children: React.ReactNode
    colSpan?: SotaResponsiveSpan
    rowSpan?: SotaResponsiveSpan
    className?: string
}

/**
 * Resolves a SotaResponsiveSpan to a single numeric value for the current
 * viewport concept. Since we're using runtime CSS (.sota-bento-grid) which
 * defines: mobile=1col, md(768)=6col, lg(1024)=12col, we use the largest
 * breakpoint value at render time and rely on responsive CSS for smaller.
 *
 * IMPORTANT: We use inline styles (grid-column: span N) because Tailwind v4
 * with @theme inline aggressively purges col-span-* utilities even with
 * static string maps. Inline styles are unpurgeable.
 */
function resolveSpanStyle(
    prefix: 'gridColumn' | 'gridRow',
    span?: SotaResponsiveSpan
): React.CSSProperties {
    if (!span) return {}

    // Simple scalar value → always span N
    if (typeof span === 'number') {
        return { [prefix]: `span ${span} / span ${span}` }
    }
    if (span === 'auto') {
        return { [prefix]: 'auto' }
    }
    if (span === 'full') {
        return { [prefix]: '1 / -1' }
    }

    // Responsive object → we pick the largest defined breakpoint
    // since the grid container already handles responsive column count via CSS
    const value = span.xl ?? span.lg ?? span.md ?? span.sm ?? span.base
    if (!value) return {}
    if (value === 'auto') return { [prefix]: 'auto' }
    if (value === 'full') return { [prefix]: '1 / -1' }
    return { [prefix]: `span ${value} / span ${value}` }
}

export function SotaBentoItem({
    children,
    colSpan,
    rowSpan,
    className = ''
}: SotaBentoItemProps) {
    const style: React.CSSProperties = {
        ...resolveSpanStyle('gridColumn', colSpan),
        ...resolveSpanStyle('gridRow', rowSpan),
    }

    return (
        <div style={style} className={className || undefined}>
            {children}
        </div>
    )
}
