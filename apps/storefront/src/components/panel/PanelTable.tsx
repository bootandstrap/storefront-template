'use client'

/**
 * PanelTable — Responsive table primitive with UUI design tokens.
 *
 * Features:
 * - Responsive overflow-x-auto with scroll fade indicators
 * - Sticky header option
 * - Hover row highlighting
 * - Semantic <table> elements
 * - Dark mode support
 * - Composable via Table, Thead, Tbody, Tr, Th, Td exports
 *
 * Usage:
 * ```tsx
 * <PanelTable>
 *   <PanelThead>
 *     <PanelTr>
 *       <PanelTh>Name</PanelTh>
 *       <PanelTh align="right">Price</PanelTh>
 *     </PanelTr>
 *   </PanelThead>
 *   <PanelTbody>
 *     <PanelTr>
 *       <PanelTd>Widget</PanelTd>
 *       <PanelTd align="right">$9.99</PanelTd>
 *     </PanelTr>
 *   </PanelTbody>
 * </PanelTable>
 * ```
 */

import { type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes, type HTMLAttributes, useRef, useEffect, useState, useCallback } from 'react'

// ─── Wrapper ──────────────────────────────────────────────────────────────────

interface PanelTableProps {
    children: ReactNode
    /** Show sticky header */
    stickyHeader?: boolean
    /** Additional className on the wrapper */
    className?: string
    /** aria-label for the table region */
    ariaLabel?: string
}

export default function PanelTable({
    children,
    stickyHeader = false,
    className = '',
    ariaLabel,
}: PanelTableProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)

    const checkScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        setCanScrollLeft(el.scrollLeft > 2)
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
    }, [])

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        checkScroll()
        el.addEventListener('scroll', checkScroll, { passive: true })
        const ro = new ResizeObserver(checkScroll)
        ro.observe(el)
        return () => {
            el.removeEventListener('scroll', checkScroll)
            ro.disconnect()
        }
    }, [checkScroll])

    return (
        <div className={`relative ${className}`} role="region" aria-label={ariaLabel} tabIndex={0}>
            {/* Left fade */}
            <div
                className={`pointer-events-none absolute left-0 top-0 bottom-0 w-6
                            bg-gradient-to-r from-surface-0 to-transparent z-10
                            transition-opacity duration-200
                            ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden="true"
            />
            {/* Right fade */}
            <div
                className={`pointer-events-none absolute right-0 top-0 bottom-0 w-6
                            bg-gradient-to-l from-surface-0 to-transparent z-10
                            transition-opacity duration-200
                            ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden="true"
            />

            <div ref={scrollRef} className="overflow-x-auto">
                <table
                    className={`w-full text-sm ${stickyHeader ? '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10' : ''}`}
                >
                    {children}
                </table>
            </div>
        </div>
    )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

export function PanelThead({ children, className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <thead
            className={`bg-sf-0 dark:bg-sf-1 border-b border-sf-3 ${className}`}
            {...props}
        >
            {children}
        </thead>
    )
}

export function PanelTbody({ children, className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
    return (
        <tbody className={`divide-y divide-surface-2 ${className}`} {...props}>
            {children}
        </tbody>
    )
}

export function PanelTr({ children, className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr
            className={`transition-colors hover:bg-glass dark:hover:bg-glass ${className}`}
            {...props}
        >
            {children}
        </tr>
    )
}

interface PanelThProps extends ThHTMLAttributes<HTMLTableCellElement> {
    align?: 'left' | 'center' | 'right'
}

export function PanelTh({ children, align = 'left', className = '', ...props }: PanelThProps) {
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    return (
        <th
            className={`px-4 py-3 text-xs font-semibold text-tx-muted uppercase tracking-wider ${alignClass} ${className}`}
            {...props}
        >
            {children}
        </th>
    )
}

interface PanelTdProps extends TdHTMLAttributes<HTMLTableCellElement> {
    align?: 'left' | 'center' | 'right'
}

export function PanelTd({ children, align = 'left', className = '', ...props }: PanelTdProps) {
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
    return (
        <td
            className={`px-4 py-3 text-tx whitespace-nowrap ${alignClass} ${className}`}
            {...props}
        >
            {children}
        </td>
    )
}
