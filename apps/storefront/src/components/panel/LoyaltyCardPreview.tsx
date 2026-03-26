'use client'

/**
 * LoyaltyCardPreview — Digital Loyalty Card Component
 *
 * Visual loyalty card with:
 * - Business branding
 * - Stamp grid (filled/empty stars)
 * - Progress bar
 * - QR code for customer identification
 * - Printable format (80mm thermal compatible)
 */

import { QRCodeSVG } from 'qrcode.react'
import {
    type LoyaltyConfig,
    type LoyaltyCustomer,
    getStampProgress,
    generateLoyaltyQRPayload,
} from '@/lib/pos/loyalty-engine'
import { Star, Gift, Trophy } from 'lucide-react'

interface LoyaltyCardLabels {
    stamps: string
    redeem: string
    qrHint: string
    progress: string
    complete: string
}

const FALLBACK_LABELS: LoyaltyCardLabels = {
    stamps: 'stamps',
    redeem: 'Canjear',
    qrHint: 'Presenta este QR en cada compra',
    progress: '{{current}}/{{total}} stamps',
    complete: '¡Completado!',
}

interface LoyaltyCardPreviewProps {
    customer: LoyaltyCustomer
    config: LoyaltyConfig
    storeUrl?: string
    lang?: string
    /** compact = inline card, full = printable standalone */
    variant?: 'compact' | 'full'
    onRedeem?: () => void
    /** i18n labels — Spanish fallbacks if omitted */
    labels?: LoyaltyCardLabels
}

export default function LoyaltyCardPreview({
    customer,
    config,
    storeUrl = '',
    lang = 'es',
    variant = 'compact',
    onRedeem,
    labels: externalLabels,
}: LoyaltyCardPreviewProps) {
    const l = externalLabels ?? FALLBACK_LABELS
    const progress = getStampProgress(customer, config)
    const qrPayload = generateLoyaltyQRPayload(customer.customerId, storeUrl, lang)

    const isCompact = variant === 'compact'

    return (
        <div
            className={`
                relative overflow-hidden rounded-2xl border
                ${isCompact
                    ? 'bg-surface-1 border-surface-3 p-4'
                    : 'bg-white border-gray-200 p-6 max-w-[80mm] mx-auto print:shadow-none'
                }
            `}
            style={!isCompact ? { width: '80mm' } : undefined}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className={`font-bold font-display ${isCompact ? 'text-sm text-text-primary' : 'text-base text-gray-900'}`}>
                        {config.businessName || 'Loyalty Card'}
                    </h3>
                    <p className={`text-xs ${isCompact ? 'text-text-muted' : 'text-gray-500'}`}>
                        {customer.customerName}
                    </p>
                </div>
                <div className={`p-2 rounded-xl ${isCompact ? 'bg-primary/10' : 'bg-amber-50'}`}>
                    <Trophy className={`w-5 h-5 ${isCompact ? 'text-primary' : 'text-amber-600'}`} />
                </div>
            </div>

            {/* Stamp Grid */}
            <div className="grid grid-cols-5 gap-2 mb-3">
                {Array.from({ length: config.stampsRequired }, (_, i) => (
                    <div
                        key={i}
                        className={`
                            flex items-center justify-center aspect-square rounded-lg transition-all duration-300
                            ${i < customer.stamps
                                ? isCompact
                                    ? 'bg-primary/15 text-primary scale-100'
                                    : 'bg-amber-100 text-amber-600 scale-100'
                                : isCompact
                                    ? 'bg-surface-2 text-text-muted/30'
                                    : 'bg-gray-100 text-gray-300'
                            }
                        `}
                    >
                        <Star
                            className="w-4 h-4"
                            fill={i < customer.stamps ? 'currentColor' : 'none'}
                        />
                    </div>
                ))}
            </div>

            {/* Progress */}
            <div className="mb-3">
                <div className={`flex items-center justify-between text-xs mb-1 ${isCompact ? 'text-text-muted' : 'text-gray-500'}`}>
                    <span>{progress.current}/{progress.required} {l.stamps}</span>
                    <span>{progress.percentage}%</span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isCompact ? 'bg-surface-2' : 'bg-gray-100'}`}>
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            progress.isComplete
                                ? 'bg-emerald-500'
                                : isCompact ? 'bg-primary' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
            </div>

            {/* Reward info */}
            <div className={`
                flex items-center gap-2 px-3 py-2 rounded-xl text-xs
                ${progress.isComplete
                    ? isCompact
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isCompact
                        ? 'bg-surface-2 text-text-muted'
                        : 'bg-gray-50 text-gray-500'
                }
            `}>
                <Gift className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1">
                    {progress.isComplete ? '🎉 ' : ''}{config.rewardDescription}
                </span>
                {progress.isComplete && onRedeem && (
                    <button
                        type="button"
                        onClick={onRedeem}
                        className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                    >
                        {l.redeem}
                    </button>
                )}
            </div>

            {/* QR Code */}
            <div className="flex justify-center mt-4">
                <div className={`p-2 rounded-xl ${isCompact ? 'bg-white' : 'bg-white border border-gray-200'}`}>
                    <QRCodeSVG
                        value={qrPayload}
                        size={isCompact ? 64 : 96}
                        level="M"
                        includeMargin={false}
                    />
                </div>
            </div>

            {/* Footer */}
            {!isCompact && (
                <p className="text-center text-[9px] text-gray-400 mt-2">
                    {l.qrHint}
                </p>
            )}

            {/* Total redeemed badge */}
            {customer.totalRedeemed > 0 && (
                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isCompact ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'
                }`}>
                    ×{customer.totalRedeemed}
                </div>
            )}
        </div>
    )
}
