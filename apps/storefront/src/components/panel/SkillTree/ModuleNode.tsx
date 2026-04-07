'use client'

/**
 * ModuleNode — Professional B2B skill tree node.
 *
 * Renders a clean glass card with:
 * - Lucide icon with category-colored ring
 * - Tier progress segments
 * - Subtle state indicators
 * - Professional action button
 *
 * States:
 *  Locked    — dimmed, subtle lock badge
 *  Available — neutral, pulsing ring invite
 *  Active    — accent border, lit tier segments
 *  Maxed     — gold accent, star badge
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Lock, Star, ChevronRight } from 'lucide-react'
import { getCategoryColor, type SkillTreeNodeData } from './skill-tree-layout'
import { getModuleIcon } from './lucide-icon-map'

// ── Tier Ring SVG ────────────────────────────────────────────────────────────
function TierRing({ total, active, color, state }: {
    total: number; active: number; color: string; state: string
}) {
    if (total === 0) return null
    const size = 52
    const strokeWidth = 3
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const segmentGap = 4 // gap in px between segments
    const totalGap = total * segmentGap
    const segmentLength = (circumference - totalGap) / total

    return (
        <svg width={size} height={size} className="absolute inset-0 m-auto" style={{ transform: 'rotate(-90deg)' }}>
            {Array.from({ length: total }, (_, i) => {
                const isLit = i < active
                const offset = i * (segmentLength + segmentGap)
                return (
                    <circle
                        key={i}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={isLit ? color : '#1e293b'}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        style={{
                            transition: 'stroke 0.4s ease',
                            filter: isLit ? `drop-shadow(0 0 2px ${color}80)` : 'none',
                        }}
                    />
                )
            })}
            {state === 'maxed' && (
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    opacity={0.3}
                >
                    <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3s" repeatCount="indefinite" />
                </circle>
            )}
        </svg>
    )
}

const FALLBACK_LABELS = {
    locked: 'Locked', available: 'Available', active: 'Active', maxed: 'Maxed',
    activate: 'Activate', upgrade: 'Upgrade', perMonth: '/mo', requires: 'Requires',
    treeTitle: 'Modules', treeTip: 'Scroll to explore', modules: 'Modules',
    tiers: 'Tiers', progress: 'Progress', categories: 'Categories', states: 'States',
}

function ModuleNodeInner({ data }: NodeProps) {
    const nodeData = data as unknown as SkillTreeNodeData
    const {
        module, state, currentTierName, nextTierPrice,
        totalTiers, activeTiers, onNodeClick,
    } = nodeData
    const labels = nodeData.labels ?? FALLBACK_LABELS
    const catColor = getCategoryColor(module.category)
    const IconComponent = getModuleIcon(module.icon_name || 'Package')

    // ── State styles ─────────────────────────────────────────────────────────
    const styles = {
        locked: {
            bg: 'rgba(15, 23, 42, 0.6)',
            border: '#1e293b',
            textColor: '#475569',
            iconColor: '#334155',
            iconBg: '#0f172a',
            opacity: 0.5,
            cursor: 'not-allowed' as const,
        },
        available: {
            bg: 'rgba(15, 23, 42, 0.85)',
            border: '#334155',
            textColor: '#cbd5e1',
            iconColor: catColor,
            iconBg: `${catColor}12`,
            opacity: 1,
            cursor: 'pointer' as const,
        },
        active: {
            bg: 'rgba(15, 23, 42, 0.9)',
            border: `${catColor}66`,
            textColor: '#e2e8f0',
            iconColor: catColor,
            iconBg: `${catColor}18`,
            opacity: 1,
            cursor: 'pointer' as const,
        },
        maxed: {
            bg: 'rgba(20, 17, 10, 0.9)',
            border: '#f59e0b55',
            textColor: '#fef3c7',
            iconColor: '#f59e0b',
            iconBg: '#f59e0b15',
            opacity: 1,
            cursor: 'pointer' as const,
        },
    }

    const s = styles[state]

    const actionConfig = {
        locked:    { label: labels.locked,   icon: Lock,         bg: '#1e293b', color: '#475569', disabled: true },
        available: { label: labels.activate, icon: ChevronRight, bg: `${catColor}18`, color: catColor, disabled: false },
        active:    { label: labels.upgrade,  icon: ChevronRight, bg: `${catColor}18`, color: catColor, disabled: false },
        maxed:     { label: labels.maxed,    icon: Star,         bg: '#f59e0b12', color: '#f59e0b', disabled: true },
    }

    const action = actionConfig[state]
    const ActionIcon = action.icon

    return (
        <div
            style={{
                width: 192,
                opacity: s.opacity,
                cursor: s.cursor,
                transition: 'all 0.3s ease',
            }}
            onClick={() => state !== 'locked' && onNodeClick(module.key)}
        >
            {/* Hidden handles */}
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: 'transparent', border: 'none', width: 1, height: 1, top: 0 }}
            />

            {/* ── Card ─────────────────────────────────────────────── */}
            <div style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 16,
                padding: '16px 14px 12px',
                backdropFilter: 'blur(12px)',
                transition: 'border-color 0.4s ease, background 0.4s ease',
                textAlign: 'center',
            }}>
                {/* Icon with tier ring */}
                <div style={{
                    position: 'relative',
                    width: 52,
                    height: 52,
                    margin: '0 auto 8px',
                }}>
                    <TierRing
                        total={totalTiers}
                        active={activeTiers}
                        color={state === 'maxed' ? '#f59e0b' : catColor}
                        state={state}
                    />
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: s.iconBg,
                    }}>
                        <IconComponent
                            size={20}
                            color={s.iconColor}
                            style={{
                                filter: state === 'locked' ? 'grayscale(100%)' : 'none',
                                transition: 'filter 0.3s ease',
                            }}
                        />
                    </div>

                    {/* Locked badge */}
                    {state === 'locked' && (
                        <div style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#1e293b',
                            border: '1.5px solid #334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Lock size={8} color="#475569" />
                        </div>
                    )}

                    {/* Maxed star badge */}
                    {state === 'maxed' && (
                        <div style={{
                            position: 'absolute',
                            bottom: -2,
                            right: -2,
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: '#422006',
                            border: '1.5px solid #f59e0b44',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Star size={8} color="#f59e0b" fill="#f59e0b" />
                        </div>
                    )}
                </div>

                {/* Module name */}
                <p style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    color: s.textColor,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                    letterSpacing: '-0.01em',
                }}>
                    {module.name}
                </p>

                {/* Tier name */}
                {currentTierName && (
                    <p style={{
                        margin: '2px 0 0',
                        fontSize: 9,
                        fontWeight: 600,
                        color: state === 'maxed' ? '#f59e0b' : catColor,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.08em',
                    }}>
                        {currentTierName}
                    </p>
                )}

                {/* Price */}
                {nextTierPrice !== null && state !== 'locked' && state !== 'maxed' && (
                    <p style={{
                        margin: '2px 0 0',
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#64748b',
                    }}>
                        {nextTierPrice} CHF{labels.perMonth}
                    </p>
                )}

                {/* Requires hint */}
                {state === 'locked' && module.requires.length > 0 && (
                    <p style={{
                        margin: '4px 0 0',
                        fontSize: 8,
                        color: '#475569',
                        fontStyle: 'italic',
                    }}>
                        {labels.requires} {module.requires.join(', ')}
                    </p>
                )}

                {/* Action button */}
                <button
                    style={{
                        marginTop: 8,
                        width: '100%',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '5px 0',
                        borderRadius: 8,
                        border: `1px solid ${action.color}30`,
                        background: action.bg,
                        color: action.color,
                        cursor: action.disabled ? 'default' : 'pointer',
                        letterSpacing: '0.02em',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (state !== 'locked') onNodeClick(module.key)
                    }}
                    disabled={action.disabled}
                >
                    <ActionIcon size={10} />
                    {action.label}
                </button>
            </div>

            {/* Bottom handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                style={{ background: 'transparent', border: 'none', width: 1, height: 1, bottom: 0 }}
            />
        </div>
    )
}

export const ModuleNode = memo(ModuleNodeInner)
