'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CircleDollarSign } from 'lucide-react'
import { setCurrencyCookie } from '@/lib/i18n/actions'
import { SUPPORTED_CURRENCIES, type CurrencyInfo } from '@/lib/i18n/currencies'
import { useCart } from '@/contexts/CartContext'

interface CurrencySelectorProps {
    activeCurrencies: string[]
    currentCurrency: string
    maxCurrencies?: number
}

export default function CurrencySelector({ activeCurrencies, currentCurrency, maxCurrencies }: CurrencySelectorProps) {
    const router = useRouter()
    const { resetCart } = useCart()
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const ref = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    // Filter to only active + valid currencies, capped by plan limit
    let currencies = SUPPORTED_CURRENCIES.filter((c) =>
        activeCurrencies.includes(c.code)
    )
    if (maxCurrencies && maxCurrencies > 0) {
        currencies = currencies.slice(0, maxCurrencies)
    }

    // Don't render if only 1 currency
    if (currencies.length <= 1) return null

    const current = SUPPORTED_CURRENCIES.find((c) => c.code === currentCurrency) ?? currencies[0]

    function switchCurrency(info: CurrencyInfo) {
        setOpen(false)
        startTransition(async () => {
            await setCurrencyCookie(info.code)
            resetCart() // Invalidate stale cart (wrong currency)
            router.refresh()
        })
    }

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-tx-sec hover:text-brand hover:bg-sf-1 transition-all ${isPending ? 'opacity-50' : ''
                    }`}
                aria-label="Change currency"
                disabled={isPending}
            >
                <CircleDollarSign className="w-4 h-4" />
                <span className="uppercase text-xs font-bold">{current.code}</span>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] glass-strong rounded-xl border border-sf-3 shadow-xl z-50 animate-slide-up">
                    {currencies.map((c) => {
                        const isActive = c.code === currentCurrency
                        return (
                            <button
                                key={c.code}
                                onClick={() => switchCurrency(c)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${isActive
                                    ? 'bg-brand-subtle text-brand font-semibold'
                                    : 'text-tx-sec hover:bg-sf-1 hover:text-tx'
                                    }`}
                            >
                                <span className="text-lg">{c.flag}</span>
                                <span>{c.name}</span>
                                <span className="ml-auto text-tx-muted text-xs uppercase">{c.symbol}</span>
                                {isActive && (
                                    <span className="text-brand text-xs">✓</span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
