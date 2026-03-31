'use client'

/**
 * ModuleNode — WoW-style hexagonal skill tree node.
 *
 * Renders a hexagonal SVG node with glow effects, tier diamonds,
 * and RPG-style visual states for the BootandStrap module marketplace.
 *
 * States:
 *  🔒 Locked   — dim, greyscale, padlock overlay
 *  ⬜ Available — dashed hex border, pulsing glow invite
 *  ✅ Active   — solid glow, tier diamonds lit, energy ring
 *  🏆 Maxed    — gold glow, sparkle animation, legendary border
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { getCategoryColor, type SkillTreeNodeData } from './skill-tree-layout'

// ── Hex SVG path (pointy-top, 60×70 viewport) ──────────────────────────────
const HEX_PATH = 'M30,2 L56,18 L56,52 L30,68 L4,52 L4,18 Z'

function ModuleNodeInner({ data }: NodeProps) {
    const nodeData = data as unknown as SkillTreeNodeData
    const {
        module, state, currentTierName, nextTierName,
        nextTierPrice, totalTiers, activeTiers, onNodeClick,
    } = nodeData
    const catColor = getCategoryColor(module.category)
    const isExtension = module.payment_type === 'extension'

    // ── State config ────────────────────────────────────────────────────────
    const config = {
        locked: {
            hexFill: '#1a1f2e',
            hexStroke: '#2d3548',
            hexStrokeWidth: 1.5,
            hexDash: '4 2',
            glowColor: 'transparent',
            glowIntensity: 0,
            textColor: '#4a5568',
            badgeBg: '#2d3548',
            badgeText: '#4a5568',
            opacity: 0.5,
            cursor: 'not-allowed' as const,
            actionBg: '#1e2438',
            actionText: '#4a5568',
            actionBorder: '#2d3548',
        },
        available: {
            hexFill: '#0f1729',
            hexStroke: catColor,
            hexStrokeWidth: 2,
            hexDash: '5 3',
            glowColor: catColor,
            glowIntensity: 0.3,
            textColor: '#e2e8f0',
            badgeBg: `${catColor}22`,
            badgeText: catColor,
            opacity: 1,
            cursor: 'pointer' as const,
            actionBg: `${catColor}18`,
            actionText: catColor,
            actionBorder: `${catColor}44`,
        },
        active: {
            hexFill: '#0c1322',
            hexStroke: catColor,
            hexStrokeWidth: 2.5,
            hexDash: undefined as string | undefined,
            glowColor: catColor,
            glowIntensity: 0.6,
            textColor: '#f1f5f9',
            badgeBg: `${catColor}30`,
            badgeText: catColor,
            opacity: 1,
            cursor: 'pointer' as const,
            actionBg: `${catColor}22`,
            actionText: catColor,
            actionBorder: `${catColor}55`,
        },
        maxed: {
            hexFill: '#1a1508',
            hexStroke: '#f59e0b',
            hexStrokeWidth: 2.5,
            hexDash: undefined as string | undefined,
            glowColor: '#f59e0b',
            glowIntensity: 0.8,
            textColor: '#fef3c7',
            badgeBg: '#f59e0b22',
            badgeText: '#f59e0b',
            opacity: 1,
            cursor: 'pointer' as const,
            actionBg: '#f59e0b18',
            actionText: '#f59e0b',
            actionBorder: '#f59e0b55',
        },
    }

    const c = config[state]

    // ── Action labels ───────────────────────────────────────────────────────
    const actionLabel = {
        locked: '🔒 Bloqueado',
        available: '⚡ Activar',
        active: '🚀 Mejorar',
        maxed: '✨ Máximo',
    }[state]

    // Unique filter ID per node
    const filterId = `glow-${module.key}`
    const pulseId = `pulse-${module.key}`

    return (
        <div
            style={{
                width: 200,
                opacity: c.opacity,
                cursor: c.cursor,
                position: 'relative',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onClick={() => state !== 'locked' && onNodeClick(module.key)}
        >
            {/* Hidden handles for React Flow edge connections */}
            <Handle
                type="target"
                position={Position.Top}
                style={{ background: 'transparent', border: 'none', width: 1, height: 1, top: 0 }}
            />

            {/* ── Hexagonal Icon ──────────────────────────────────── */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: -4,
                position: 'relative',
            }}>
                <svg
                    width="80" height="92"
                    viewBox="0 0 60 70"
                    style={{
                        filter: c.glowIntensity > 0
                            ? `drop-shadow(0 0 ${8 * c.glowIntensity}px ${c.glowColor}) drop-shadow(0 0 ${20 * c.glowIntensity}px ${c.glowColor}40)`
                            : 'none',
                        transition: 'filter 0.5s ease',
                    }}
                >
                    <defs>
                        <filter id={filterId}>
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        {/* Pulse animation for available state */}
                        {state === 'available' && (
                            <radialGradient id={pulseId}>
                                <stop offset="0%" stopColor={catColor} stopOpacity="0.3">
                                    <animate attributeName="stopOpacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                                </stop>
                                <stop offset="100%" stopColor={catColor} stopOpacity="0" />
                            </radialGradient>
                        )}
                    </defs>

                    {/* Outer glow hex (behind) */}
                    {c.glowIntensity > 0 && (
                        <polygon
                            points="30,0 58,16 58,54 30,70 2,54 2,16"
                            fill="none"
                            stroke={c.glowColor}
                            strokeWidth={0.5}
                            opacity={c.glowIntensity * 0.3}
                            filter={`url(#${filterId})`}
                        />
                    )}

                    {/* Main hex shape */}
                    <polygon
                        points={HEX_PATH.replace(/[MLZ]/g, '').trim().replace(/\s+/g, ' ').split(' ').join(',')}
                        fill={c.hexFill}
                        stroke={c.hexStroke}
                        strokeWidth={c.hexStrokeWidth}
                        strokeDasharray={c.hexDash}
                        strokeLinejoin="round"
                        style={{ transition: 'all 0.4s ease' }}
                    />

                    {/* Maxed shimmer overlay */}
                    {state === 'maxed' && (
                        <polygon
                            points="30,2 56,18 56,52 30,68 4,52 4,18"
                            fill="url(#shimmer)"
                            opacity="0.1"
                        >
                            <animate attributeName="opacity" values="0.05;0.15;0.05" dur="3s" repeatCount="indefinite" />
                        </polygon>
                    )}

                    {/* Icon emoji */}
                    <text
                        x="30" y="38"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={state === 'locked' ? 18 : 22}
                        style={{
                            filter: state === 'locked' ? 'grayscale(100%)' : 'none',
                            transition: 'font-size 0.3s ease',
                        }}
                    >
                        {module.icon}
                    </text>

                    {/* Lock overlay for locked state */}
                    {state === 'locked' && (
                        <text
                            x="30" y="55"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="10"
                            fill="#4a5568"
                        >
                            🔒
                        </text>
                    )}
                </svg>
            </div>

            {/* ── Info Card ───────────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(180deg, #111827 0%, #0d1117 100%)',
                border: `1px solid ${state === 'locked' ? '#1e293b' : c.hexStroke}44`,
                borderRadius: 14,
                padding: '10px 12px',
                textAlign: 'center',
                position: 'relative',
                backdropFilter: 'blur(8px)',
                transition: 'border-color 0.4s ease',
            }}>
                {/* Extension badge */}
                {isExtension && state !== 'locked' && (
                    <div style={{
                        position: 'absolute',
                        top: -8,
                        right: 12,
                        fontSize: 8,
                        fontWeight: 800,
                        color: '#0d9488',
                        background: '#042f2e',
                        border: '1px solid #115e59',
                        padding: '1px 6px',
                        borderRadius: 6,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase' as const,
                    }}>
                        🧩 EXT
                    </div>
                )}

                {/* Module name */}
                <p style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 800,
                    color: c.textColor,
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap' as const,
                }}>
                    {module.name}
                </p>

                {/* Current tier */}
                {currentTierName && (
                    <p style={{
                        margin: '3px 0 0',
                        fontSize: 9,
                        fontWeight: 700,
                        color: c.badgeText,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.08em',
                    }}>
                        {currentTierName}
                    </p>
                )}

                {/* ── Tier Diamonds ────────────────────────────────── */}
                {totalTiers > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        margin: '6px 0 4px',
                    }}>
                        {Array.from({ length: totalTiers }, (_, i) => {
                            const isActive = i < activeTiers
                            const isCurrent = i === activeTiers - 1
                            const diamondColor = state === 'maxed' ? '#f59e0b' : catColor
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        transform: 'rotate(45deg)',
                                        background: isActive ? diamondColor : '#1e293b',
                                        border: `1.5px solid ${isActive ? diamondColor : '#334155'}`,
                                        boxShadow: isCurrent
                                            ? `0 0 6px ${diamondColor}, 0 0 12px ${diamondColor}40`
                                            : isActive
                                                ? `0 0 4px ${diamondColor}60`
                                                : 'none',
                                        transition: 'all 0.3s ease',
                                    }} />
                                    {i < totalTiers - 1 && (
                                        <div style={{
                                            width: 8,
                                            height: 1.5,
                                            background: isActive ? `${diamondColor}80` : '#1e293b',
                                            transition: 'background 0.3s ease',
                                        }} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Price / Requires / Maxed info */}
                {state === 'locked' && module.requires.length > 0 && (
                    <p style={{
                        margin: '4px 0 0',
                        fontSize: 8,
                        color: '#475569',
                        fontStyle: 'italic',
                    }}>
                        Requiere {module.requires.join(', ')}
                    </p>
                )}
                {nextTierPrice !== null && state !== 'locked' && state !== 'maxed' && (
                    <p style={{
                        margin: '2px 0 0',
                        fontSize: 9,
                        fontWeight: 700,
                        color: '#64748b',
                    }}>
                        {nextTierPrice} CHF/mes
                    </p>
                )}

                {/* Action button */}
                <button
                    style={{
                        marginTop: 6,
                        width: '100%',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '5px 0',
                        borderRadius: 8,
                        border: `1px solid ${c.actionBorder}`,
                        background: c.actionBg,
                        color: c.actionText,
                        cursor: state === 'locked' || state === 'maxed' ? 'default' : 'pointer',
                        letterSpacing: '0.03em',
                        transition: 'all 0.2s ease',
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (state !== 'locked') onNodeClick(module.key)
                    }}
                    disabled={state === 'locked'}
                >
                    {actionLabel}
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
