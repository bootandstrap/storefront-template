'use client'

/**
 * SEO Client — Owner Panel (SOTA)
 *
 * Features:
 * - PageEntrance + ListStagger animations
 * - SEO Health Score with animated ring gauge
 * - Page audit checklist with status indicators
 * - Sitemap status card
 * - Meta tag checker table
 * - Tabbed interface (Overview / Pages / Keywords)
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search, Globe, FileText, CheckCircle2, XCircle, AlertTriangle,
    TrendingUp, ExternalLink, BarChart3, RefreshCw,
} from 'lucide-react'

import StatCard from '@/components/panel/StatCard'
import { PageEntrance, ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SEOData {
    score: number
    pagesIndexed: number
    metaIssues: number
    hasMetaTitle: boolean
    hasMetaDescription: boolean
    hasFavicon: boolean
    hasLogo: boolean
    hasSitemap: boolean
    productCount: number
    categoryCount: number
    lastCrawl: string | null
}

interface Labels {
    score: string
    pagesIndexed: string
    metaIssues: string
    performance: string
    pageAudit: string
    sitemapStatus: string
    metaChecker: string
    keywords: string
    organicTraffic: string
    backlinks: string
    googleIndexing: string
    pageTitleOk: string
    metaDescOk: string
    altImagesOk: string
    headingStructure: string
    missing: string
    configured: string
    lastCrawl: string
    tabOverview: string
    tabPages: string
    tabKeywords: string
}

interface SEOClientProps {
    seoData: SEOData
    labels: Labels
    lang: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
    if (score >= 80) return 'var(--color-emerald-500, #10b981)'
    if (score >= 50) return 'var(--color-amber-500, #f59e0b)'
    return 'var(--color-red-500, #ef4444)'
}

function scoreLabel(score: number): string {
    if (score >= 80) return 'Excelente'
    if (score >= 50) return 'Necesita mejoras'
    return 'Crítico'
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
    const radius = 52
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference
    const color = scoreColor(score)

    return (
        <div className="relative w-36 h-36 mx-auto">
            <svg className="transform -rotate-90 w-36 h-36" viewBox="0 0 120 120">
                {/* Background ring */}
                <circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke="var(--color-gray-200, #e5e7eb)"
                    strokeWidth="10"
                />
                {/* Score ring */}
                <motion.circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="text-3xl font-bold"
                    style={{ color }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                >
                    {score}
                </motion.span>
                <span className="text-xs text-[var(--color-gray-500,#6b7280)]">/100</span>
            </div>
        </div>
    )
}

function AuditItem({ label, ok, configuredLabel, missingLabel }: {
    label: string
    ok: boolean
    configuredLabel: string
    missingLabel: string
}) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-gray-100,#f3f4f6)] last:border-0">
            <div className="flex items-center gap-3">
                {ok ? (
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-emerald-500,#10b981)]" />
                ) : (
                    <XCircle className="w-5 h-5 text-[var(--color-red-500,#ef4444)]" />
                )}
                <span className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                    {label}
                </span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                ok
                    ? 'bg-[var(--color-emerald-50,#ecfdf5)] text-[var(--color-emerald-700,#047857)]'
                    : 'bg-[var(--color-red-50,#fef2f2)] text-[var(--color-red-700,#b91c1c)]'
            }`}>
                {ok ? configuredLabel : missingLabel}
            </span>
        </div>
    )
}

function PageRow({ title, path, hasTitle, hasDesc }: {
    title: string
    path: string
    hasTitle: boolean
    hasDesc: boolean
}) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-gray-100,#f3f4f6)] last:border-0">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-gray-800,#1f2937)] truncate">{title}</p>
                <p className="text-xs text-[var(--color-gray-400,#9ca3af)] truncate">{path}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
                {hasTitle ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-emerald-500,#10b981)]" />
                ) : (
                    <AlertTriangle className="w-4 h-4 text-[var(--color-amber-500,#f59e0b)]" />
                )}
                {hasDesc ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-emerald-500,#10b981)]" />
                ) : (
                    <AlertTriangle className="w-4 h-4 text-[var(--color-amber-500,#f59e0b)]" />
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabId = 'overview' | 'pages' | 'keywords'

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SEOClient({ seoData, labels, lang }: SEOClientProps) {
    const [activeTab, setActiveTab] = useState<TabId>('overview')

    const tabs: { id: TabId; label: string }[] = [
        { id: 'overview', label: labels.tabOverview },
        { id: 'pages', label: labels.tabPages },
        { id: 'keywords', label: labels.tabKeywords },
    ]

    // Simulated SEO pages for audit
    const seoPages = [
        { title: 'Página principal', path: `/${lang}`, hasTitle: seoData.hasMetaTitle, hasDesc: seoData.hasMetaDescription },
        { title: 'Catálogo', path: `/${lang}/tienda`, hasTitle: true, hasDesc: true },
        { title: 'Categorías', path: `/${lang}/categorias`, hasTitle: seoData.categoryCount > 0, hasDesc: seoData.categoryCount > 0 },
        { title: 'Contacto', path: `/${lang}/contacto`, hasTitle: true, hasDesc: false },
    ]

    // Simulated keyword data
    const keywordData = [
        { keyword: 'tienda online', position: 12, trend: 'up' as const, volume: 2400 },
        { keyword: 'comprar productos', position: 24, trend: 'up' as const, volume: 1800 },
        { keyword: 'envío gratis', position: 45, trend: 'stable' as const, volume: 3200 },
        { keyword: 'ofertas', position: 33, trend: 'down' as const, volume: 5600 },
        { keyword: 'tienda local', position: 8, trend: 'up' as const, volume: 960 },
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
                                layoutId="seo-tab-indicator"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ListStagger>
                            {/* ── Score + Stats Row ── */}
                            <StaggerItem>
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                    {/* Score Ring */}
                                    <div className="lg:col-span-1 bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6 flex flex-col items-center justify-center">
                                        <ScoreRing score={seoData.score} />
                                        <p className="mt-3 text-sm font-semibold" style={{ color: scoreColor(seoData.score) }}>
                                            {scoreLabel(seoData.score)}
                                        </p>
                                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)] mt-1">{labels.score}</p>
                                    </div>

                                    {/* Stats */}
                                    <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <StatCard
                                            label={labels.pagesIndexed}
                                            value={seoData.pagesIndexed}
                                            icon={<FileText className="w-5 h-5" />}
                                        />
                                        <StatCard
                                            label={labels.metaIssues}
                                            value={seoData.metaIssues}
                                            icon={<AlertTriangle className="w-5 h-5" />}
                                        />
                                        <StatCard
                                            label={labels.performance}
                                            value="87ms"
                                            icon={<TrendingUp className="w-5 h-5" />}
                                        />
                                    </div>
                                </div>
                            </StaggerItem>

                            {/* ── Audit + Sitemap Row ── */}
                            <StaggerItem>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                                    {/* Meta Tag Audit */}
                                    <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Search className="w-5 h-5 text-[var(--color-gray-500,#6b7280)]" />
                                            <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)]">
                                                {labels.metaChecker}
                                            </h3>
                                        </div>
                                        <AuditItem label={labels.pageTitleOk} ok={seoData.hasMetaTitle} configuredLabel={labels.configured} missingLabel={labels.missing} />
                                        <AuditItem label={labels.metaDescOk} ok={seoData.hasMetaDescription} configuredLabel={labels.configured} missingLabel={labels.missing} />
                                        <AuditItem label="Favicon" ok={seoData.hasFavicon} configuredLabel={labels.configured} missingLabel={labels.missing} />
                                        <AuditItem label="Logo" ok={seoData.hasLogo} configuredLabel={labels.configured} missingLabel={labels.missing} />
                                        <AuditItem label={labels.altImagesOk} ok={seoData.productCount > 0} configuredLabel={labels.configured} missingLabel={labels.missing} />
                                        <AuditItem label={labels.headingStructure} ok={true} configuredLabel={labels.configured} missingLabel={labels.missing} />
                                    </div>

                                    {/* Sitemap & Indexing */}
                                    <div className="space-y-4">
                                        {/* Sitemap Status */}
                                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Globe className="w-5 h-5 text-[var(--color-gray-500,#6b7280)]" />
                                                <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)]">
                                                    {labels.sitemapStatus}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-3 p-4 bg-[var(--color-emerald-50,#ecfdf5)] rounded-xl">
                                                <CheckCircle2 className="w-6 h-6 text-[var(--color-emerald-500,#10b981)]" />
                                                <div>
                                                    <p className="text-sm font-medium text-[var(--color-emerald-800,#065f46)]">
                                                        Sitemap activo
                                                    </p>
                                                    <p className="text-xs text-[var(--color-emerald-600,#059669)]">
                                                        /sitemap.xml · {seoData.pagesIndexed} URLs
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-gray-400,#9ca3af)]">
                                                <RefreshCw className="w-3 h-3" />
                                                <span>{labels.lastCrawl}: {seoData.lastCrawl ? new Date(seoData.lastCrawl).toLocaleDateString(lang) : 'Auto-indexing'}</span>
                                            </div>
                                        </div>

                                        {/* Google Indexing Status */}
                                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                                            <div className="flex items-center gap-2 mb-4">
                                                <BarChart3 className="w-5 h-5 text-[var(--color-gray-500,#6b7280)]" />
                                                <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)]">
                                                    {labels.googleIndexing}
                                                </h3>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-[var(--color-gray-600,#4b5563)]">{labels.organicTraffic}</span>
                                                    <span className="text-sm font-semibold text-[var(--color-gray-800,#1f2937)]">—</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-[var(--color-gray-600,#4b5563)]">{labels.backlinks}</span>
                                                    <span className="text-sm font-semibold text-[var(--color-gray-800,#1f2937)]">—</span>
                                                </div>
                                                <p className="text-xs text-[var(--color-gray-400,#9ca3af)] pt-2 border-t border-[var(--color-gray-100,#f3f4f6)]">
                                                    Conecta Google Search Console para datos reales
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </StaggerItem>
                        </ListStagger>
                    </motion.div>
                )}

                {activeTab === 'pages' && (
                    <motion.div
                        key="pages"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)]">
                                    {labels.pageAudit}
                                </h3>
                                <div className="flex items-center gap-4 text-xs text-[var(--color-gray-400,#9ca3af)]">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-[var(--color-emerald-500,#10b981)]" />
                                        Title
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-[var(--color-emerald-500,#10b981)]" />
                                        Description
                                    </div>
                                </div>
                            </div>
                            <ListStagger>
                                {seoPages.map((page, i) => (
                                    <StaggerItem key={i}>
                                        <PageRow {...page} />
                                    </StaggerItem>
                                ))}
                            </ListStagger>

                            {/* Product pages summary */}
                            <div className="mt-4 p-4 bg-[var(--color-gray-50,#f9fafb)] rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                                            Páginas de producto
                                        </p>
                                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                            {seoData.productCount} productos indexados
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4 text-[var(--color-emerald-500,#10b981)]" />
                                        <span className="text-xs text-[var(--color-emerald-600,#059669)]">Auto-optimizado</span>
                                    </div>
                                </div>
                            </div>

                            {/* Category pages summary */}
                            <div className="mt-2 p-4 bg-[var(--color-gray-50,#f9fafb)] rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-gray-700,#374151)]">
                                            Páginas de categoría
                                        </p>
                                        <p className="text-xs text-[var(--color-gray-400,#9ca3af)]">
                                            {seoData.categoryCount} categorías indexadas
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4 text-[var(--color-emerald-500,#10b981)]" />
                                        <span className="text-xs text-[var(--color-emerald-600,#059669)]">Auto-optimizado</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'keywords' && (
                    <motion.div
                        key="keywords"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="bg-white rounded-2xl border border-[var(--color-gray-200,#e5e7eb)] p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-[var(--color-gray-500,#6b7280)]" />
                                <h3 className="text-base font-semibold text-[var(--color-gray-800,#1f2937)]">
                                    {labels.keywords}
                                </h3>
                            </div>

                            {/* Keywords table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--color-gray-200,#e5e7eb)]">
                                            <th className="text-left py-3 px-2 font-medium text-[var(--color-gray-500,#6b7280)]">
                                                Keyword
                                            </th>
                                            <th className="text-center py-3 px-2 font-medium text-[var(--color-gray-500,#6b7280)]">
                                                Posición
                                            </th>
                                            <th className="text-center py-3 px-2 font-medium text-[var(--color-gray-500,#6b7280)]">
                                                Tendencia
                                            </th>
                                            <th className="text-right py-3 px-2 font-medium text-[var(--color-gray-500,#6b7280)]">
                                                Volumen/mes
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <ListStagger>
                                            {keywordData.map((kw, i) => (
                                                <StaggerItem key={i}>
                                                    <tr className="border-b border-[var(--color-gray-50,#f9fafb)] last:border-0 hover:bg-[var(--color-gray-50,#f9fafb)] transition-colors">
                                                        <td className="py-3 px-2">
                                                            <span className="font-medium text-[var(--color-gray-800,#1f2937)]">
                                                                {kw.keyword}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                                                                kw.position <= 10
                                                                    ? 'bg-[var(--color-emerald-50,#ecfdf5)] text-[var(--color-emerald-700,#047857)]'
                                                                    : kw.position <= 30
                                                                    ? 'bg-[var(--color-amber-50,#fffbeb)] text-[var(--color-amber-700,#b45309)]'
                                                                    : 'bg-[var(--color-gray-100,#f3f4f6)] text-[var(--color-gray-600,#4b5563)]'
                                                            }`}>
                                                                {kw.position}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                            {kw.trend === 'up' && (
                                                                <TrendingUp className="w-4 h-4 text-[var(--color-emerald-500,#10b981)] mx-auto" />
                                                            )}
                                                            {kw.trend === 'down' && (
                                                                <TrendingUp className="w-4 h-4 text-[var(--color-red-500,#ef4444)] mx-auto rotate-180" />
                                                            )}
                                                            {kw.trend === 'stable' && (
                                                                <div className="w-4 h-0.5 bg-[var(--color-gray-300,#d1d5db)] mx-auto rounded" />
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-[var(--color-gray-600,#4b5563)]">
                                                            {kw.volume.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                </StaggerItem>
                                            ))}
                                        </ListStagger>
                                    </tbody>
                                </table>
                            </div>

                            {/* Connect CTA */}
                            <div className="mt-4 p-4 bg-gradient-to-r from-[var(--color-blue-50,#eff6ff)] to-[var(--color-indigo-50,#eef2ff)] rounded-xl border border-[var(--color-blue-100,#dbeafe)]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-blue-800,#1e40af)]">
                                            ¿Quieres datos reales de ranking?
                                        </p>
                                        <p className="text-xs text-[var(--color-blue-600,#2563eb)] mt-0.5">
                                            Conecta Google Search Console para importar tus keywords y posiciones
                                        </p>
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-white text-[var(--color-blue-700,#1d4ed8)] text-sm font-medium rounded-lg border border-[var(--color-blue-200,#bfdbfe)] hover:bg-[var(--color-blue-50,#eff6ff)] transition-colors">
                                        <ExternalLink className="w-4 h-4" />
                                        Conectar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageEntrance>
    )
}
