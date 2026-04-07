'use client'

/**
 * Auth Client — Owner Panel (SOTA)
 *
 * Features:
 * - Auth provider cards with governance-controlled status indicators
 * - Login activity timeline from real profile data
 * - Security settings with policy display
 *
 * Data: all data comes from server props (feature flags + Supabase profiles)
 * Toggles display governance state — not interactive (controlled by plan/module)
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Shield, Mail, Chrome, UserCheck, Lock, Eye,
    Users, Key, Clock, CheckCircle2, Info,
} from 'lucide-react'

import StatCard from '@/components/panel/StatCard'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import type { AuthActivity, AuthStats } from './actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthConfig {
    emailAuth: boolean
    googleAuth: boolean
    guestCheckout: boolean
    requireAuthToOrder: boolean
    userRegistration: boolean
}

interface Labels {
    providers: string
    loginActivity: string
    securitySettings: string
    emailProvider: string
    googleProvider: string
    guestAccess: string
    requireAuth: string
    registration: string
    totalLogins: string
    activeProviders: string
    securityScore: string
    tabProviders: string
    tabActivity: string
    tabSecurity: string
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type TabId = 'providers' | 'activity' | 'security'

export default function AuthClient({
    authConfig,
    authStats,
    labels,
}: {
    authConfig: AuthConfig
    authStats: AuthStats
    labels: Labels
    lang: string
}) {
    const [activeTab, setActiveTab] = useState<TabId>('providers')

    const tabs: { id: TabId; label: string }[] = [
        { id: 'providers', label: labels.tabProviders },
        { id: 'activity', label: labels.tabActivity },
        { id: 'security', label: labels.tabSecurity },
    ]

    const activeProviders = [authConfig.emailAuth, authConfig.googleAuth].filter(Boolean).length
    const securityScore = Math.round(
        (authConfig.emailAuth ? 20 : 0) +
        (authConfig.googleAuth ? 20 : 0) +
        (!authConfig.guestCheckout ? 20 : 0) +
        (authConfig.requireAuthToOrder ? 20 : 0) +
        (authConfig.userRegistration ? 20 : 0)
    )

    const providers = [
        {
            name: labels.emailProvider,
            description: 'Inicio de sesión con email y contraseña',
            icon: <Mail className="w-6 h-6 text-[#3b82f6]" />,
            enabled: authConfig.emailAuth,
            color: '#3b82f6',
        },
        {
            name: labels.googleProvider,
            description: 'OAuth 2.0 con cuenta de Google',
            icon: <Chrome className="w-6 h-6 text-[#ea4335]" />,
            enabled: authConfig.googleAuth,
            color: '#ea4335',
        },
    ]

    // Use real activity data from server
    const activityData: AuthActivity[] = authStats.recentActivity

    return (
        <PageEntrance>
            {/* ── Stats Row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard
                    label={labels.activeProviders}
                    value={activeProviders}
                    icon={<Key className="w-5 h-5" />}
                />
                <StatCard
                    label={labels.totalLogins}
                    value={authStats.totalUsers}
                    icon={<Users className="w-5 h-5" />}
                />
                <StatCard
                    label={labels.securityScore}
                    value={`${securityScore}%`}
                    icon={<Shield className="w-5 h-5" />}
                />
            </div>

            {/* ── Tab Navigation ── */}
            <div className="flex gap-1 bg-[var(--color-gray-100,#f3f4f6)] rounded-xl p-1 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === tab.id
                                ? 'text-[var(--color-gray-900,#111827)]'
                                : 'text-[var(--color-gray-500,#6b7280)] hover:text-[var(--color-gray-700,#374151)]'
                        }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="auth-tab-indicator"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'providers' && (
                    <motion.div
                        key="providers"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Governance notice */}
                        <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            <span>Los proveedores de autenticación están configurados por tu plan. Contacta soporte para cambiar la configuración.</span>
                        </div>

                        <ListStagger>
                            <div className="space-y-4">
                                {providers.map((provider, i) => (
                                    <StaggerItem key={i}>
                                        <motion.div
                                            className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6 hover:shadow-md transition-shadow"
                                            whileHover={{ y: -1 }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                                        style={{ backgroundColor: `${provider.color}15` }}
                                                    >
                                                        {provider.icon}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[var(--color-gray-800,#1f2937)]">
                                                            {provider.name}
                                                        </p>
                                                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)] mt-0.5">
                                                            {provider.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                                        provider.enabled
                                                            ? 'bg-[var(--color-emerald-50,#ecfdf5)] text-[var(--color-emerald-700,#047857)]'
                                                            : 'bg-[var(--color-gray-100,#f3f4f6)] text-[var(--color-gray-500,#6b7280)]'
                                                    }`}>
                                                        {provider.enabled ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                    {/* Governance-controlled indicator (not interactive) */}
                                                    <div className="group relative">
                                                        <div className={`w-10 h-6 rounded-full relative cursor-default transition-colors ${
                                                            provider.enabled ? 'bg-[var(--color-emerald-500,#10b981)]' : 'bg-[var(--color-gray-200,#e5e7eb)]'
                                                        }`}>
                                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                                                provider.enabled ? 'translate-x-5' : 'translate-x-1'
                                                            }`} />
                                                        </div>
                                                        <div className="absolute bottom-full right-0 mb-1 w-40 px-2 py-1 text-[10px] bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                                                            Configurado por tu plan
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </StaggerItem>
                                ))}
                            </div>
                        </ListStagger>
                    </motion.div>
                )}

                {activeTab === 'activity' && (
                    <motion.div
                        key="activity"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                            <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)] mb-4">
                                {labels.loginActivity}
                            </h3>
                            {activityData.length === 0 ? (
                                <p className="text-sm text-[var(--color-gray-400,#9ca3af)] py-8 text-center">
                                    No hay actividad registrada aún
                                </p>
                            ) : (
                                <ListStagger>
                                    {activityData.map((entry, i) => (
                                        <StaggerItem key={i}>
                                            <div className="flex items-center justify-between py-3 border-b border-[var(--color-gray-100,#f3f4f6)] last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="w-5 h-5 text-[var(--color-emerald-500,#10b981)]" />
                                                    <div>
                                                        <p className="text-sm font-medium text-[var(--color-gray-800,#1f2937)]">
                                                            {entry.email}
                                                        </p>
                                                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                                            vía {entry.method}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-[var(--color-gray-400,#9ca3af)]">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {entry.time}
                                                </div>
                                            </div>
                                        </StaggerItem>
                                    ))}
                                </ListStagger>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'security' && (
                    <motion.div
                        key="security"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                            <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)] mb-4">
                                {labels.securitySettings}
                            </h3>
                            <div className="space-y-1">
                                {[
                                    { label: labels.registration, desc: 'Permitir que clientes creen cuentas', enabled: authConfig.userRegistration, icon: <UserCheck className="w-5 h-5" /> },
                                    { label: labels.guestAccess, desc: 'Permitir checkout sin crear cuenta', enabled: authConfig.guestCheckout, icon: <Eye className="w-5 h-5" /> },
                                    { label: labels.requireAuth, desc: 'Requerir login para realizar pedidos', enabled: authConfig.requireAuthToOrder, icon: <Lock className="w-5 h-5" /> },
                                ].map((setting, i) => (
                                    <div key={i} className="flex items-center justify-between py-4 border-b border-[var(--color-gray-100,#f3f4f6)] last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="text-[var(--color-gray-400,#9ca3af)]">{setting.icon}</div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                                                    {setting.label}
                                                </p>
                                                <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                                    {setting.desc}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="group relative">
                                            <div className={`w-10 h-6 rounded-full relative cursor-default transition-colors ${
                                                setting.enabled ? 'bg-[var(--color-emerald-500,#10b981)]' : 'bg-[var(--color-gray-200,#e5e7eb)]'
                                            }`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                                    setting.enabled ? 'translate-x-5' : 'translate-x-1'
                                                }`} />
                                            </div>
                                            <div className="absolute bottom-full right-0 mb-1 w-40 px-2 py-1 text-[10px] bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                                                Configurado por tu plan
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageEntrance>
    )
}
