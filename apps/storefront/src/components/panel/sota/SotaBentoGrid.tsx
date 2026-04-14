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
    // For responsive objects, we build CSS custom properties and use a
    // single inline style that adapts. Since the grid columns change at
    // breakpoints (1 → 6 → 12), we must clamp spans accordingly.
    const buildResponsiveStyle = (): React.CSSProperties => {
        const base: React.CSSProperties = { minWidth: 0 }

        // Handle colSpan
        if (colSpan) {
            if (typeof colSpan === 'number') {
                base.gridColumn = `span ${colSpan} / span ${colSpan}`
            } else if (colSpan === 'auto') {
                base.gridColumn = 'auto'
            } else if (colSpan === 'full') {
                base.gridColumn = '1 / -1'
            } else {
                // Responsive object — use the base value (mobile first)
                // On mobile, grid is 1 col, so always full width
                // On md (6 cols), use sm/md values
                // On lg (12 cols), use lg/xl values
                const mobileVal = colSpan.base ?? 12
                const lgVal = colSpan.lg ?? colSpan.md ?? colSpan.sm ?? mobileVal
                
                if (mobileVal === 'full' || mobileVal === 12) {
                    // Mobile: always full-width (the grid is 1 col anyway)
                    base.gridColumn = `span ${typeof lgVal === 'number' ? lgVal : 12} / span ${typeof lgVal === 'number' ? lgVal : 12}`
                } else {
                    const v = typeof lgVal === 'number' ? lgVal : 12
                    base.gridColumn = `span ${v} / span ${v}`
                }
            }
        }

        // Handle rowSpan
        if (rowSpan) {
            if (typeof rowSpan === 'number') {
                base.gridRow = `span ${rowSpan} / span ${rowSpan}`
            } else if (rowSpan === 'auto') {
                base.gridRow = 'auto'
            } else if (rowSpan === 'full') {
                base.gridRow = '1 / -1'
            } else {
                const value = rowSpan.xl ?? rowSpan.lg ?? rowSpan.md ?? rowSpan.sm ?? rowSpan.base
                if (value && typeof value === 'number') {
                    base.gridRow = `span ${value} / span ${value}`
                }
            }
        }

        return base
    }

    return (
        <div style={buildResponsiveStyle()} className={className || undefined}>
            {children}
        </div>
    )
}
