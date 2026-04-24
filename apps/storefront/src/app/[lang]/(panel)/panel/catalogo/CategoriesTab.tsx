'use client'

/**
 * CategoriesTab — Category grid with CRUD operations
 *
 * Extracted from CatalogClient monolith.
 * Handles category listing, empty state, and action buttons.
 *
 * @module CategoriesTab
 * @locked 🟡 YELLOW — extracted component, stable interface
 */

import { Plus, Layers, X, Pencil, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListStagger, StaggerItem } from '@/components/panel/PanelAnimations'
import { SotaFeatureGateWrapper } from '@/components/panel/sota/SotaFeatureGateWrapper'
import LimitAwareCTA from '@/components/panel/LimitAwareCTA'
import ResourceBadge from '@/components/panel/ResourceBadge'
import type { LimitCheckResult } from '@/lib/limits'

interface CategoryItem {
    id: string
    name: string
    handle: string
    description: string | null
}

interface Labels {
    categories: string
    addCategory: string
    noCategories: string
    edit: string
    delete: string
    maxReached: string
}

interface Props {
    categories: CategoryItem[]
    categoryCount: number
    maxCategories: number
    canAddCategory: boolean
    categoryLimitResult?: LimitCheckResult
    categoryError: string | null
    setCategoryError: (v: string | null) => void
    onAddClick: () => void
    onEditClick: (cat: CategoryItem) => void
    onDeleteClick: (id: string) => void
    isPending: boolean
    labels: Labels
}

export default function CategoriesTab({
    categories,
    categoryCount,
    maxCategories,
    canAddCategory,
    categoryLimitResult,
    categoryError,
    setCategoryError,
    onAddClick,
    onEditClick,
    onDeleteClick,
    isPending,
    labels,
}: Props) {
    return (
        <motion.div
            key="categories"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                {categoryLimitResult ? (
                    <ResourceBadge limitResult={categoryLimitResult} label={labels.categories} showProgress />
                ) : (
                    <p className="text-xs text-tx-muted">
                        {categoryCount} / {maxCategories} {labels.categories}
                        {!canAddCategory && <span className="text-red-500 ml-2">— {labels.maxReached}</span>}
                    </p>
                )}
                {categoryLimitResult ? (
                    <LimitAwareCTA
                        label={labels.addCategory}
                        icon={<Plus className="w-4 h-4" />}
                        limitResult={categoryLimitResult}
                        onClick={onAddClick}
                        upgradeHref="modulos"
                        isLoading={isPending}
                        showCounter
                    />
                ) : (
                    <SotaFeatureGateWrapper isLocked={!canAddCategory} flag="max_categories_limit" variant="badge">
                        <button
                            className="btn btn-primary flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                            disabled={isPending || !canAddCategory}
                            onClick={onAddClick}
                        >
                            <Plus className="w-4 h-4" />
                            {labels.addCategory}
                        </button>
                    </SotaFeatureGateWrapper>
                )}
            </div>

            {/* Error banner */}
            <AnimatePresence>
                {categoryError && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between"
                    >
                        <span>{categoryError}</span>
                        <button onClick={() => setCategoryError(null)} aria-label="Dismiss error" className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Category grid */}
            {categories.length === 0 ? (
                <div className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Layers className="w-8 h-8 text-tx-muted" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-bold font-display text-tx mb-2">
                            {labels.noCategories}
                        </h3>
                        <p className="text-sm text-tx-sec leading-relaxed mb-6">
                            {labels.noCategories}
                        </p>
                        <SotaFeatureGateWrapper isLocked={!canAddCategory} flag="max_categories_limit" variant="badge">
                            <button
                                className="btn btn-primary inline-flex items-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med focus-visible:ring-offset-2"
                                disabled={isPending || !canAddCategory}
                                onClick={onAddClick}
                            >
                                <Plus className="w-4 h-4" />
                                {labels.addCategory}
                            </button>
                        </SotaFeatureGateWrapper>
                    </div>
                </div>
            ) : (
                <ListStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map(cat => (
                        <StaggerItem key={cat.id}>
                            <motion.div
                                whileHover={{ y: -2 }}
                                className="bg-sf-0/50 backdrop-blur-md border border-sf-3/30 shadow-sm rounded-2xl p-5 transition-shadow hover:shadow-lg"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-brand-subtle text-brand">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-tx">{cat.name}</h3>
                                            <p className="text-xs text-tx-muted mt-0.5">/{cat.handle}</p>
                                        </div>
                                    </div>
                                </div>
                                {cat.description && (
                                    <p className="text-sm text-tx-muted mt-3 line-clamp-2">{cat.description}</p>
                                )}
                                <div className="flex gap-1 mt-4 pt-3 border-t border-sf-2">
                                    <motion.button
                                        whileTap={{ scale: 0.93 }}
                                        onClick={() => onEditClick(cat)}
                                        className="p-2 min-h-[40px] rounded-lg hover:bg-sf-1 text-tx-muted hover:text-brand transition-colors flex-1 flex items-center justify-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-med"
                                        disabled={isPending}
                                        aria-label={`${labels.edit} ${cat.name}`}
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> {labels.edit}
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.93 }}
                                        onClick={() => onDeleteClick(cat.id)}
                                        className="p-2 min-h-[40px] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-tx-muted hover:text-red-500 transition-colors flex-1 flex items-center justify-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                        disabled={isPending}
                                        aria-label={`${labels.delete} ${cat.name}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> {labels.delete}
                                    </motion.button>
                                </div>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </ListStagger>
            )}
        </motion.div>
    )
}
