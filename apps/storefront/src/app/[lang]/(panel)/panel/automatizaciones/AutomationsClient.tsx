'use client'

/**
 * Automations Client — Owner Panel (SOTA)
 *
 * Features:
 * - Automation flow cards with status toggles
 * - Pre-built template gallery
 * - Execution log with status indicators
 * - Visual flow builder placeholder
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Zap, Play, Pause, Clock, CheckCircle2, XCircle,
    ShoppingCart, Mail, UserPlus, MessageSquare, Bell, Package,
    Plus, ArrowRight,
} from 'lucide-react'

import StatCard from '@/components/panel/StatCard'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import ModuleConfigSection, { type ConfigFieldDef } from '@/components/panel/ModuleConfigSection'
import { SotaBentoGrid, SotaBentoItem } from '@/components/panel/sota/SotaBentoGrid'
import { SotaGlassCard } from '@/components/panel/sota/SotaGlassCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Labels {
    activeFlows: string
    executionsToday: string
    successRate: string
    templates: string
    executionLog: string
    createFlow: string
    tabFlows: string
    tabTemplates: string
    tabLog: string
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const DEMO_FLOWS = [
    {
        id: '1',
        name: 'Email de bienvenida',
        trigger: 'Nuevo registro',
        action: 'Enviar email',
        active: true,
        executions: 47,
        icon: Mail,
        color: '#3b82f6',
    },
    {
        id: '2',
        name: 'Abandono de carrito',
        trigger: 'Carrito abandonado (1h)',
        action: 'Enviar recordatorio',
        active: true,
        executions: 23,
        icon: ShoppingCart,
        color: '#f59e0b',
    },
    {
        id: '3',
        name: 'Pedido completado',
        trigger: 'Orden completada',
        action: 'Solicitar reseña',
        active: false,
        executions: 0,
        icon: Package,
        color: '#10b981',
    },
    {
        id: '4',
        name: 'Segmento VIP',
        trigger: '5+ pedidos',
        action: 'Agregar etiqueta VIP',
        active: false,
        executions: 0,
        icon: UserPlus,
        color: '#8b5cf6',
    },
]

const DEMO_TEMPLATES = [
    { name: 'Bienvenida al cliente', category: 'Onboarding', icon: UserPlus, popularity: 95 },
    { name: 'Carrito abandonado', category: 'Recuperación', icon: ShoppingCart, popularity: 88 },
    { name: 'Pedido enviado', category: 'Notificación', icon: Package, popularity: 82 },
    { name: 'Solicitar reseña', category: 'Engagement', icon: MessageSquare, popularity: 76 },
    { name: 'Oferta de cumpleaños', category: 'Marketing', icon: Bell, popularity: 71 },
    { name: 'Re-engagement', category: 'Retención', icon: Mail, popularity: 65 },
]

const DEMO_LOG = [
    { flow: 'Email de bienvenida', time: 'Hace 5 min', status: 'success' as const, target: 'maria@example.com' },
    { flow: 'Abandono de carrito', time: 'Hace 12 min', status: 'success' as const, target: 'juan@example.com' },
    { flow: 'Email de bienvenida', time: 'Hace 35 min', status: 'success' as const, target: 'ana@example.com' },
    { flow: 'Abandono de carrito', time: 'Hace 1h', status: 'error' as const, target: 'pedro@example.com' },
    { flow: 'Email de bienvenida', time: 'Hace 2h', status: 'success' as const, target: 'luis@example.com' },
]

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type TabId = 'flows' | 'templates' | 'log'

export default function AutomationsClient({ labels, lang, automationConfig }: { labels: Labels; lang: string; automationConfig?: Record<string, unknown> }) {
    const automationConfigFields: ConfigFieldDef[] = [
        { key: 'webhook_notification_email', label: 'Webhook notification email', type: 'email', placeholder: 'webhooks@yourstore.com', description: 'Get notified when automations trigger' },
    ]
    const [activeTab, setActiveTab] = useState<TabId>('flows')

    const tabs: { id: TabId; label: string }[] = [
        { id: 'flows', label: labels.tabFlows },
        { id: 'templates', label: labels.tabTemplates },
        { id: 'log', label: labels.tabLog },
    ]

    const activeFlows = DEMO_FLOWS.filter(f => f.active).length
    const totalExecutions = DEMO_FLOWS.reduce((sum, f) => sum + f.executions, 0)

    return (
        <PageEntrance>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard
                    label={labels.activeFlows}
                    value={activeFlows}
                    icon={<Zap className="w-5 h-5" />}
                />
                <StatCard
                    label={labels.executionsToday}
                    value={totalExecutions}
                    icon={<Play className="w-5 h-5" />}
                />
                <StatCard
                    label={labels.successRate}
                    value="96%"
                    icon={<CheckCircle2 className="w-5 h-5" />}
                />
            </div>

            {/* ── Tab Navigation ── */}
            <div className="flex gap-1 bg-sf-1 rounded-xl p-1 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === tab.id
                                ? 'text-tx'
                                : 'text-tx-muted hover:text-tx-sec'
                        }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="auto-tab-indicator"
                                className="absolute inset-0 bg-sf-0/50 backdrop-blur-md rounded-lg shadow-sm border border-sf-3/30"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'flows' && (
                    <motion.div
                        key="flows"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <SotaBentoGrid>
                            <SotaBentoItem colSpan={12} className="space-y-3">
                                {DEMO_FLOWS.map((flow) => {
                                    const Icon = flow.icon
                                    return (
                                        <StaggerItem key={flow.id}>
                                            <motion.div
                                                className="bg-sf-0/50 backdrop-blur-md rounded-2xl border border-sf-3/30 p-5 hover:shadow-md transition-shadow"
                                                whileHover={{ y: -1 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                            style={{ backgroundColor: `${flow.color}15` }}
                                                        >
                                                            <Icon className="w-5 h-5" style={{ color: flow.color }} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-tx">
                                                                {flow.name}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-tx-muted mt-0.5">
                                                                <span>{flow.trigger}</span>
                                                                <ArrowRight className="w-3 h-3" />
                                                                <span>{flow.action}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        {flow.active && (
                                                            <span className="text-xs text-tx-muted">
                                                                {flow.executions} ejecuciones
                                                            </span>
                                                        )}
                                                        <div className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${
                                                            flow.active ? 'bg-brand' : 'bg-sf-2'
                                                        }`}>
                                                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                                                flow.active ? 'translate-x-4' : 'translate-x-0.5'
                                                            }`} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </StaggerItem>
                                    )
                                })}

                                {/* Create new flow */}
                                <StaggerItem>
                                    <button className="w-full bg-sf-0/30 rounded-2xl border-2 border-dashed border-sf-3/30 hover:border-sf-4 transition-colors p-5 flex items-center justify-center gap-2">
                                        <Plus className="w-5 h-5 text-tx-muted" />
                                        <span className="text-sm font-medium text-tx-sec">
                                            {labels.createFlow}
                                        </span>
                                    </button>
                                </StaggerItem>
                            </SotaBentoItem>
                        </SotaBentoGrid>
                    </motion.div>
                )}

                {activeTab === 'templates' && (
                    <motion.div
                        key="templates"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <SotaBentoGrid>
                                {DEMO_TEMPLATES.map((template, i) => {
                                    const Icon = template.icon
                                    return (
                                        <SotaBentoItem colSpan={4} key={i}>
                                            <motion.div
                                                className="bg-sf-0/50 backdrop-blur-md rounded-2xl border border-sf-3/30 p-5 hover:shadow-md transition-shadow cursor-pointer group h-full"
                                                whileHover={{ y: -2 }}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="w-10 h-10 rounded-xl bg-sf-1 flex items-center justify-center">
                                                        <Icon className="w-5 h-5 text-tx-muted" />
                                                    </div>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-sf-1 text-tx-sec">
                                                        {template.category}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-semibold text-tx mb-2">
                                                    {template.name}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-sf-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500/80 rounded-full"
                                                            style={{ width: `${template.popularity}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-tx-muted">
                                                        {template.popularity}%
                                                    </span>
                                                </div>
                                                <button className="mt-3 w-full py-2 text-xs font-medium text-tx-sec bg-sf-1 rounded-lg hover:bg-sf-2 transition-colors group-hover:bg-tx group-hover:text-sf-0">
                                                    Usar plantilla
                                                </button>
                                            </motion.div>
                                        </SotaBentoItem>
                                    )
                                })}
                        </SotaBentoGrid>
                    </motion.div>
                )}

                {activeTab === 'log' && (
                    <motion.div
                        key="log"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <SotaGlassCard glowColor="none">
                            <h3 className="text-base font-semibold text-tx mb-4">
                                {labels.executionLog}
                            </h3>
                            <ListStagger>
                                {DEMO_LOG.map((entry, i) => (
                                    <StaggerItem key={i}>
                                        <div className="flex items-center justify-between py-3 border-b border-sf-2 last:border-0">
                                            <div className="flex items-center gap-3">
                                                {entry.status === 'success' ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-tx">
                                                        {entry.flow}
                                                    </p>
                                                    <p className="text-xs text-tx-muted">
                                                        {entry.target}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-tx-muted">
                                                <Clock className="w-3.5 h-3.5" />
                                                {entry.time}
                                            </div>
                                        </div>
                                    </StaggerItem>
                                ))}
                            </ListStagger>
                        </SotaGlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Module Config Section */}
            {automationConfig && (
                <ModuleConfigSection
                    fields={automationConfigFields}
                    initialValues={automationConfig}
                    title="Automation Settings"
                    collapsible
                />
            )}
        </PageEntrance>
    )
}
