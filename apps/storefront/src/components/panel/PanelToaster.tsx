'use client'

/**
 * PanelToaster — Global toast provider for the Owner Panel
 *
 * Wraps `sonner` <Toaster> with panel-consistent theming.
 * Mount once in PanelShell. Call `toast()` from anywhere.
 *
 * Usage:
 *   import { toast } from 'sonner'
 *   toast.success('Product saved')
 *   toast.error('Failed to update')
 *   toast('Info message')
 */

import { Toaster } from 'sonner'

export default function PanelToaster() {
    return (
        <Toaster
            position="top-right"
            offset={16}
            gap={8}
            toastOptions={{
                style: {
                    background: 'var(--color-surface-1)',
                    color: 'var(--color-text-brand)',
                    border: '1px solid var(--color-surface-3)',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontFamily: 'var(--font-display), system-ui, sans-serif',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                },
                className: 'panel-toast',
            }}
            closeButton
            richColors
            expand={false}
        />
    )
}
