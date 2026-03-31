'use client'

/**
 * Social Media Client — Owner Panel (SOTA)
 *
 * Features:
 * - Social platform connection cards with animated toggle
 * - Status indicators (connected/disconnected)
 * - Tabbed interface: Connections / Feed / Settings
 * - PageEntrance + ListStagger animations
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Instagram, Facebook, MapPin, Music2,
    CheckCircle2, XCircle, ExternalLink, Link2, Unlink,
} from 'lucide-react'

import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Connections {
    instagram: boolean
    facebook: boolean
    tiktok: boolean
    googleMaps: boolean
}

interface Labels {
    connectedAccounts: string
    googleMaps: string
    googleMapsDesc: string
    instagram: string
    instagramDesc: string
    facebook: string
    facebookDesc: string
    tiktok: string
    tiktokDesc: string
    connect: string
    disconnect: string
    connected: string
    notConnected: string
    tabConnections: string
    tabFeed: string
    tabSettings: string
}

interface SocialMediaClientProps {
    connections: Connections
    socialLinks: {
        instagram: string
        facebook: string
        tiktok: string
    }
    labels: Labels
    lang: string
}

// ---------------------------------------------------------------------------
// Platform Card
// ---------------------------------------------------------------------------

function PlatformCard({
    icon,
    name,
    description,
    isConnected,
    link,
    connectLabel,
    disconnectLabel,
    connectedLabel,
    notConnectedLabel,
}: {
    icon: React.ReactNode
    name: string
    description: string
    isConnected: boolean
    link: string
    connectLabel: string
    disconnectLabel: string
    connectedLabel: string
    notConnectedLabel: string
}) {
    return (
        <motion.div
            className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6 hover:shadow-md transition-shadow"
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-gray-50,#f9fafb)] flex items-center justify-center">
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-[var(--color-gray-800,#1f2937)]">{name}</h3>
                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)] mt-0.5">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <CheckCircle2 className="w-5 h-5 text-[var(--color-emerald-500,#10b981)]" />
                    ) : (
                        <XCircle className="w-5 h-5 text-[var(--color-gray-300,#d1d5db)]" />
                    )}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    isConnected
                        ? 'bg-[var(--color-emerald-50,#ecfdf5)] text-[var(--color-emerald-700,#047857)]'
                        : 'bg-[var(--color-gray-100,#f3f4f6)] text-[var(--color-gray-500,#6b7280)]'
                }`}>
                    {isConnected ? connectedLabel : notConnectedLabel}
                </span>

                {isConnected ? (
                    <div className="flex gap-2">
                        {link && (
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs flex items-center gap-1 text-[var(--color-gray-500,#6b7280)] hover:text-[var(--color-gray-700,#374151)] transition-colors"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                        <button className="text-xs flex items-center gap-1 text-[var(--color-red-500,#ef4444)] hover:text-[var(--color-red-700,#b91c1c)] transition-colors">
                            <Unlink className="w-3.5 h-3.5" />
                            {disconnectLabel}
                        </button>
                    </div>
                ) : (
                    <button className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gray-900,#111827)] text-white rounded-lg hover:bg-[var(--color-gray-700,#374151)] transition-colors">
                        <Link2 className="w-3.5 h-3.5" />
                        {connectLabel}
                    </button>
                )}
            </div>
        </motion.div>
    )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type TabId = 'connections' | 'feed' | 'settings'

export default function SocialMediaClient({ connections, socialLinks, labels, lang }: SocialMediaClientProps) {
    const [activeTab, setActiveTab] = useState<TabId>('connections')

    const tabs: { id: TabId; label: string }[] = [
        { id: 'connections', label: labels.tabConnections },
        { id: 'feed', label: labels.tabFeed },
        { id: 'settings', label: labels.tabSettings },
    ]

    const connectedCount = Object.values(connections).filter(Boolean).length

    const platforms = [
        {
            icon: <Instagram className="w-6 h-6 text-[#E4405F]" />,
            name: labels.instagram,
            description: labels.instagramDesc,
            isConnected: connections.instagram,
            link: socialLinks.instagram ? `https://instagram.com/${socialLinks.instagram.replace('@', '')}` : '',
        },
        {
            icon: <Facebook className="w-6 h-6 text-[#1877F2]" />,
            name: labels.facebook,
            description: labels.facebookDesc,
            isConnected: connections.facebook,
            link: socialLinks.facebook,
        },
        {
            icon: <Music2 className="w-6 h-6 text-[#000000]" />,
            name: labels.tiktok,
            description: labels.tiktokDesc,
            isConnected: connections.tiktok,
            link: socialLinks.tiktok ? `https://tiktok.com/${socialLinks.tiktok}` : '',
        },
        {
            icon: <MapPin className="w-6 h-6 text-[#4285F4]" />,
            name: labels.googleMaps,
            description: labels.googleMapsDesc,
            isConnected: connections.googleMaps,
            link: '',
        },
    ]

    return (
        <PageEntrance>
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
                                layoutId="social-tab-indicator"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'connections' && (
                    <motion.div
                        key="connections"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Summary */}
                        <div className="mb-6 p-4 bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)]">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-[var(--color-gray-600,#4b5563)]">
                                    {labels.connectedAccounts}
                                </p>
                                <span className="text-2xl font-bold text-[var(--color-gray-900,#111827)]">
                                    {connectedCount}<span className="text-sm font-normal text-[var(--color-gray-400,#9ca3af)]">/4</span>
                                </span>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 h-2 bg-[var(--color-gray-100,#f3f4f6)] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-[var(--color-emerald-500,#10b981)] rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(connectedCount / 4) * 100}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                                />
                            </div>
                        </div>

                        {/* Platform Cards */}
                        <ListStagger>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {platforms.map((platform, i) => (
                                    <StaggerItem key={i}>
                                        <PlatformCard
                                            {...platform}
                                            connectLabel={labels.connect}
                                            disconnectLabel={labels.disconnect}
                                            connectedLabel={labels.connected}
                                            notConnectedLabel={labels.notConnected}
                                        />
                                    </StaggerItem>
                                ))}
                            </div>
                        </ListStagger>
                    </motion.div>
                )}

                {activeTab === 'feed' && (
                    <motion.div
                        key="feed"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-[var(--color-gray-50,#f9fafb)] flex items-center justify-center mx-auto mb-4">
                                <Instagram className="w-8 h-8 text-[var(--color-gray-300,#d1d5db)]" />
                            </div>
                            <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)] mb-1">
                                Feed de Instagram
                            </h3>
                            <p className="text-sm text-[var(--color-gray-400,#9ca3af)] max-w-md mx-auto">
                                Conecta tu cuenta de Instagram para mostrar las últimas publicaciones en tu tienda
                            </p>
                            {!connections.instagram && (
                                <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#833AB4] via-[#E4405F] to-[#FCAF45] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                                    <Instagram className="w-4 h-4" />
                                    Conectar Instagram
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'settings' && (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6 space-y-4">
                            <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)]">
                                {labels.tabSettings}
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-3 border-b border-[var(--color-gray-100,#f3f4f6)]">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                                            Mostrar iconos sociales en footer
                                        </p>
                                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                            Muestra enlaces a tus redes sociales en el pie de página
                                        </p>
                                    </div>
                                    <div className="w-10 h-6 bg-[var(--color-emerald-500,#10b981)] rounded-full relative cursor-pointer">
                                        <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-3 border-b border-[var(--color-gray-100,#f3f4f6)]">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                                            Feed de Instagram en home
                                        </p>
                                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                            Muestra últimas fotos de Instagram en la página principal
                                        </p>
                                    </div>
                                    <div className="w-10 h-6 bg-[var(--color-gray-200,#e5e7eb)] rounded-full relative cursor-pointer">
                                        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                                            Mapa de Google en contacto
                                        </p>
                                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                            Muestra tu ubicación en la página de contacto
                                        </p>
                                    </div>
                                    <div className="w-10 h-6 bg-[var(--color-gray-200,#e5e7eb)] rounded-full relative cursor-pointer">
                                        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageEntrance>
    )
}
