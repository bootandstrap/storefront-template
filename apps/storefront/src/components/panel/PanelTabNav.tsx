'use client'

/**
 * PanelTabNav — Horizontal tab navigation for panel sections
 *
 * Renders a scrollable row of tab pills. Each tab maps to a ?tab= query param.
 * Optimized for non-tech owners: large touch targets, clear active states,
 * smooth transitions, and mobile-friendly horizontal scroll.
 *
 * Usage:
 *   <PanelTabNav
 *     tabs={[{ key: 'productos', label: 'Products', icon: <Package /> }]}
 *     activeTab="productos"
 *     onTabChange={(tab) => router.push(`?tab=${tab}`)}
 *   />
 */

import { useCallback, useRef, useEffect } from 'react'

export interface TabItem {
    key: string
    label: string
    icon?: React.ReactNode
    badge?: number
}

interface PanelTabNavProps {
    tabs: TabItem[]
    activeTab: string
    onTabChange: (tab: string) => void
    /** Additional className for the container */
    className?: string
}

export default function PanelTabNav({ tabs, activeTab, onTabChange, className = '' }: PanelTabNavProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const activeRef = useRef<HTMLButtonElement>(null)

    // Auto-scroll active tab into view on mount and tab change
    useEffect(() => {
        if (activeRef.current && scrollRef.current) {
            const container = scrollRef.current
            const tab = activeRef.current
            const containerRect = container.getBoundingClientRect()
            const tabRect = tab.getBoundingClientRect()

            if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
                tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
            }
        }
    }, [activeTab])

    const handleClick = useCallback((key: string) => {
        onTabChange(key)
    }, [onTabChange])

    if (tabs.length <= 1) return null

    return (
        <div className="relative">
            <div
                ref={scrollRef}
                className={`panel-tab-nav ${className}`}
                role="tablist"
                aria-orientation="horizontal"
            >
                {tabs.map((tab) => {
                    const isActive = tab.key === activeTab
                    return (
                        <button
                            key={tab.key}
                            ref={isActive ? activeRef : undefined}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`panel-tab-content-${tab.key}`}
                            onClick={() => handleClick(tab.key)}
                            className={`panel-tab-item ${isActive ? 'panel-tab-active' : 'panel-tab-inactive'}`}
                            style={{ minHeight: 44 }}
                        >
                            {tab.icon && (
                                <span className={`panel-tab-icon transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{tab.icon}</span>
                            )}
                            <span>{tab.label}</span>
                            {tab.badge != null && tab.badge > 0 && (
                                <span className="panel-tab-badge">
                                    {tab.badge > 99 ? '99+' : tab.badge}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
