'use client'

/**
 * CommandPalette — ⌘K / Ctrl+K global search + navigation
 *
 * SOTA feature present in Linear, Vercel, Shopify admin panels.
 * Global keyboard shortcut opens a fuzzy search modal over any panel page.
 *
 * Features:
 * - ⌘K / Ctrl+K to open/close
 * - Fuzzy text matching (case-insensitive substring)
 * - Keyboard navigation (↑↓ arrows, Enter to select, Escape to close)
 * - Two groups: Navigation + Quick Actions
 * - Glassmorphism modal with smooth animations
 * - Full i18n via labels prop
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Search,
    LayoutDashboard,
    Package,
    ShoppingBag,
    Users,
    Store,
    Truck,
    Kanban,
    Puzzle,
    BarChart3,
    Bot,
    Star,
    RotateCcw,
    FileText,
    MessageCircle,
    BadgeCheck,
    Image as ImageIcon,
    Plus,
    Settings,
    ArrowRight,
    Command,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommandItem {
    id: string
    label: string
    group: 'navigation' | 'actions'
    icon: string
    href: string
    keywords?: string[]
}

export interface CommandPaletteLabels {
    placeholder: string
    navigation: string
    actions: string
    noResults: string
    hint: string
}

interface CommandPaletteProps {
    items: CommandItem[]
    labels: CommandPaletteLabels
    lang: string
}

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ReactNode> = {
    dashboard: <LayoutDashboard className="w-4 h-4" />,
    catalog: <Package className="w-4 h-4" />,
    orders: <ShoppingBag className="w-4 h-4" />,
    customers: <Users className="w-4 h-4" />,
    storeConfig: <Store className="w-4 h-4" />,
    shipping: <Truck className="w-4 h-4" />,
    myProject: <Kanban className="w-4 h-4" />,
    modules: <Puzzle className="w-4 h-4" />,
    analytics: <BarChart3 className="w-4 h-4" />,
    chatbot: <Bot className="w-4 h-4" />,
    reviews: <Star className="w-4 h-4" />,
    returns: <RotateCcw className="w-4 h-4" />,
    pages: <FileText className="w-4 h-4" />,
    whatsapp: <MessageCircle className="w-4 h-4" />,
    badges: <BadgeCheck className="w-4 h-4" />,
    carousel: <ImageIcon className="w-4 h-4" />,
    crm: <Users className="w-4 h-4" />,
    addProduct: <Plus className="w-4 h-4" />,
    settings: <Settings className="w-4 h-4" />,
    action: <ArrowRight className="w-4 h-4" />,
}

// ---------------------------------------------------------------------------
// Fuzzy match (case-insensitive substring)
// ---------------------------------------------------------------------------

function fuzzyMatch(query: string, text: string, keywords?: string[]): boolean {
    const q = query.toLowerCase()
    if (text.toLowerCase().includes(q)) return true
    if (keywords?.some(k => k.toLowerCase().includes(q))) return true
    return false
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommandPalette({ items, labels, lang }: CommandPaletteProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // ── Inject animation keyframe once ─────────────────────────────────
    useEffect(() => {
        const styleId = 'cmd-palette-keyframes'
        if (document.getElementById(styleId)) return
        const style = document.createElement('style')
        style.id = styleId
        style.textContent = `
            @keyframes cmdPaletteIn {
                from { opacity: 0; transform: scale(0.96) translateY(-8px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
        `
        document.head.appendChild(style)
    }, [])

    // ── Global ⌘K / Ctrl+K listener ────────────────────────────────────
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setOpen(prev => !prev)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Focus input when opening
    useEffect(() => {
        if (open) {
            setQuery('')
            setActiveIndex(0)
            // RAF to wait for DOM mount
            requestAnimationFrame(() => inputRef.current?.focus())
        }
    }, [open])

    // ── Filtered items ──────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!query.trim()) return items
        return items.filter(item => fuzzyMatch(query, item.label, item.keywords))
    }, [items, query])

    const navItems = useMemo(() => filtered.filter(i => i.group === 'navigation'), [filtered])
    const actionItems = useMemo(() => filtered.filter(i => i.group === 'actions'), [filtered])
    const flatItems = useMemo(() => [...navItems, ...actionItems], [navItems, actionItems])

    // Reset active index when filtered items change
    useEffect(() => {
        setActiveIndex(0)
    }, [query])

    // ── Navigate to item ────────────────────────────────────────────────
    const selectItem = useCallback((item: CommandItem) => {
        setOpen(false)
        router.push(item.href)
    }, [router])

    // ── Keyboard navigation ─────────────────────────────────────────────
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setActiveIndex(prev => (prev + 1) % Math.max(flatItems.length, 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setActiveIndex(prev => (prev - 1 + flatItems.length) % Math.max(flatItems.length, 1))
                break
            case 'Enter':
                e.preventDefault()
                if (flatItems[activeIndex]) {
                    selectItem(flatItems[activeIndex])
                }
                break
            case 'Escape':
                e.preventDefault()
                setOpen(false)
                break
        }
    }, [flatItems, activeIndex, selectItem])

    // Scroll active item into view
    useEffect(() => {
        if (!listRef.current) return
        const activeEl = listRef.current.querySelector('[data-active="true"]')
        activeEl?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    if (!open) return null

    let itemCounter = 0

    return (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={() => setOpen(false)}
                aria-label="Close command palette"
            />

            {/* Modal */}
            <div className="relative mx-auto mt-[15vh] w-full max-w-lg px-4">
                <div
                    className="bg-surface-0/95 backdrop-blur-xl border border-surface-3 rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
                    style={{ animation: 'cmdPaletteIn 150ms ease-out' }}
                >
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-2">
                        <Search className="w-5 h-5 text-text-muted shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={labels.placeholder}
                            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted/50 outline-none"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-text-muted bg-surface-2 rounded border border-surface-3">
                            esc
                        </kbd>
                    </div>

                    {/* Results */}
                    <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
                        {flatItems.length === 0 ? (
                            <div className="py-8 text-center">
                                <Search className="w-8 h-8 text-text-muted/30 mx-auto mb-2" />
                                <p className="text-sm text-text-muted">{labels.noResults}</p>
                            </div>
                        ) : (
                            <>
                                {/* Navigation group */}
                                {navItems.length > 0 && (
                                    <div className="mb-2">
                                        <p className="px-3 py-1.5 text-[10px] font-semibold text-text-muted/60 uppercase tracking-wider">
                                            {labels.navigation}
                                        </p>
                                        {navItems.map(item => {
                                            const idx = itemCounter++
                                            const isActive = idx === activeIndex
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => selectItem(item)}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    data-active={isActive}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                                                        isActive
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'text-text-secondary hover:bg-surface-1'
                                                    }`}
                                                >
                                                    <span className={`shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                                                        {ICON_MAP[item.icon] || <ArrowRight className="w-4 h-4" />}
                                                    </span>
                                                    <span className="flex-1 text-left font-medium">{item.label}</span>
                                                    {isActive && (
                                                        <kbd className="text-[10px] text-text-muted/50">↵</kbd>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Actions group */}
                                {actionItems.length > 0 && (
                                    <div>
                                        <p className="px-3 py-1.5 text-[10px] font-semibold text-text-muted/60 uppercase tracking-wider">
                                            {labels.actions}
                                        </p>
                                        {actionItems.map(item => {
                                            const idx = itemCounter++
                                            const isActive = idx === activeIndex
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => selectItem(item)}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    data-active={isActive}
                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                                                        isActive
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'text-text-secondary hover:bg-surface-1'
                                                    }`}
                                                >
                                                    <span className={`shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                                                        {ICON_MAP[item.icon] || <ArrowRight className="w-4 h-4" />}
                                                    </span>
                                                    <span className="flex-1 text-left font-medium">{item.label}</span>
                                                    {isActive && (
                                                        <kbd className="text-[10px] text-text-muted/50">↵</kbd>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer hint */}
                    <div className="px-4 py-2.5 border-t border-surface-2 flex items-center justify-between">
                        <span className="text-[10px] text-text-muted/50">{labels.hint}</span>
                        <div className="flex items-center gap-1">
                            <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-text-muted/60 bg-surface-2 rounded border border-surface-3">
                                <Command className="w-2.5 h-2.5 mr-0.5" /> K
                            </kbd>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}
