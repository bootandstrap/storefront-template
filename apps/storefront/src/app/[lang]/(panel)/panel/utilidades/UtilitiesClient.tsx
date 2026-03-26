'use client'

/**
 * UtilitiesClient — Tabbed utility hub for the owner panel
 *
 * Three tabs:
 * 1. WiFi QR — WiFi network QR code generator
 * 2. Loyalty Cards — Customer stamp cards
 * 3. Price Labels — Product barcode/price label sheets (gated: enable_ecommerce)
 */

import { useState } from 'react'
import { Wifi, Heart, Tag, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WiFiQRCard from '@/components/panel/WiFiQRCard'
import LoyaltyCardPreview from '@/components/panel/LoyaltyCardPreview'
import PriceLabelSheet from '@/components/panel/PriceLabelSheet'
import type { LoyaltyConfig, LoyaltyCustomer } from '@/lib/pos/loyalty-engine'

// ── Label interfaces ──

export interface UtilitiesLabels {
    title: string
    subtitle: string
    tabWifi: string
    tabLoyalty: string
    tabLabels: string
}

export interface WifiLabels {
    title: string
    ssid: string
    password: string
    encryption: string
    save: string
    add: string
    delete: string
    setDefault: string
    print: string
    noNetworks: string
    detectHint: string
    useLast: string
}

export interface LoyaltyLabels {
    title: string
    stamps: string
    redeem: string
    addStamp: string
    qrHint: string
    redeemed: string
    progress: string
    complete: string
    reward: string
}

export interface PriceLabelLabels {
    title: string
    print: string
    noProducts: string
    count: string
    sku: string
    noSku: string
}

type TabKey = 'wifi' | 'loyalty' | 'labels'

interface UtilitiesClientProps {
    featureFlags: Record<string, boolean>
    labels: UtilitiesLabels
    wifiLabels: WifiLabels
    loyaltyLabels: LoyaltyLabels
    labelsLabels: PriceLabelLabels
    lang: string
}

// ── Demo data for loyalty preview ──

const DEMO_LOYALTY_CONFIG: LoyaltyConfig = {
    stampsRequired: 10,
    rewardDescription: '1 free coffee',
    rewardType: 'free_product',
    rewardValue: 0,
    businessName: 'My Store',
    currencyCode: 'EUR',
}

const DEMO_LOYALTY_CUSTOMER: LoyaltyCustomer = {
    customerId: 'demo-customer',
    customerName: 'Demo Customer',
    stamps: 4,
    totalRedeemed: 0,
    lastStampAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
}

export default function UtilitiesClient({
    featureFlags,
    labels,
    wifiLabels,
    loyaltyLabels,
    labelsLabels,
    lang,
}: UtilitiesClientProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('wifi')

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; gated?: boolean }[] = [
        { key: 'wifi', label: labels.tabWifi, icon: <Wifi className="w-4 h-4" /> },
        { key: 'loyalty', label: labels.tabLoyalty, icon: <Heart className="w-4 h-4" /> },
        {
            key: 'labels',
            label: labels.tabLabels,
            icon: <Tag className="w-4 h-4" />,
            gated: !featureFlags.enable_ecommerce,
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-text-primary font-display">
                    {labels.title}
                </h1>
                <p className="text-sm text-text-muted mt-1">{labels.subtitle}</p>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 p-1 bg-surface-1 border border-surface-3 rounded-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => !tab.gated && setActiveTab(tab.key)}
                        disabled={tab.gated}
                        className={`
                            flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg
                            text-sm font-medium transition-all duration-200
                            ${activeTab === tab.key
                                ? 'bg-surface-0 text-text-primary shadow-sm border border-surface-3'
                                : tab.gated
                                    ? 'text-text-muted/40 cursor-not-allowed'
                                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-0/50'
                            }
                        `}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.gated && <Lock className="w-3 h-3 ml-0.5" />}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'wifi' && (
                        <WiFiQRCard />
                    )}

                    {activeTab === 'loyalty' && (
                        <div className="space-y-4">
                            <p className="text-sm text-text-muted">
                                {loyaltyLabels.qrHint}
                            </p>
                            <LoyaltyCardPreview
                                customer={DEMO_LOYALTY_CUSTOMER}
                                config={DEMO_LOYALTY_CONFIG}
                                lang={lang}
                                variant="compact"
                            />
                        </div>
                    )}

                    {activeTab === 'labels' && (
                        <div className="space-y-4">
                            <PriceLabelSheet items={[]} />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
