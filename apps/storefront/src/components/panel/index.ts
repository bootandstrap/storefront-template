/**
 * Panel Primitives — Barrel Export
 *
 * Central import point for all shared panel components.
 *
 * Usage:
 *   import { PanelChart, PanelStatGrid, PanelDetailDrawer } from '@/components/panel'
 */

// ─── Layout ─────────────────────────────────────────────────────────────────
export { default as PanelPageHeader } from './PanelPageHeader'
export {
    PanelCard,
    PanelFilterBar,
    PanelSearchInput,
    PanelStatusTabs,
    PanelActionButton,
    PanelEmptyState,
    PanelTable,
    PanelTHead,
    PanelTH,
} from './PanelPageHeader'
export { default as PanelStatGrid } from './PanelStatGrid'

// ─── Data Display ───────────────────────────────────────────────────────────
export { default as StatCard } from './StatCard'
export { default as PanelBadge } from './PanelBadge'
export { default as PanelStatusBadge } from './PanelStatusBadge'
export { default as PanelTimeline } from './PanelTimeline'
export type { TimelineItem } from './PanelTimeline'

// ─── Charts ─────────────────────────────────────────────────────────────────
export { default as PanelChart, makeLineDataset, makeBarDataset, makeDoughnutDataset } from './PanelChart'

// ─── Overlays ───────────────────────────────────────────────────────────────
export { default as PanelDetailDrawer, DrawerSection, DrawerField } from './PanelDetailDrawer'
export { default as PanelConfirmDialog, useConfirmDialog } from './PanelConfirmDialog'
export { default as PanelActionMenu } from './PanelActionMenu'

// ─── Filters & Controls ─────────────────────────────────────────────────────
export { default as PanelDateRangeFilter, getDefaultDateRange } from './PanelDateRangeFilter'
export type { DateRange } from './PanelDateRangeFilter'
export { default as PanelExportButton } from './PanelExportButton'
export { default as PanelSelect } from './PanelSelect'
export { default as PanelPagination } from './PanelPagination'

// ─── Loading & Empty ────────────────────────────────────────────────────────
export { StatCardSkeleton, TableSkeleton, CardGridSkeleton, PageSkeleton } from './PanelSkeleton'
export { default as EmptyState } from './EmptyState'

// ─── Editor ─────────────────────────────────────────────────────────────────
export { default as PanelBlockEditor, blocksToHTML } from './PanelBlockEditor'
export type { Block, BlockType } from './PanelBlockEditor'
export { default as PanelBlockRenderer } from './PanelBlockRenderer'

// ─── Feedback ───────────────────────────────────────────────────────────────
export { default as PanelToaster } from './PanelToaster'

// ─── Shell & Cross-Cutting (Phase 5) ───────────────────────────────────────
export { default as PanelSearchFilterBar } from './PanelSearchFilterBar'
export type { FilterOption, SortOption } from './PanelSearchFilterBar'
export { default as PanelMobileNav } from './PanelMobileNav'
export { default as PanelNotificationCenter } from './PanelNotificationCenter'
export type { Notification, NotificationType } from './PanelNotificationCenter'
export { default as PanelKeyboardShortcuts, DEFAULT_PANEL_SHORTCUTS } from './PanelKeyboardShortcuts'
export type { ShortcutGroup } from './PanelKeyboardShortcuts'
export { PanelBatchProvider, useBatchProgress } from './PanelBatchProgress'
export { default as PanelBulkBar } from './PanelBulkBar'
export { default as PanelEmptyState2 } from './PanelEmptyState'
export { PanelConfirmProvider, useConfirm } from './PanelConfirmDialog'

// ─── Dashboard Components ───────────────────────────────────────────────────
export { default as UsageMeter } from './UsageMeter'
export { default as SetupProgress } from './SetupProgress'
export { default as StoreHealthCard } from './StoreHealthCard'
export { default as SmartTip } from './SmartTip'
export { default as SectionHeader } from './SectionHeader'
export { default as ActivityFeed } from './ActivityFeed'
export type { ActivityEvent } from './ActivityFeed'
export { default as PanelTableLegacy, PanelThead, PanelTbody, PanelTr, PanelTh as PanelThCell, PanelTd } from './PanelTable'

// ─── SOTA Toolkit ───────────────────────────────────────────────────────────
export { SotaBentoGrid, SotaBentoItem } from './sota/SotaBentoGrid'
export { SotaGlassCard } from './sota/SotaGlassCard'
export { SotaPillAction } from './sota/SotaInteractive'
export { SotaMetric } from './sota/SotaMetric'
export { SotaFeatureGateWrapper } from './sota/SotaFeatureGateWrapper'
export { SotaProgressRing } from './sota/SotaProgressRing'
export { SotaEmptyState } from './sota/SotaEmptyState'
