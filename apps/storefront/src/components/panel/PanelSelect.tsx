'use client'

/**
 * PanelSelect — Styled native <select> using UUI design tokens.
 *
 * Features:
 * - Custom chevron icon
 * - Focus-visible ring
 * - 44px minimum touch target
 * - Dark mode support
 * - Sizes: sm, md, lg
 *
 * Uses native <select> for maximum a11y (no custom dropdown needed).
 */

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

type SelectSize = 'sm' | 'md' | 'lg'

interface PanelSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    /** Visual size */
    size?: SelectSize
    /** Error state */
    error?: boolean
    /** Optional label displayed above */
    label?: string
    /** Helper text below */
    helperText?: string
    /** Full-width mode */
    fullWidth?: boolean
}

const sizeStyles: Record<SelectSize, string> = {
    sm: 'h-9 text-sm pl-3 pr-8',
    md: 'h-11 text-sm pl-3.5 pr-9',
    lg: 'h-12 text-base pl-4 pr-10',
}

const PanelSelect = forwardRef<HTMLSelectElement, PanelSelectProps>(
    function PanelSelect(
        {
            size = 'md',
            error = false,
            label,
            helperText,
            fullWidth = false,
            className = '',
            id,
            children,
            ...props
        },
        ref
    ) {
        const selectId = id || `panel-select-${Math.random().toString(36).slice(2, 8)}`

        return (
            <div className={`${fullWidth ? 'w-full' : 'inline-flex flex-col'}`}>
                {label && (
                    <label
                        htmlFor={selectId}
                        className="text-sm font-medium text-text-secondary mb-1.5 block"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={`
                            appearance-none rounded-xl
                            bg-surface-0 text-text-primary
                            border border-surface-3
                            transition-colors duration-150
                            cursor-pointer
                            focus-visible:outline-none
                            focus-visible:ring-2 focus-visible:ring-primary/40
                            focus-visible:border-primary
                            hover:border-surface-4
                            disabled:opacity-50 disabled:cursor-not-allowed
                            ${error ? 'border-error-500 focus-visible:ring-error-500/40' : ''}
                            ${sizeStyles[size]}
                            ${fullWidth ? 'w-full' : ''}
                            ${className}
                        `}
                        {...props}
                    >
                        {children}
                    </select>
                    <ChevronDown
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                        aria-hidden="true"
                    />
                </div>
                {helperText && (
                    <p
                        className={`text-xs mt-1.5 ${
                            error ? 'text-error-500' : 'text-text-muted'
                        }`}
                    >
                        {helperText}
                    </p>
                )}
            </div>
        )
    }
)

export default PanelSelect
