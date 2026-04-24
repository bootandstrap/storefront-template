/**
 * ModuleShell — Unified module page wrapper (SOTA 2026)
 *
 * Standard shell for ALL 9 module pages in the owner panel.
 * Provides consistent structure:
 *   1. Header with icon, title, tier badge, and usage meter
 *   2. Feature gate (handles locked state with value-rich ghost preview)
 *   3. Content slot
 *   4. Optional config section at bottom
 *
 * Inspired by Shopify's modular card architecture + Medusa v2 injection zones.
 *
 * @module components/panel/ModuleShell
 */

import React from 'react'
import {
    Lock,
    Sparkles,
    ArrowUpRight,
    ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { PageEntrance } from '@/components/panel/PanelAnimations'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ModuleShellTierInfo {
    /** Current tier name (e.g., "Básico", "Pro", "Enterprise") */
    currentTier: string
    /** Module key for upgrade link (e.g., "crm", "chatbot") */
    moduleKey: string
    /** What the next tier would unlock (brief list) */
    nextTierFeatures?: string[]
    /** Next tier name */
    nextTierName?: string
    /** Monthly price of the next tier */
    nextTierPrice?: number
}

export interface ModuleShellUsageMeter {
    /** Current usage count */
    current: number
    /** Maximum allowed by current tier */
    max: number
    /** Descriptive label (e.g., "contactos", "mensajes/mes", "emails/mes") */
    label: string
}

interface ModuleShellProps {
    /** Module icon (typically Lucide icon) */
    icon: React.ReactNode
    /** Module title */
    title: string
    /** Module subtitle / description */
    subtitle?: string
    /** Whether the module is locked (feature not purchased) */
    isLocked: boolean
    /** Primary feature flag name (for analytics/logging) */
    gateFlag: string
    /** Tier information for the badge & upgrade prompts */
    tierInfo?: ModuleShellTierInfo
    /** Optional usage meter (contacts, messages, etc.) */
    usageMeter?: ModuleShellUsageMeter
    /** Panel language */
    lang: string
    /** Children — the module's actual content */
    children: React.ReactNode
    /** Labels for i18n */
    labels?: {
        premiumFeature?: string
        upgrade?: string
        currentPlan?: string
        usageOf?: string
        unlockFeatures?: string
    }
}

// ── Usage Progress Bar ──────────────────────────────────────────────────

function UsageMeter({ meter, labels }: { meter: ModuleShellUsageMeter; labels?: ModuleShellProps['labels'] }) {
    const percentage = meter.max > 0 ? Math.min(100, (meter.current / meter.max) * 100) : 0
    const isNearLimit = percentage >= 80
    const isAtLimit = percentage >= 95

    return (
        <div className="flex items-center gap-3 min-w-[180px]">
            <div className="flex-1">
                <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="font-medium text-tx-sec">
                        {meter.current.toLocaleString()} / {meter.max >= 99999 ? '∞' : meter.max.toLocaleString()} {meter.label}
                    </span>
                    {isNearLimit && !isAtLimit && (
                        <span className="text-amber-500 font-semibold">⚠️</span>
                    )}
                    {isAtLimit && (
                        <span className="text-red-500 font-semibold">🔴</span>
                    )}
                </div>
                <div className="h-1.5 bg-sf-ter rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            isAtLimit ? 'bg-red-500' :
                            isNearLimit ? 'bg-amber-500' :
                            'bg-brand'
                        }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </div>
    )
}

// ── Tier Badge ──────────────────────────────────────────────────────────

function TierBadge({ tierInfo, lang }: { tierInfo: ModuleShellTierInfo; lang: string }) {
    return (
        <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[11px] font-bold uppercase tracking-wider border border-brand/20">
                <Sparkles className="w-3 h-3" />
                {tierInfo.currentTier}
            </span>
            {tierInfo.nextTierName && (
                <Link
                    href={`/${lang}/panel/modulos`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-tx-ter hover:text-brand hover:bg-brand/5 transition-colors border border-sf-3/30"
                >
                    <ArrowUpRight className="w-3 h-3" />
                    {tierInfo.nextTierName}
                </Link>
            )}
        </div>
    )
}

// ── Locked State ────────────────────────────────────────────────────────

function LockedOverlay({
    icon,
    title,
    subtitle,
    tierInfo,
    lang,
    labels,
}: {
    icon: React.ReactNode
    title: string
    subtitle?: string
    tierInfo?: ModuleShellTierInfo
    lang: string
    labels?: ModuleShellProps['labels']
}) {
    return (
        <div className="sota-glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sf-sec border border-sf-3/30 flex items-center justify-center mx-auto mb-4 text-tx-ter">
                <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-tx-pri mb-2">{title}</h2>
            {subtitle && (
                <p className="text-sm text-tx-sec mb-6 max-w-md mx-auto">{subtitle}</p>
            )}

            {/* Value proposition — show what they'd unlock */}
            {tierInfo?.nextTierFeatures && tierInfo.nextTierFeatures.length > 0 && (
                <div className="bg-sf-sec/50 rounded-xl p-4 mb-6 max-w-sm mx-auto border border-sf-3/20">
                    <p className="text-xs font-semibold text-tx-sec mb-3 uppercase tracking-wider">
                        {labels?.unlockFeatures || 'Con este módulo podrás:'}
                    </p>
                    <ul className="space-y-2 text-left">
                        {tierInfo.nextTierFeatures.map((feat, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-tx-pri">
                                <ChevronRight className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                                {feat}
                            </li>
                        ))}
                    </ul>
                    {tierInfo.nextTierPrice && (
                        <p className="mt-3 pt-3 border-t border-sf-3/20 text-xs text-tx-sec">
                            Desde <span className="font-bold text-brand">CHF {tierInfo.nextTierPrice}/mes</span>
                        </p>
                    )}
                </div>
            )}

            <Link
                href={`/${lang}/panel/modulos`}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-xl font-semibold text-sm hover:bg-brand/90 transition-colors shadow-lg shadow-brand/25"
            >
                <Sparkles className="w-4 h-4" />
                {labels?.upgrade || 'Ver módulos disponibles'}
            </Link>
        </div>
    )
}

// ── Main Component ──────────────────────────────────────────────────────

export default function ModuleShell({
    icon,
    title,
    subtitle,
    isLocked,
    gateFlag,
    tierInfo,
    usageMeter,
    lang,
    children,
    labels,
}: ModuleShellProps) {
    if (isLocked) {
        return (
            <PageEntrance>
                <LockedOverlay
                    icon={icon}
                    title={title}
                    subtitle={subtitle}
                    tierInfo={tierInfo}
                    lang={lang}
                    labels={labels}
                />
            </PageEntrance>
        )
    }

    return (
        <PageEntrance>
            <div className="space-y-6">
                {/* ── Module Header ────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-brand/10 text-brand border border-brand/20">
                            {icon}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-tx-pri">{title}</h1>
                            {subtitle && (
                                <p className="text-xs text-tx-sec mt-0.5">{subtitle}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {usageMeter && <UsageMeter meter={usageMeter} labels={labels} />}
                        {tierInfo && <TierBadge tierInfo={tierInfo} lang={lang} />}
                    </div>
                </div>

                {/* ── Module Content ───────────────────────────────── */}
                {children}
            </div>
        </PageEntrance>
    )
}
