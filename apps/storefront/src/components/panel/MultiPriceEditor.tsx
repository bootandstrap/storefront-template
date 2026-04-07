'use client'

/**
 * MultiPriceEditor — SOTA multi-currency price editor
 *
 * Renders a price input for each active currency with flag, symbol,
 * and locale-aware formatting. Used in CatalogClient and POS modals.
 *
 * Features:
 * - Flag emoji + currency code labels
 * - Zero-decimal currency detection (COP, CLP, JPY → no cents)
 * - Missing price warning badge per currency
 * - Animated add/remove rows
 * - Glassmorphism consistent with panel design system
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, AlertTriangle, X, DollarSign } from 'lucide-react'
import { CURRENCY_MAP, isZeroDecimal, type CurrencyInfo } from '@/lib/i18n/currencies'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultiPriceEditorProps {
    /** Map of currency_code → string value (user-typed) */
    prices: Record<string, string>
    /** Callback when prices change */
    onChange: (prices: Record<string, string>) => void
    /** Available currencies (from config.active_currencies) */
    activeCurrencies: string[]
    /** Default currency (always shown first, cannot be removed) */
    defaultCurrency: string
    /** Label for the section */
    label?: string
    /** Whether to show missing-price warnings */
    showWarnings?: boolean
    /** Disabled state */
    disabled?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MultiPriceEditor({
    prices,
    onChange,
    activeCurrencies,
    defaultCurrency,
    label = 'Precios',
    showWarnings = true,
    disabled = false,
}: MultiPriceEditorProps) {
    const [showAddMenu, setShowAddMenu] = useState(false)

    // Currencies currently present in the editor
    const activeCodes = Object.keys(prices)

    // Currencies that can still be added
    const addableCurrencies = activeCurrencies.filter(
        code => !activeCodes.includes(code)
    )

    const updatePrice = (code: string, value: string) => {
        onChange({ ...prices, [code]: value })
    }

    const removePrice = (code: string) => {
        if (code === defaultCurrency) return // Can't remove default
        const next = { ...prices }
        delete next[code]
        onChange(next)
    }

    const addCurrency = (code: string) => {
        onChange({ ...prices, [code]: '' })
        setShowAddMenu(false)
    }

    // Count missing prices for active currencies (for parent badge)
    const missingCount = activeCurrencies.filter(
        code => !prices[code] || prices[code].trim() === ''
    ).length

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-tx-muted" />
                    <span className="text-xs font-semibold text-tx-muted uppercase tracking-wide">
                        {label}
                    </span>
                    {showWarnings && missingCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                            <AlertTriangle className="w-3 h-3" />
                            {missingCount}
                        </motion.span>
                    )}
                </div>
            </div>

            {/* Price rows */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {activeCodes.map(code => {
                        const info = CURRENCY_MAP[code]
                        const isDefault = code === defaultCurrency
                        const zeroDecimal = isZeroDecimal(code)
                        const isEmpty = !prices[code] || prices[code].trim() === ''

                        return (
                            <motion.div
                                key={code}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className={`
                                    flex items-center gap-2 p-2 rounded-xl
                                    bg-sf-0/50 backdrop-blur-md border shadow-sm
                                    transition-all
                                    ${isEmpty && showWarnings
                                        ? 'border-amber-300/50 dark:border-amber-700/50'
                                        : 'border-sf-3/30'
                                    }
                                `}>
                                    {/* Currency badge */}
                                    <div className={`
                                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                                        min-w-[80px] text-sm font-medium
                                        ${isDefault
                                            ? 'bg-brand/10 text-brand dark:bg-brand/20'
                                            : 'bg-sf-1 text-tx-sec'
                                        }
                                    `}>
                                        <span className="text-base leading-none">
                                            {info?.flag ?? '💱'}
                                        </span>
                                        <span className="uppercase text-xs font-bold tracking-wider">
                                            {code}
                                        </span>
                                    </div>

                                    {/* Price input */}
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-tx-muted font-medium">
                                            {info?.symbol ?? '$'}
                                        </span>
                                        <input
                                            type="number"
                                            inputMode={zeroDecimal ? 'numeric' : 'decimal'}
                                            step={zeroDecimal ? '1' : '0.01'}
                                            min="0"
                                            value={prices[code] ?? ''}
                                            onChange={e => updatePrice(code, e.target.value)}
                                            disabled={disabled}
                                            placeholder={zeroDecimal ? '0' : '0.00'}
                                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-transparent text-sm text-tx
                                                       focus:outline-none focus:ring-2 focus:ring-soft transition-all
                                                       placeholder:text-tx-faint tabular-nums font-medium
                                                       [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                                                       [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>

                                    {/* Warning dot */}
                                    {showWarnings && isEmpty && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex-shrink-0"
                                            title="Sin precio configurado"
                                        >
                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        </motion.div>
                                    )}

                                    {/* Remove button (not for default) */}
                                    {!isDefault && (
                                        <button
                                            type="button"
                                            onClick={() => removePrice(code)}
                                            disabled={disabled}
                                            className="flex-shrink-0 p-1.5 rounded-lg text-tx-muted
                                                       hover:text-red-500 hover:bg-red-50
                                                       dark:hover:bg-red-900/20 transition-colors"
                                            aria-label={`Remove ${code} price`}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>
            </div>

            {/* Add currency button */}
            {addableCurrencies.length > 0 && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                   text-tx-sec hover:text-brand bg-sf-1 hover:bg-sf-2
                                   border border-sf-3/30 transition-all
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soft"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Añadir moneda
                    </button>

                    {/* Dropdown */}
                    <AnimatePresence>
                        {showAddMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 top-full mt-1 z-20
                                           bg-sf-0 backdrop-blur-xl border border-sf-3/30
                                           rounded-xl shadow-xl overflow-hidden min-w-[180px]"
                            >
                                {addableCurrencies.map(code => {
                                    const info = CURRENCY_MAP[code]
                                    return (
                                        <button
                                            key={code}
                                            type="button"
                                            onClick={() => addCurrency(code)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5
                                                       text-sm text-tx hover:bg-sf-1 transition-colors"
                                        >
                                            <span className="text-base leading-none">
                                                {info?.flag ?? '💱'}
                                            </span>
                                            <span className="font-medium uppercase text-xs tracking-wider">
                                                {code}
                                            </span>
                                            <span className="text-tx-muted text-xs">
                                                {info?.name ?? code}
                                            </span>
                                        </button>
                                    )
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Utility: convert form prices to Medusa format
// ---------------------------------------------------------------------------

export interface MedusaPriceEntry {
    amount: number
    currency_code: string
}

/**
 * Convert the editor's Record<string, string> to Medusa's prices array.
 * Handles zero-decimal currencies correctly (no ×100 for COP, CLP, etc.)
 */
export function formPricesToMedusa(
    prices: Record<string, string>
): MedusaPriceEntry[] {
    return Object.entries(prices)
        .filter(([, val]) => val && val.trim() !== '' && parseFloat(val) >= 0)
        .map(([code, val]) => {
            const amount = parseFloat(val)
            return {
                amount: isZeroDecimal(code) ? Math.round(amount) : Math.round(amount * 100),
                currency_code: code,
            }
        })
}

/**
 * Convert Medusa prices array back to the editor's format.
 * Handles zero-decimal currencies correctly.
 */
export function medusaPricesToForm(
    prices: { amount: number; currency_code: string }[] | undefined
): Record<string, string> {
    if (!prices) return {}
    const result: Record<string, string> = {}
    for (const p of prices) {
        const code = p.currency_code.toLowerCase()
        const displayAmount = isZeroDecimal(code) ? p.amount : p.amount / 100
        result[code] = String(displayAmount)
    }
    return result
}
