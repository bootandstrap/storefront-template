/**
 * CapacidadShell — Tab switcher: Traffic + Vault
 *
 * Wraps the existing CapacidadClient (traffic) and VaultClient (backups)
 * in a tab UI. Vault tab only shows when enable_backups is true.
 *
 * @module panel/capacidad/CapacidadShell
 */
'use client'

import { useState, type ComponentProps } from 'react'
import { Activity, Shield } from 'lucide-react'
import CapacidadClient from './CapacidadClient'
import VaultClient from './VaultClient'

type CapacidadClientProps = ComponentProps<typeof CapacidadClient>
type VaultClientProps = ComponentProps<typeof VaultClient>

interface ShellProps extends CapacidadClientProps {
    vaultEnabled: boolean
    vaultProps: Omit<VaultClientProps, 'lang'>
}

type Tab = 'traffic' | 'vault'

export default function CapacidadShell({
    vaultEnabled,
    vaultProps,
    ...capacidadProps
}: ShellProps) {
    const [activeTab, setActiveTab] = useState<Tab>('traffic')

    const tabs: { key: Tab; label: string; icon: typeof Activity }[] = [
        { key: 'traffic', label: capacidadProps.labels.title || 'Traffic', icon: Activity },
    ]

    if (vaultEnabled) {
        tabs.push({
            key: 'vault',
            label: vaultProps.labels.title || 'Vault',
            icon: Shield,
        })
    }

    // If only one tab, skip the tab bar
    if (tabs.length === 1) {
        return <CapacidadClient {...capacidadProps} />
    }

    return (
        <div className="space-y-5">
            {/* Tab bar */}
            <div className="flex gap-1 bg-sf-1/50 rounded-xl p-1 w-fit">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.key
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                isActive
                                    ? 'bg-white text-brand shadow-sm'
                                    : 'text-tx-muted hover:text-tx'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab content */}
            {activeTab === 'traffic' && <CapacidadClient {...capacidadProps} />}
            {activeTab === 'vault' && (
                <VaultClient lang={capacidadProps.lang} {...vaultProps} />
            )}
        </div>
    )
}
