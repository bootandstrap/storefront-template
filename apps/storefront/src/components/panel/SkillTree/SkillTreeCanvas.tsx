'use client'

/**
 * SkillTreeCanvas — WoW-style dark MMORPG module skill tree.
 *
 * Dark constellation background, energy connection lines,
 * glassmorphism stat panels, BootandStrap green brand accents.
 */

import { useMemo, useCallback, useState } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    type NodeTypes,
    Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { ModuleNode } from './ModuleNode'
import {
    buildSkillTreeGraph,
    getCategoryColor,
    getCategoryLabel,
    type SkillTreeModule,
} from './skill-tree-layout'

// Register custom node types
const nodeTypes: NodeTypes = {
    moduleNode: ModuleNode as NodeTypes['moduleNode'],
}

interface SkillTreeCanvasProps {
    modules: SkillTreeModule[]
    onModuleClick: (moduleKey: string) => void
}

export function SkillTreeCanvas({ modules, onModuleClick }: SkillTreeCanvasProps) {
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

    // Build the graph
    const { initialNodes, initialEdges } = useMemo(() => {
        const { nodes, edges } = buildSkillTreeGraph(modules, onModuleClick)
        return { initialNodes: nodes, initialEdges: edges }
    }, [modules, onModuleClick])

    const [nodes, , onNodesChange] = useNodesState(initialNodes)
    const [edges, , onEdgesChange] = useEdgesState(initialEdges)

    // Stats
    const stats = useMemo(() => {
        const active = modules.filter(m => m.isActive).length
        const total = modules.length
        const maxedOut = modules.filter(m => m.isActive && m.currentTierIndex >= m.tiers.length - 1).length
        const totalTiersPossible = modules.reduce((sum, m) => sum + m.tiers.length, 0)
        const totalTiersActive = modules.reduce((sum, m) => sum + (m.currentTierIndex + 1), 0)
        return { active, total, maxedOut, totalTiersPossible, totalTiersActive }
    }, [modules])

    // Categories present
    const categories = useMemo(() => {
        const cats = new Set(modules.map(m => m.category))
        return Array.from(cats)
    }, [modules])

    // Filter nodes by hovered category
    const filteredNodes = useMemo(() => {
        if (!hoveredCategory) return nodes
        return nodes.map(n => ({
            ...n,
            style: {
                ...n.style,
                opacity: (n.data as unknown as { module: SkillTreeModule }).module.category === hoveredCategory ? 1 : 0.15,
                transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            },
        }))
    }, [nodes, hoveredCategory])

    const handleCategoryHover = useCallback((cat: string | null) => {
        setHoveredCategory(cat)
    }, [])

    // XP bar percentage
    const xpPercent = stats.totalTiersPossible > 0
        ? Math.round((stats.totalTiersActive / stats.totalTiersPossible) * 100)
        : 0

    return (
        <div style={{
            width: '100%',
            height: '70vh',
            minHeight: 500,
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid #1e293b',
            position: 'relative',
            boxShadow: '0 0 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
            <ReactFlow
                nodes={filteredNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.4 }}
                nodesDraggable={false}
                nodesConnectable={false}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                }}
                style={{
                    background: '#080c14',
                }}
            >
                {/* Constellation dots background */}
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={32}
                    size={0.8}
                    color="#1a2744"
                />

                {/* Zoom controls */}
                <Controls
                    showInteractive={false}
                    style={{
                        borderRadius: 12,
                        border: '1px solid #1e293b',
                        overflow: 'hidden',
                        background: '#0d1117',
                    }}
                />

                {/* Minimap */}
                <MiniMap
                    nodeStrokeWidth={3}
                    pannable
                    zoomable
                    style={{
                        borderRadius: 12,
                        border: '1px solid #1e293b',
                        overflow: 'hidden',
                        background: '#0d1117',
                    }}
                    nodeColor={(n) => {
                        const mod = (n.data as unknown as { module: SkillTreeModule }).module
                        if (!mod.isActive) return '#1e293b'
                        return getCategoryColor(mod.category)
                    }}
                    maskColor="rgba(0,0,0,0.7)"
                />

                {/* ── Stats Panel (top-left) ── */}
                <Panel position="top-left">
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(13,17,23,0.92) 0%, rgba(15,23,42,0.92) 100%)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: 14,
                        padding: '14px 18px',
                        border: '1px solid #1e293b',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                        minWidth: 200,
                    }}>
                        {/* Title with BootandStrap green */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                        }}>
                            <span style={{ fontSize: 16 }}>🏰</span>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: '#94a3b8',
                                textTransform: 'uppercase' as const,
                                letterSpacing: '0.12em',
                            }}>
                                Árbol de habilidades
                            </span>
                        </div>

                        {/* Module count */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: 0 }}>
                                    Módulos
                                </p>
                                <p style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', margin: 0 }}>
                                    {stats.active}<span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>/{stats.total}</span>
                                </p>
                            </div>
                            <div style={{ width: 1, background: '#1e293b' }} />
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: 0 }}>
                                    Tiers
                                </p>
                                <p style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', margin: 0 }}>
                                    {stats.totalTiersActive}<span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>/{stats.totalTiersPossible}</span>
                                </p>
                            </div>
                            {stats.maxedOut > 0 && (
                                <>
                                    <div style={{ width: 1, background: '#1e293b' }} />
                                    <div>
                                        <p style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: 0 }}>
                                            🏆 Max
                                        </p>
                                        <p style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', margin: 0 }}>
                                            {stats.maxedOut}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* XP Progress bar */}
                        <div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', marginBottom: 4,
                            }}>
                                <span style={{ fontSize: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
                                    Progreso total
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#2D5016' }}>
                                    {xpPercent}%
                                </span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: 6,
                                borderRadius: 3,
                                background: '#1e293b',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${xpPercent}%`,
                                    height: '100%',
                                    borderRadius: 3,
                                    background: 'linear-gradient(90deg, #2D5016 0%, #4a7c28 50%, #6aad35 100%)',
                                    boxShadow: '0 0 8px #2D501666',
                                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                }} />
                            </div>
                        </div>
                    </div>
                </Panel>

                {/* ── Category Legend (top-right) ── */}
                <Panel position="top-right">
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(13,17,23,0.92) 0%, rgba(15,23,42,0.92) 100%)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: 14,
                        padding: '10px 14px',
                        border: '1px solid #1e293b',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                        display: 'flex',
                        flexDirection: 'column' as const,
                        gap: 4,
                    }}>
                        <p style={{
                            fontSize: 8, fontWeight: 800, color: '#475569',
                            textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 4px',
                        }}>
                            Categorías
                        </p>
                        {categories.map(cat => {
                            const count = modules.filter(m => m.category === cat).length
                            const activeCount = modules.filter(m => m.category === cat && m.isActive).length
                            const color = getCategoryColor(cat)
                            return (
                                <div
                                    key={cat}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        borderRadius: 8,
                                        background: hoveredCategory === cat ? `${color}15` : 'transparent',
                                        border: `1px solid ${hoveredCategory === cat ? `${color}30` : 'transparent'}`,
                                        transition: 'all 0.3s ease',
                                    }}
                                    onMouseEnter={() => handleCategoryHover(cat)}
                                    onMouseLeave={() => handleCategoryHover(null)}
                                >
                                    {/* Glowing dot */}
                                    <div style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: color,
                                        boxShadow: hoveredCategory === cat
                                            ? `0 0 8px ${color}, 0 0 16px ${color}40`
                                            : `0 0 4px ${color}60`,
                                        flexShrink: 0,
                                        transition: 'box-shadow 0.3s ease',
                                    }} />
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
                                        {getCategoryLabel(cat)}
                                    </span>
                                    <span style={{
                                        fontSize: 9, fontWeight: 800, color: '#475569', marginLeft: 'auto',
                                    }}>
                                        {activeCount}/{count}
                                    </span>
                                </div>
                            )
                        })}

                        {/* Node state legend */}
                        <div style={{ borderTop: '1px solid #1e293b', marginTop: 4, paddingTop: 6 }}>
                            <p style={{
                                fontSize: 8, fontWeight: 800, color: '#475569',
                                textTransform: 'uppercase' as const, letterSpacing: '0.12em', margin: '0 0 4px',
                            }}>
                                Estados
                            </p>
                            {[
                                { icon: '🔒', label: 'Bloqueado', color: '#334155' },
                                { icon: '⬜', label: 'Disponible', color: '#6b7280' },
                                { icon: '✅', label: 'Activo', color: '#22c55e' },
                                { icon: '🏆', label: 'Máximo', color: '#f59e0b' },
                            ].map(s => (
                                <div key={s.label} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '2px 0',
                                }}>
                                    <span style={{ fontSize: 10 }}>{s.icon}</span>
                                    <span style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Panel>

                {/* ── Bottom tip ── */}
                <Panel position="bottom-center">
                    <div style={{
                        background: 'rgba(13,17,23,0.85)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: 10,
                        padding: '6px 14px',
                        border: '1px solid #1e293b',
                        fontSize: 10,
                        color: '#475569',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                    }}>
                        Scroll para zoom · Click en un módulo para gestionar · Arrastra para mover
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    )
}
