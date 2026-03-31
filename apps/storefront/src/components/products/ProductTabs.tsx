'use client'

import { useState } from 'react'

// ---------------------------------------------------------------------------
// Product Tabs — Description | Details | Reviews
// ---------------------------------------------------------------------------

interface Tab {
    id: string
    label: string
    content: React.ReactNode
    count?: number
}

interface ProductTabsProps {
    tabs: Tab[]
}

/**
 * ProductTabs — tabbed content for PDP.
 * Desktop: horizontal tabs. Mobile: accordion.
 */
export default function ProductTabs({ tabs }: ProductTabsProps) {
    const [activeTab, setActiveTab] = useState(tabs[0]?.id || '')

    if (tabs.length === 0) return null

    return (
        <div>
            {/* Desktop Tabs */}
            <div className="hidden md:block">
                <div className="flex border-b border-sf-3">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                                activeTab === tab.id
                                    ? 'border-brand text-brand'
                                    : 'border-transparent text-tx-muted hover:text-tx hover:border-sf-3'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="ml-1.5 text-xs bg-brand-subtle text-brand px-1.5 py-0.5 rounded-full">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="py-6">
                    {tabs.find(t => t.id === activeTab)?.content}
                </div>
            </div>

            {/* Mobile Accordion */}
            <div className="md:hidden space-y-2">
                {tabs.map(tab => {
                    const isOpen = activeTab === tab.id
                    return (
                        <div key={tab.id} className="border border-sf-3 rounded-xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setActiveTab(isOpen ? '' : tab.id)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
                                    isOpen ? 'bg-brand-subtle text-brand' : 'bg-sf-0 text-tx hover:bg-sf-1'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    {tab.label}
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded-full">
                                            {tab.count}
                                        </span>
                                    )}
                                </span>
                                <svg
                                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {isOpen && (
                                <div className="px-4 py-4 bg-sf-0 animate-fade-in text-sm text-tx-sec">
                                    {tab.content}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
