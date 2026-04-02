'use client'

import { useState, useRef, useEffect } from 'react'
import { Maximize, Minimize, Wifi, WifiOff, CloudUpload, Receipt, BarChart3, Clock, PauseCircle, LogOut, Printer, Heart, FileText, Settings, MoreHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { posLabel, getUpsellTooltip } from '@/lib/pos/pos-i18n'
import type { POSShift } from '@/lib/pos/pos-config'
import ClientFeatureGate from '@/components/ui/ClientFeatureGate'

interface POSToolbarProps {
    labels: Record<string, string>
    isOnline: boolean
    pendingCount: number
    lastSyncTime: Date | null
    currentShift: POSShift | null
    panelView: string | null
    setPanelView: (view: any) => void
    canAccessHistory: boolean
    canAccessDashboard: boolean
    canAccessShifts: boolean
    canShortcuts: boolean
    canKiosk: boolean
    canThermalPrint: boolean
    canLoyalty: boolean
    canEndOfDay: boolean
    isKiosk: boolean
    toggleKiosk: () => void
    parkedSalesCount: number
    handleExitPOS: () => void
}

// ── Toolbar Button Component ──────────────────────────────────────
function ToolbarButton({
    onClick,
    isLocked,
    active,
    icon: Icon,
    label,
    shortcut,
    badge,
    upsellTooltip,
    showLabel = false,
}: {
    onClick: () => void
    isLocked?: boolean
    active?: boolean
    icon: typeof Receipt
    label: string
    shortcut?: string
    badge?: number
    upsellTooltip?: string
    showLabel?: boolean
}) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            className={`relative p-2 rounded-xl text-xs transition-all min-h-[44px] flex items-center justify-center gap-1.5
                       focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none ${
                isLocked
                    ? 'text-tx-faint hover:bg-sf-1 hover:text-tx active:scale-95'
                    : active
                        ? 'bg-brand text-white shadow-sm shadow-brand/20'
                        : 'text-tx-sec hover:bg-sf-1 hover:text-tx active:scale-95'
            }`}
            title={isLocked ? upsellTooltip : `${label}${shortcut ? ` (${shortcut})` : ''}`}
        >
            <Icon className="w-4 h-4 shrink-0" />
            {showLabel && (
                <span className="hidden xl:inline text-[11px] font-semibold">{label}</span>
            )}
            {badge != null && badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center
                                text-[9px] font-bold bg-amber-500 text-white rounded-full px-1">
                    {badge}
                </span>
            )}
        </button>
    )
}

// ── Dropdown Menu Item ────────────────────────────────────────────
function DropdownItem({
    onClick,
    isLocked,
    active,
    icon: Icon,
    label,
    upsellTooltip,
}: {
    onClick: () => void
    isLocked?: boolean
    active?: boolean
    icon: typeof Receipt
    label: string
    upsellTooltip?: string
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                       min-h-[40px] text-left
                       focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none ${
                isLocked
                    ? 'text-tx-faint hover:bg-sf-1 hover:text-tx'
                    : active
                        ? 'bg-brand/10 text-brand'
                        : 'text-tx-sec hover:bg-sf-1 hover:text-tx'
            }`}
            title={isLocked ? upsellTooltip : label}
        >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
        </button>
    )
}

export default function POSToolbar({
    labels,
    isOnline,
    pendingCount,
    lastSyncTime,
    currentShift,
    panelView,
    setPanelView,
    canAccessHistory,
    canAccessDashboard,
    canAccessShifts,
    canShortcuts,
    canKiosk,
    canThermalPrint,
    canLoyalty,
    canEndOfDay,
    isKiosk,
    toggleKiosk,
    parkedSalesCount,
    handleExitPOS,
}: POSToolbarProps) {
    const [moreOpen, setMoreOpen] = useState(false)
    const [gateData, setGateData] = useState<{isOpen: boolean, flag: string}>({ isOpen: false, flag: '' })
    const moreRef = useRef<HTMLDivElement>(null)

    // Close "More" dropdown on outside click
    useEffect(() => {
        if (!moreOpen) return
        const handleClick = (e: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
                setMoreOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [moreOpen])

    const togglePanel = (view: string) => {
        setPanelView((v: string | null) => v === view ? null : view)
    }

    const handleFeatureClick = (canAccess: boolean, flag: string, action: () => void) => {
        if (!canAccess) {
            setGateData({ isOpen: true, flag })
        } else {
            action()
        }
    }

    return (
        <div className="flex items-center justify-between px-3 md:px-4 py-2 border-b border-sf-2 bg-glass-heavy backdrop-blur-xl flex-shrink-0">
            <ClientFeatureGate
                isOpen={gateData.isOpen}
                onClose={() => setGateData({ ...gateData, isOpen: false })}
                flag={gateData.flag}
            />

            {/* ═══ Left: Exit + Brand + Status ═══ */}
            <div className="flex items-center gap-2 md:gap-3">
                <button
                    onClick={handleExitPOS}
                    className="min-h-[44px] min-w-[44px] rounded-xl hover:bg-sf-1 text-tx-sec
                               flex items-center justify-center transition-all active:scale-95
                               focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none"
                    title={posLabel('panel.pos.exitPOS', labels) || 'Salir del POS'}
                >
                    <LogOut className="w-5 h-5" />
                </button>
                <h1 className="text-sm font-bold text-tx tracking-tight uppercase hidden sm:block">
                    ⚡ {posLabel('panel.pos.title', labels)}
                </h1>

                {/* Status indicators */}
                <div className="flex items-center gap-1.5">
                    {/* Online/Offline orb */}
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-semibold transition-colors ${
                        isOnline
                            ? 'bg-brand/10 text-brand ring-1 ring-brand/20'
                            : 'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20'
                    }`}>
                        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        <span className="hidden sm:inline">
                            {isOnline ? posLabel('panel.pos.online', labels) : posLabel('panel.pos.offline', labels)}
                        </span>
                    </span>

                    {/* Pending sync badge */}
                    <AnimatePresence>
                        {pendingCount > 0 && (
                            <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full
                                             bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 font-semibold"
                            >
                                <CloudUpload className="w-3 h-3" />
                                {pendingCount}
                            </motion.span>
                        )}
                    </AnimatePresence>

                    {/* Current shift */}
                    {currentShift && (
                        <span className="hidden lg:inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full
                                         bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 font-semibold">
                            <Clock className="w-3 h-3" />
                            {currentShift.total_sales} {posLabel('panel.pos.historySales', labels)}
                        </span>
                    )}
                </div>
            </div>

            {/* ═══ Right: Panel navigation ═══ */}
            <div className="flex items-center gap-1">
                {/* Last sync — hidden on small screens */}
                {lastSyncTime && (
                    <span className="hidden xl:flex items-center text-[10px] text-tx-muted mr-2">
                        {posLabel('panel.pos.lastSync', labels)}: {lastSyncTime.toLocaleTimeString()}
                    </span>
                )}

                {/* ── Primary nav group ── */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-sf-1/60">
                    <ToolbarButton
                        onClick={() => handleFeatureClick(canAccessHistory, 'enable_pos_shifts', () => togglePanel('history'))}
                        isLocked={!canAccessHistory}
                        active={panelView === 'history'}
                        icon={Receipt}
                        label={posLabel('panel.pos.history', labels)}
                        shortcut={canShortcuts ? 'F3' : undefined}
                        upsellTooltip={getUpsellTooltip('enable_pos_shifts', labels)}
                        showLabel
                    />
                    <ToolbarButton
                        onClick={() => handleFeatureClick(canAccessDashboard, 'enable_pos_advanced', () => togglePanel('dashboard'))}
                        isLocked={!canAccessDashboard}
                        active={panelView === 'dashboard'}
                        icon={BarChart3}
                        label={posLabel('panel.pos.dashboard', labels)}
                        shortcut={canShortcuts ? 'F5' : undefined}
                        upsellTooltip={getUpsellTooltip('enable_pos_thermal_printer', labels)}
                        showLabel
                    />
                    <ToolbarButton
                        onClick={() => handleFeatureClick(canAccessShifts, 'enable_pos_shifts', () => togglePanel('shift'))}
                        isLocked={!canAccessShifts}
                        active={panelView === 'shift'}
                        icon={Clock}
                        label={posLabel('panel.pos.shift', labels)}
                        upsellTooltip={getUpsellTooltip('enable_pos_shifts', labels)}
                    />
                    <ToolbarButton
                        onClick={() => togglePanel('parkedSales')}
                        active={panelView === 'parkedSales'}
                        icon={PauseCircle}
                        label={posLabel('panel.pos.parkedSales', labels)}
                        badge={parkedSalesCount}
                    />
                    {/* Loyalty stays visible (user decision) */}
                    <ToolbarButton
                        onClick={() => handleFeatureClick(canLoyalty, 'enable_pos_loyalty', () => togglePanel('loyalty'))}
                        isLocked={!canLoyalty}
                        active={panelView === 'loyalty'}
                        icon={Heart}
                        label={posLabel('panel.pos.loyaltyCard', labels)}
                        upsellTooltip={getUpsellTooltip('enable_pos_shifts', labels)}
                    />
                </div>

                {/* ── Divider ── */}
                <div className="w-px h-5 bg-sf-3 mx-1" />

                {/* ── Secondary actions: "More" dropdown (End-of-Day, Printer) ── */}
                <div className="relative" ref={moreRef}>
                    <button
                        onClick={() => setMoreOpen(!moreOpen)}
                        className={`p-2 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center
                                   focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none ${
                            moreOpen
                                ? 'bg-sf-2 text-tx'
                                : 'hover:bg-sf-1 text-tx-sec'
                        }`}
                        aria-label="More options"
                        aria-expanded={moreOpen}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                        {moreOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="absolute right-0 top-full mt-2 w-56 bg-sf-0 border border-sf-2 shadow-xl rounded-2xl p-1 z-50"
                            >
                                {/* End-of-Day Report */}
                                <DropdownItem
                                    onClick={() => handleFeatureClick(canEndOfDay, 'enable_pos_thermal_printer', () => { togglePanel('endOfDay'); setMoreOpen(false) })}
                                    isLocked={!canEndOfDay}
                                    active={panelView === 'endOfDay'}
                                    icon={FileText}
                                    label={posLabel('panel.pos.endOfDayReport', labels)}
                                    upsellTooltip={getUpsellTooltip('enable_pos_thermal_printer', labels)}
                                />
                                {/* Printer settings */}
                                <DropdownItem
                                    onClick={() => handleFeatureClick(canThermalPrint, 'enable_pos_thermal_printer', () => { togglePanel('printerSettings'); setMoreOpen(false) })}
                                    isLocked={!canThermalPrint}
                                    active={panelView === 'printerSettings'}
                                    icon={Printer}
                                    label={posLabel('panel.pos.printerSettings', labels) || 'Printer settings'}
                                />
                                {/* Divider */}
                                <div className="h-px bg-sf-2 my-1" />
                                {/* POS Settings */}
                                <DropdownItem
                                    onClick={() => { togglePanel('posSettings'); setMoreOpen(false) }}
                                    active={panelView === 'posSettings'}
                                    icon={Settings}
                                    label={posLabel('panel.pos.settings', labels) || 'POS Settings'}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Kiosk toggle ── */}
                <button
                    onClick={() => handleFeatureClick(canKiosk, 'enable_pos_kiosk', toggleKiosk)}
                    aria-label={posLabel('panel.pos.kioskMode', labels)}
                    className={`p-2 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center
                               focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:outline-none ${
                        !canKiosk
                            ? 'text-tx-faint hover:bg-sf-1 hover:text-tx active:scale-95'
                            : 'hover:bg-sf-1 text-tx-sec active:scale-95'
                    }`}
                    title={canKiosk
                        ? `${posLabel('panel.pos.kioskMode', labels)}${canShortcuts ? ' (F11)' : ''}`
                        : getUpsellTooltip('enable_pos_kiosk', labels)
                    }
                >
                    {isKiosk ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>

                {/* Keyboard shortcuts hint */}
                {canShortcuts && (
                    <div className="hidden 2xl:flex items-center gap-1 text-[10px] text-tx-muted ml-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-sf-2 font-mono text-[9px]">F2</kbd>
                        <span>{posLabel('panel.pos.search', labels).split('…')[0]}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

