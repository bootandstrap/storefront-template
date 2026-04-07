'use client'

/**
 * SkillTreeCanvas — Professional module dependency graph.
 *
 * Dark constellation background with clean glass panels,
 * subtle animated connections, and professional typography.
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
    type SkillTreeLabels,
} from './skill-tree-layout'

const nodeTypes: NodeTypes = {
    moduleNode: ModuleNode as NodeTypes['moduleNode'],
}

interface SkillTreeCanvasProps {
    modules: SkillTreeModule[]
    onModuleClick: (moduleKey: string) => void
    labels: SkillTreeLabels
}

const DEFAULT_LABELS: SkillTreeLabels = {
    locked: 'Locked', available: 'Available', active: 'Active', maxed: 'Maxed',
    activate: 'Activate', upgrade: 'Upgrade', perMonth: '/mo', requires: 'Requires',
    treeTitle: 'Modules', treeTip: 'Scroll to explore · Click a module for details',
    modules: 'Modules', tiers: 'Tiers', progress: 'Progress',
    categories: 'Categories', states: 'States',
}

export function SkillTreeCanvas({ modules, onModuleClick, labels: rawLabels }: SkillTreeCanvasProps) {
    const labels = rawLabels ?? DEFAULT_LABELS
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

    const { initialNodes, initialEdges } = useMemo(() => {
        const { nodes, edges } = buildSkillTreeGraph(modules, onModuleClick, labels)
        return { initialNodes: nodes, initialEdges: edges }
    }, [modules, onModuleClick, labels])

    const [nodes, , onNodesChange] = useNodesState(initialNodes)
    const [edges, , onEdgesChange] = useEdgesState(initialEdges)

    const stats = useMemo(() => {
        const active = modules.filter(m => m.isActive).length
        const total = modules.length
        const maxedOut = modules.filter(m => m.isActive && m.currentTierIndex >= m.tiers.length - 1).length
        const totalTiersPossible = modules.reduce((sum, m) => sum + m.tiers.length, 0)
        const totalTiersActive = modules.reduce((sum, m) => sum + (m.currentTierIndex + 1), 0)
        return { active, total, maxedOut, totalTiersPossible, totalTiersActive }
    }, [modules])

    const categories = useMemo(() => {
        const cats = new Set(modules.map(m => m.category))
        return Array.from(cats)
    }, [modules])

    const filteredNodes = useMemo(() => {
        if (!hoveredCategory) return nodes
        return nodes.map(n => ({
            ...n,
            style: {
                ...n.style,
                opacity: (n.data as unknown as { module: SkillTreeModule }).module.category === hoveredCategory ? 1 : 0.12,
                transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            },
        }))
    }, [nodes, hoveredCategory])

    const handleCategoryHover = useCallback((cat: string | null) => {
        setHoveredCategory(cat)
    }, [])

    const progressPercent = stats.totalTiersPossible > 0
        ? Math.round((stats.totalTiersActive / stats.totalTiersPossible) * 100)
        : 0

    // ── Shared panel style ───────────────────────────────────────────────────
    const panelStyle: React.CSSProperties = {
        background: 'rgba(10, 13, 20, 0.92)',
        backdropFilter: 'blur(16px)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    }

    return (
        <div style={{
            width: '100%',
            height: '70vh',
            minHeight: 500,
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
            boxShadow: '0 0 40px rgba(0,0,0,0.3)',
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
                defaultEdgeOptions={{ type: 'smoothstep' }}
                style={{ background: '#0a0d14' }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={28}
                    size={0.6}
                    color="#1a1f2e"
                />

                <Controls
                    showInteractive={false}
                    style={{
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                        background: '#0a0d14',
                    }}
                />

                <MiniMap
                    nodeStrokeWidth={3}
                    pannable
                    zoomable
                    style={{
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                        background: '#0a0d14',
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
                    <div style={{ ...panelStyle, padding: '12px 16px', minWidth: 180 }}>
                        <p style={{
                            margin: '0 0 10px',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#64748b',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '0.1em',
                        }}>
                            {labels.treeTitle}
                        </p>

                        {/* Counters */}
                        <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: 0 }}>
                                    {labels.modules}
                                </p>
                                <p style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                                    {stats.active}<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>/{stats.total}</span>
                                </p>
                            </div>
                            <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
                            <div>
                                <p style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: 0 }}>
                                    {labels.tiers}
                                </p>
                                <p style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                                    {stats.totalTiersActive}<span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>/{stats.totalTiersPossible}</span>
                                </p>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 9, fontWeight: 600, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                                    {labels.progress}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                                    {progressPercent}%
                                </span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: 4,
                                borderRadius: 2,
                                background: '#1e293b',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${progressPercent}%`,
                                    height: '100%',
                                    borderRadius: 2,
                                    background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                }} />
                            </div>
                        </div>
                    </div>
                </Panel>

                {/* ── Category Legend (top-right) ── */}
                <Panel position="top-right">
                    <div style={{ ...panelStyle, padding: '10px 14px' }}>
                        <p style={{
                            fontSize: 9, fontWeight: 700, color: '#475569',
                            textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 6px',
                        }}>
                            {labels.categories}
                        </p>
                        {categories.map(cat => {
                            const count = modules.filter(m => m.category === cat).length
                            const activeCount = modules.filter(m => m.category === cat && m.isActive).length
                            const color = getCategoryColor(cat)
                            const isHovered = hoveredCategory === cat
                            return (
                                <div
                                    key={cat}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        cursor: 'pointer',
                                        padding: '3px 6px',
                                        borderRadius: 6,
                                        background: isHovered ? `${color}10` : 'transparent',
                                        transition: 'background 0.2s ease',
                                    }}
                                    onMouseEnter={() => handleCategoryHover(cat)}
                                    onMouseLeave={() => handleCategoryHover(null)}
                                >
                                    <div style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        background: color,
                                        boxShadow: isHovered ? `0 0 6px ${color}` : 'none',
                                        flexShrink: 0,
                                        transition: 'box-shadow 0.2s ease',
                                    }} />
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>
                                        {getCategoryLabel(cat)}
                                    </span>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, color: '#475569', marginLeft: 'auto',
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {activeCount}/{count}
                                    </span>
                                </div>
                            )
                        })}

                        {/* State legend */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 6, paddingTop: 6 }}>
                            <p style={{
                                fontSize: 9, fontWeight: 700, color: '#475569',
                                textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px',
                            }}>
                                {labels.states}
                            </p>
                            {[
                                { label: labels.locked, color: '#334155' },
                                { label: labels.available, color: '#64748b' },
                                { label: labels.active, color: '#10b981' },
                                { label: labels.maxed, color: '#f59e0b' },
                            ].map(s => (
                                <div key={s.label} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '2px 0',
                                }}>
                                    <div style={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: s.color,
                                    }} />
                                    <span style={{ fontSize: 10, color: s.color, fontWeight: 500 }}>
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
                        ...panelStyle,
                        padding: '5px 12px',
                        fontSize: 10,
                        color: '#475569',
                        fontWeight: 500,
                    }}>
                        {labels.treeTip}
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    )
}
