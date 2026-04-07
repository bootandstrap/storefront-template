/**
 * Skill Tree Layout Engine — Professional B2B Edition
 *
 * Transforms module catalog into React Flow nodes + edges
 * with subtle animated connections and clean card sizing.
 * Uses dagre for automatic graph layout.
 */

import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

export interface SkillTreeModule {
    key: string
    name: string
    icon: string        // emoji fallback
    icon_name: string   // Lucide icon name
    description: string
    category: string
    payment_type?: string
    requires: string[]
    tiers: {
        key: string
        name: string
        price_chf: number
        features: string[]
        recommended?: boolean
    }[]
    // Runtime state
    currentTierIndex: number  // -1 = not purchased, 0+ = tier index
    isActive: boolean
}

export interface SkillTreeNodeData {
    [key: string]: unknown
    module: SkillTreeModule
    state: 'locked' | 'available' | 'active' | 'maxed'
    currentTierName: string | null
    nextTierName: string | null
    nextTierPrice: number | null
    progress: number   // 0-1, how far through tiers
    totalTiers: number
    activeTiers: number
    onNodeClick: (moduleKey: string) => void
    labels: SkillTreeLabels
}

export interface SkillTreeLabels {
    locked: string
    available: string
    active: string
    maxed: string
    activate: string
    upgrade: string
    perMonth: string
    requires: string
    treeTitle: string
    treeTip: string
    modules: string
    tiers: string
    progress: string
    categories: string
    states: string
}

// ── Category Config — Muted professional palette ─────────────────────────────
const CATEGORY_CONFIG: Record<string, { color: string; label: string }> = {
    core:           { color: '#10b981', label: 'Core' },
    channels:       { color: '#3b82f6', label: 'Channels' },
    engage:         { color: '#8b5cf6', label: 'Engagement' },
    grow:           { color: '#06b6d4', label: 'Growth' },
    automate:       { color: '#f59e0b', label: 'Automation' },
    marketing:      { color: '#ef4444', label: 'Marketing' },
    intelligence:   { color: '#f97316', label: 'Intelligence' },
    advanced:       { color: '#6366f1', label: 'Advanced' },
    infrastructure: { color: '#8b5cf6', label: 'Infrastructure' },
    sell:           { color: '#10b981', label: 'Sell' },
    other:          { color: '#64748b', label: 'Other' },
}

export function getCategoryColor(category: string): string {
    return CATEGORY_CONFIG[category]?.color ?? '#64748b'
}

export function getCategoryLabel(category: string): string {
    return CATEGORY_CONFIG[category]?.label ?? category
}

/**
 * Build React Flow nodes + edges with professional connections.
 */
export function buildSkillTreeGraph(
    modules: SkillTreeModule[],
    onNodeClick: (moduleKey: string) => void,
    labels: SkillTreeLabels,
): { nodes: Node<SkillTreeNodeData>[]; edges: Edge[] } {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({
        rankdir: 'TB',
        nodesep: 60,
        ranksep: 100,
        marginx: 40,
        marginy: 40,
    })

    const NODE_WIDTH = 200
    const NODE_HEIGHT = 180

    const moduleMap = new Map(modules.map(m => [m.key, m]))
    const activeKeys = new Set(modules.filter(m => m.isActive).map(m => m.key))

    function getNodeState(mod: SkillTreeModule): SkillTreeNodeData['state'] {
        if (mod.isActive) {
            if (mod.currentTierIndex >= mod.tiers.length - 1) return 'maxed'
            return 'active'
        }
        if (mod.requires.length > 0 && !mod.requires.every(r => activeKeys.has(r))) {
            return 'locked'
        }
        return 'available'
    }

    // Add nodes
    for (const mod of modules) {
        g.setNode(mod.key, { width: NODE_WIDTH, height: NODE_HEIGHT })
    }

    // ── Edges ────────────────────────────────────────────────────────────────
    const edges: Edge[] = []
    for (const mod of modules) {
        for (const req of mod.requires) {
            if (moduleMap.has(req)) {
                g.setEdge(req, mod.key)
                const isLit = activeKeys.has(req)
                const color = isLit ? getCategoryColor(mod.category) : '#1e293b'

                edges.push({
                    id: `edge-${req}-${mod.key}`,
                    source: req,
                    target: mod.key,
                    type: 'smoothstep',
                    animated: isLit,
                    style: {
                        stroke: color,
                        strokeWidth: isLit ? 2 : 1,
                        strokeDasharray: isLit ? undefined : '6 4',
                        filter: isLit ? `drop-shadow(0 0 3px ${color}60)` : 'none',
                        transition: 'all 0.5s ease',
                    },
                    markerEnd: {
                        type: 'arrowclosed' as const,
                        color,
                        width: 14,
                        height: 14,
                    },
                })
            }
        }
    }

    dagre.layout(g)

    const nodes: Node<SkillTreeNodeData>[] = modules.map((mod) => {
        const nodeWithPos = g.node(mod.key)
        const state = getNodeState(mod)
        const currentTier = mod.currentTierIndex >= 0 ? mod.tiers[mod.currentTierIndex] : null
        const nextTier = mod.currentTierIndex < mod.tiers.length - 1
            ? mod.tiers[mod.currentTierIndex + 1]
            : null

        return {
            id: mod.key,
            type: 'moduleNode',
            position: {
                x: nodeWithPos.x - NODE_WIDTH / 2,
                y: nodeWithPos.y - NODE_HEIGHT / 2,
            },
            data: {
                module: mod,
                state,
                currentTierName: currentTier?.name ?? null,
                nextTierName: nextTier?.name ?? null,
                nextTierPrice: nextTier?.price_chf ?? null,
                progress: mod.tiers.length > 0
                    ? (mod.currentTierIndex + 1) / mod.tiers.length
                    : 0,
                totalTiers: mod.tiers.length,
                activeTiers: mod.currentTierIndex + 1,
                onNodeClick,
                labels,
            },
        }
    })

    return { nodes, edges }
}
