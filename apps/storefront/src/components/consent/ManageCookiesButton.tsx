'use client'

/**
 * Client Component — interactive "Manage cookies" button.
 * Extracted so the Footer can remain a Server Component.
 */
export default function ManageCookiesButton({ label }: { label: string }) {
    return (
        <button
            onClick={() => {
                try { localStorage.removeItem('bootandstrap_cookie_consent') } catch {}
                window.location.reload()
            }}
            className="text-sm text-tx-muted hover:text-brand transition-colors"
        >
            {label}
        </button>
    )
}
