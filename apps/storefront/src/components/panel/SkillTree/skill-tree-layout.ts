/**
 * Skill Tree Layout Engine — MMORPG Edition
 *
 * Transforms module catalog into React Flow nodes + edges
 * with energy-line connections and hexagonal node sizing.
 * Uses dagre for automatic graph layout.
 */

import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

export interface SkillTreeModule {
    key: string
    name: string
    icon: string
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
}

// ── Category Colors — MMORPG palette (vibrant on dark) ─────────────────────
const CATEGORY_CONFIG: Record<string, { color: string; column: number }> = {
    sell:     { color: '#3b82f6', column: 0 },  // electric blue
    engage:  { color: '#a855f7', column: 1 },  // vivid purple
    grow:    { color: '#22c55e', column: 2 },  // neon green
    automate:{ color: '#f59e0b', column: 3 },  // molten amber
}

export function getCategoryColor(category: string): string {
    return CATEGORY_CONFIG[category]?.color ?? '#6b7280'
}

export function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        sell: '⚔️ Vender',
        engage: '🛡️ Conectar',
        grow: '🌿 Crecer',
        automate: '⚡ Automatizar',
    }
    return labels[category] ?? category
}

/**
 * Build React Flow nodes + edges with RPG energy connections.
 */
export function buildSkillTreeGraph(
    modules: SkillTreeModule[],
    onNodeClick: (moduleKey: string) => void,
): { nodes: Node<SkillTreeNodeData>[]; edges: Edge[] } {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({
        rankdir: 'TB',       // Top to bottom
        nodesep: 80,         // More space for hex nodes
        ranksep: 120,        // Vertical spacing for energy lines
        marginx: 60,
        marginy: 60,
    })

    // Hex node dimensions (narrower than before)
    const NODE_WIDTH = 210
    const NODE_HEIGHT = 220

    // Map for quick lookup
    const moduleMap = new Map(modules.map(m => [m.key, m]))

    // Determine node states
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

    // Add nodes to dagre
    for (const mod of modules) {
        g.setNode(mod.key, { width: NODE_WIDTH, height: NODE_HEIGHT })
    }

    // ── Energy Edges ────────────────────────────────────────────────────────
    const edges: Edge[] = []
    for (const mod of modules) {
        for (const req of mod.requires) {
            if (moduleMap.has(req)) {
                g.setEdge(req, mod.key)
                const isLit = activeKeys.has(req) // parent is active = energy flows
                const color = isLit ? getCategoryColor(mod.category) : '#1e293b'

                edges.push({
                    id: `edge-${req}-${mod.key}`,
                    source: req,
                    target: mod.key,
                    type: 'smoothstep',
                    animated: isLit,
                    style: {
                        stroke: color,
                        strokeWidth: isLit ? 2.5 : 1,
                        strokeDasharray: isLit ? undefined : '6 4',
                        filter: isLit ? `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 8px ${color}40)` : 'none',
                        transition: 'all 0.5s ease',
                    },
                    markerEnd: {
                        type: 'arrowclosed' as const,
                        color,
                        width: 16,
                        height: 16,
                    },
                })
            }
        }
    }

    // Run dagre layout
    dagre.layout(g)

    // Convert dagre positions to React Flow nodes
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
            },
        }
    })

    return { nodes, edges }
}
