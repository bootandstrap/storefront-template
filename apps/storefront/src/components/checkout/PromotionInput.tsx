'use client'

import { useState, useCallback, useRef } from 'react'
import { useI18n } from '@/lib/i18n/provider'
import { Tag, X, Loader2, Check } from 'lucide-react'
import { firePromoConfetti } from '@/lib/confetti'

interface PromotionInputProps {
    cartId: string
    onApplied?: (code: string) => void
    onRemoved?: () => void
}

export default function PromotionInput({ cartId, onApplied, onRemoved }: PromotionInputProps) {
    const { t } = useI18n()
    const [code, setCode] = useState('')
    const [appliedCode, setAppliedCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(false)
    const formRef = useRef<HTMLDivElement>(null)

    const handleApply = useCallback(async () => {
        if (!code.trim() || !cartId) return
        setLoading(true)
        setError(null)

        try {
            const res = await fetch(`/api/cart/promotions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cartId, code: code.trim() }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Invalid code')
            }

            setAppliedCode(code.trim())
            setCode('')
            onApplied?.(code.trim())
            // 🎉 Success confetti
            firePromoConfetti()
        } catch (err) {
            const msg = err instanceof Error ? err.message : t('promotions.invalidCode') || 'Invalid discount code'
            setError(msg)
            // 🫨 Shake animation on error
            formRef.current?.classList.add('animate-shake')
            setTimeout(() => formRef.current?.classList.remove('animate-shake'), 500)
        } finally {
            setLoading(false)
        }
    }, [code, cartId, onApplied, t])

    const handleRemove = useCallback(async () => {
        if (!cartId || !appliedCode) return
        setLoading(true)

        try {
            await fetch(`/api/cart/promotions`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cartId, code: appliedCode }),
            })

            setAppliedCode(null)
            onRemoved?.()
        } catch {
            // Silently fail — user can retry
        } finally {
            setLoading(false)
        }
    }, [cartId, appliedCode, onRemoved])

    // Applied state — green pill with checkmark
    if (appliedCode) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-fade-in">
                <Check size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-green-700 dark:text-green-400">
                    {appliedCode}
                </span>
                <button
                    type="button"
                    onClick={handleRemove}
                    disabled={loading}
                    className="p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
                    aria-label="Remove discount code"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                </button>
            </div>
        )
    }

    // Collapsed state — clickable text link
    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex items-center gap-2 text-sm text-brand hover:text-brand-light transition-colors"
            >
                <Tag size={14} />
                {t('promotions.haveCode') || 'Have a discount code?'}
            </button>
        )
    }

    // Expanded input state
    return (
        <div ref={formRef} className="space-y-1.5">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null) }}
                    placeholder={t('promotions.codePlaceholder') || 'Enter code'}
                    className="input flex-1 text-sm uppercase tracking-wider"
                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                    disabled={loading}
                    autoFocus
                />
                <button
                    type="button"
                    onClick={handleApply}
                    disabled={loading || !code.trim()}
                    className="btn btn-primary px-4 py-2 text-sm"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : (t('promotions.apply') || 'Apply')}
                </button>
            </div>
            {error && (
                <p className="text-xs text-red-500 animate-fade-in">{error}</p>
            )}
        </div>
    )
}
