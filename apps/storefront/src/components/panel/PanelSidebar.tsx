'use client'

/**
 * PanelSidebar — Owner Panel Navigation (SOTA 2026 Revamp)
 *
 * Clean, minimal sidebar inspired by Linear/Vercel/Notion.
 * - Icon-only collapsed mode with tooltip on hover
 * - Subtle green active indicator (left bar + tinted bg)
 * - No glassmorphism, no glow — pure clean design
 * - Self-contained inline styles for reliability with Tailwind v4
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
    LayoutDashboard,
    Store,
    ShoppingCart,
    Puzzle,
    Settings,
    Monitor,
    ChevronLeft,
    ChevronDown,
    X,
    ExternalLink,
    Package,
    FolderTree,
    Warehouse,
    Award,
    Image,
    FileText,
    Receipt,
    Users,
    Ticket,
    Undo,
    Star,
    LayoutGrid,
} from 'lucide-react'
import {
    getPanelSections,
    type PanelSidebarLabels,
    type PanelFeatureFlags,
    type PanelSubItem,
    type SectionKey,
} from '@/lib/panel-policy'

interface PanelSidebarProps {
    lang: string
    businessName: string
    labels: PanelSidebarLabels
    featureFlags: PanelFeatureFlags
    badges?: Record<string, number>
    planName?: string
    logoUrl?: string
    readinessScore?: number
    mobileOpen?: boolean
    onMobileOpenChange?: (open: boolean) => void
    collapsed?: boolean
    onCollapseChange?: (collapsed: boolean) => void
}

const SECTION_ICONS: Record<SectionKey, typeof LayoutDashboard> = {
    home: LayoutDashboard,
    myStore: Store,
    sales: ShoppingCart,
    modules: Puzzle,
    settings: Settings,
    pos: Monitor,
}

/** Map sub-item icon names to Lucide components */
const SUB_ITEM_ICONS: Record<string, typeof Package> = {
    'package': Package,
    'folder-tree': FolderTree,
    'warehouse': Warehouse,
    'award': Award,
    'image': Image,
    'file-text': FileText,
    'receipt': Receipt,
    'users': Users,
    'ticket': Ticket,
    'undo': Undo,
    'star': Star,
    'grid': LayoutGrid,
}

/* ── Inline style constants (Turbopack-proof) ── */
const S = {
    sidebar: {
        background: '#111A0B',
        borderRight: '1px solid rgba(255,255,255,0.06)',
    },
    divider: {
        height: 1,
        background: 'rgba(255,255,255,0.06)',
        margin: '8px 16px',
    },
    text: {
        primary: 'rgba(255,255,255,0.85)',
        secondary: 'rgba(255,255,255,0.50)',
        muted: 'rgba(255,255,255,0.30)',
        active: '#8BC34A',
    },
    nav: {
        base: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500 as const,
            color: 'rgba(255,255,255,0.55)',
            textDecoration: 'none' as const,
            transition: 'background 0.15s, color 0.15s',
            position: 'relative' as const,
            cursor: 'pointer' as const,
            border: 'none' as const,
            width: '100%' as const,
            lineHeight: 1.4,
        },
        active: {
            color: '#8BC34A',
            background: 'rgba(139,195,74,0.10)',
            fontWeight: 600 as const,
        },
        activeBar: {
            position: 'absolute' as const,
            left: -4,
            top: '20%',
            bottom: '20%',
            width: 3,
            borderRadius: 4,
            background: '#8BC34A',
        },
    },
    icon: {
        width: 18,
        height: 18,
        flexShrink: 0,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700 as const,
        fontSize: 13,
        background: 'linear-gradient(135deg, #4a8030, #6FAF2C)',
        color: '#fff',
        flexShrink: 0,
    },
    badge: {
        marginLeft: 'auto',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 700 as const,
        background: '#8BC34A',
        color: '#111A0B',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
    },
} as const

export default function PanelSidebar({
    lang,
    businessName,
    labels,
    featureFlags,
    badges = {},
    planName,
    logoUrl,
    readinessScore,
    mobileOpen: controlledMobileOpen,
    onMobileOpenChange,
    collapsed: controlledCollapsed,
    onCollapseChange,
}: PanelSidebarProps) {
    const pathname = usePathname()
    const [internalMobileOpen, setInternalMobileOpen] = useState(false)
    const mobileOpen = controlledMobileOpen ?? internalMobileOpen
    const setMobileOpen = (open: boolean) => {
        setInternalMobileOpen(open)
        onMobileOpenChange?.(open)
    }

    // ── Sidebar collapse state (persisted) ──
    const [internalCollapsed, setInternalCollapsed] = useState(false)
    const isCollapsed = controlledCollapsed ?? internalCollapsed
    const setCollapsed = useCallback((v: boolean) => {
        setInternalCollapsed(v)
        onCollapseChange?.(v)
        try { localStorage.setItem('panel-sidebar-collapsed', String(v)) } catch {}
    }, [onCollapseChange])

    useEffect(() => {
        try {
            const stored = localStorage.getItem('panel-sidebar-collapsed')
            if (stored === 'true') {
                setInternalCollapsed(true)
                onCollapseChange?.(true)
            }
        } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Keyboard shortcuts ──
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
            if (e.key === '[' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                setCollapsed(!isCollapsed)
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [isCollapsed, setCollapsed])

    useEffect(() => {
        if (!mobileOpen) return
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                setMobileOpen(false)
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [mobileOpen])

    const sections = getPanelSections({ lang, labels, featureFlags, badges })

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href
        return pathname === href || pathname.startsWith(href + '/')
    }

    /** Check if a sub-item's href matches the current URL (handles query params) */
    const isSubItemActive = (href: string) => {
        const [path, query] = href.split('?')
        if (query) {
            // For tab-based URLs like /panel/mi-tienda?tab=productos
            return pathname === path && typeof window !== 'undefined' && window.location.search.includes(query)
        }
        return pathname === path || pathname.startsWith(path + '/')
    }

    /** Check if any sub-item in a section is active */
    const isSectionOrChildActive = (section: typeof sections[number]) => {
        if (isActive(section.href, section.exact)) return true
        return section.subItems?.some(sub => isSubItemActive(sub.href)) ?? false
    }

    // ── Expanded sections state (persisted in localStorage) ──
    const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
        try {
            const stored = typeof window !== 'undefined' ? localStorage.getItem('panel-sidebar-expanded') : null
            return stored ? new Set(JSON.parse(stored)) : new Set<string>()
        } catch { return new Set<string>() }
    })

    const toggleSection = useCallback((key: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            try { localStorage.setItem('panel-sidebar-expanded', JSON.stringify([...next])) } catch {}
            return next
        })
    }, [])

    // Auto-expand section if a child is active
    useEffect(() => {
        for (const section of sections) {
            if (section.subItems?.some(sub => isSubItemActive(sub.href))) {
                setExpandedSections(prev => {
                    if (prev.has(section.key)) return prev
                    const next = new Set(prev)
                    next.add(section.key)
                    return next
                })
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname])

    const closeMobileMenu = () => setMobileOpen(false)
    const monogram = (businessName || 'B')[0].toUpperCase()

    const healthColor = readinessScore != null
        ? readinessScore >= 80 ? '#22c55e' : readinessScore >= 40 ? '#f59e0b' : '#ef4444'
        : undefined

    // ── Nav Item with optional accordion sub-items ──
    const renderNavLink = (section: typeof sections[number], forCollapsed = false) => {
        const IconComponent = SECTION_ICONS[section.key]
        const active = isSectionOrChildActive(section)
        const hasSubItems = !!section.subItems?.length && !forCollapsed
        const isExpanded = expandedSections.has(section.key)

        const style: React.CSSProperties = {
            ...S.nav.base,
            ...(active ? S.nav.active : {}),
            ...(forCollapsed ? { justifyContent: 'center', padding: '10px 0' } : {}),
        }

        const linkOrButton = hasSubItems ? (
            <button
                type="button"
                key={section.key}
                style={style}
                onClick={() => toggleSection(section.key)}
                data-tour-id={`nav-${section.key}`}
            >
                {active && <span style={S.nav.activeBar} />}
                <IconComponent style={S.icon} />
                <span style={{ flex: 1, textAlign: 'left' }}>{section.label}</span>
                {section.badge != null && section.badge > 0 && (
                    <span style={S.badge}>
                        {section.badge > 99 ? '99+' : section.badge}
                    </span>
                )}
                <ChevronDown style={{
                    width: 14, height: 14, transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    opacity: 0.5,
                }} />
            </button>
        ) : (
            <Link
                key={section.key}
                href={section.href}
                style={style}
                onClick={closeMobileMenu}
                title={forCollapsed ? section.label : undefined}
                data-tour-id={`nav-${section.key}`}
            >
                {active && !forCollapsed && <span style={S.nav.activeBar} />}
                <IconComponent style={S.icon} />
                {!forCollapsed && (
                    <span style={{ flex: 1 }}>{section.label}</span>
                )}
                {!forCollapsed && section.badge != null && section.badge > 0 && (
                    <span style={S.badge}>
                        {section.badge > 99 ? '99+' : section.badge}
                    </span>
                )}
            </Link>
        )

        if (!hasSubItems) return linkOrButton

        return (
            <div key={section.key}>
                {linkOrButton}
                <div style={{
                    overflow: 'hidden',
                    maxHeight: isExpanded ? `${section.subItems!.length * 36 + 8}px` : '0px',
                    transition: 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    paddingLeft: 12,
                }}>
                    <div style={{ paddingTop: 2, paddingBottom: 2 }}>
                        {section.subItems!.map(sub => renderSubItem(sub))}
                    </div>
                </div>
            </div>
        )
    }

    // ── Sub-item renderer ──
    const renderSubItem = (sub: PanelSubItem) => {
        const active = isSubItemActive(sub.href)
        const SubIcon = sub.icon ? SUB_ITEM_ICONS[sub.icon] : null

        return (
            <Link
                key={sub.key}
                href={sub.href}
                onClick={closeMobileMenu}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#8BC34A' : 'rgba(255,255,255,0.45)',
                    textDecoration: 'none',
                    transition: 'color 0.15s, background 0.15s',
                    background: active ? 'rgba(139,195,74,0.08)' : 'transparent',
                }}
            >
                {sub.emoji ? (
                    <span style={{ fontSize: 13, width: 16, textAlign: 'center', flexShrink: 0 }}>{sub.emoji}</span>
                ) : SubIcon ? (
                    <SubIcon style={{ width: 14, height: 14, flexShrink: 0, opacity: 0.7 }} />
                ) : (
                    <span style={{ width: 14, height: 14, flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sub.label}
                </span>
                {sub.badge != null && sub.badge > 0 && (
                    <span style={{ ...S.badge, fontSize: 9, minWidth: 16, height: 16 }}>
                        {sub.badge > 99 ? '99+' : sub.badge}
                    </span>
                )}
            </Link>
        )
    }

    const navigationContent = (forCollapsed = false) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sections.map(section => renderNavLink(section, forCollapsed))}
        </div>
    )

    // ── Business Identity ──
    const identityHeader = (compact = false) => (
        <div style={{ padding: compact ? '16px 8px' : '20px 16px', display: 'flex', alignItems: 'center', justifyContent: compact ? 'center' : 'flex-start', gap: 10 }}>
            {compact ? (
                <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    style={{ ...S.avatar, border: 'none', cursor: 'pointer' }}
                    title={businessName}
                >
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }} />
                    ) : (
                        monogram
                    )}
                </button>
            ) : (
                <>
                    <div style={S.avatar}>
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }} />
                        ) : (
                            monogram
                        )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: S.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {businessName}
                        </div>
                        <div style={{ fontSize: 11, color: S.text.secondary, marginTop: 1 }}>
                            {labels.ownerPanel}
                        </div>
                    </div>
                </>
            )}
        </div>
    )

    /* ── Sidebar footer ── */
    const sidebarFooter = (compact = false) => (
        <div style={{ padding: compact ? 8 : 12, display: 'flex', flexDirection: 'column', gap: 4, alignItems: compact ? 'center' : 'stretch' }}>
            {/* Health indicator */}
            {readinessScore != null && !compact && (
                <Link href={`/${lang}/panel`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, fontSize: 12, color: S.text.secondary, textDecoration: 'none' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, boxShadow: `0 0 6px ${healthColor}50`, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{readinessScore}%</span>
                    <span style={{ color: S.text.muted }}>Health</span>
                </Link>
            )}
            {readinessScore != null && compact && (
                <Link href={`/${lang}/panel`} title={`${readinessScore}% Health`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, textDecoration: 'none' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, boxShadow: `0 0 6px ${healthColor}50` }} />
                </Link>
            )}

            {/* Plan badge */}
            {planName && !compact && (
                <div style={{ padding: '4px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8BC34A', background: 'rgba(139,195,74,0.12)', border: '1px solid rgba(139,195,74,0.2)', borderRadius: 9999, padding: '2px 8px', display: 'inline-flex', alignItems: 'center' }}>
                        {planName}
                    </span>
                </div>
            )}

            {/* Back to store */}
            {!compact && (
                <a
                    href={`/${lang}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, fontSize: 13, color: S.text.secondary, textDecoration: 'none' }}
                >
                    <ExternalLink style={{ width: 14, height: 14 }} />
                    {labels.backToStore}
                </a>
            )}

            {/* Collapse toggle */}
            <button
                type="button"
                onClick={() => setCollapsed(!isCollapsed)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: compact ? 'center' : 'flex-start',
                    gap: 8,
                    padding: compact ? 8 : '6px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    color: S.text.muted,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    width: compact ? 36 : '100%',
                    height: compact ? 36 : 'auto',
                }}
                title="Toggle sidebar"
            >
                <ChevronLeft style={{ width: 14, height: 14, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(180deg)' : 'none' }} />
                {!compact && (
                    <span style={{ fontSize: 10, opacity: 0.5, fontFamily: 'monospace' }}>⌥ [</span>
                )}
            </button>
        </div>
    )

    return (
        <>
            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Panel menu">
                    <button
                        type="button"
                        aria-label="Close panel menu backdrop"
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', border: 'none', cursor: 'pointer' }}
                        onClick={closeMobileMenu}
                    />
                    <aside
                        style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: 280, maxWidth: '85vw',
                            display: 'flex', flexDirection: 'column',
                            ...S.sidebar,
                            animation: 'slide-in-left 0.25s ease-out',
                        }}
                    >
                        {/* Mobile header */}
                        <div style={{ height: 56, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <div style={{ ...S.avatar, width: 28, height: 28, fontSize: 11, borderRadius: 7 }}>
                                    {logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={logoUrl} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover' }} />
                                    ) : (
                                        monogram
                                    )}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: S.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {businessName}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={closeMobileMenu}
                                aria-label="Close panel menu"
                                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: S.text.secondary, cursor: 'pointer' }}
                            >
                                <X style={{ width: 14, height: 14 }} />
                            </button>
                        </div>

                        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
                            {navigationContent()}
                        </nav>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {sidebarFooter(false)}
                        </div>
                    </aside>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside
                style={{
                    ...S.sidebar,
                    width: isCollapsed ? 64 : 220,
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                }}
                className="hidden md:flex"
            >
                {/* Identity */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {identityHeader(isCollapsed)}
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: isCollapsed ? '12px 8px' : '12px 8px', overflowY: 'auto' }}>
                    {navigationContent(isCollapsed)}
                </nav>

                {/* Separator */}
                <div style={S.divider} />

                {/* Footer */}
                {sidebarFooter(isCollapsed)}
            </aside>
        </>
    )
}
