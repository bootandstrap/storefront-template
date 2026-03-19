'use client'

/**
 * ModulesMarketplaceClient — Gamified module marketplace for owners
 *
 * Features:
 * - Category filter tabs (sell/engage/grow/automate)
 * - Module cards with gradient coloring and status badges
 * - Tier comparison in expandable detail view
 * - Monthly spend summary
 * - Upgrade/activate CTAs
 */

import { useState, useMemo } from 'react'
import type { OwnerModuleInfo } from '@/lib/owner-modules'
import ModuleCheckoutButton from '@/components/panel/ModuleCheckoutButton'

interface ModulesMarketplaceClientProps {
  catalog: OwnerModuleInfo[]
  activeModules: Record<string, { tierKey: string }>
  monthlySpend: number
  locale: string
  labels: Record<string, string>
  /** Module keys activated within last 7 days — shows glow effect */
  recentlyActivated?: string[]
}

const CATEGORIES = ['all', 'sell', 'engage', 'grow', 'automate'] as const
type Category = (typeof CATEGORIES)[number]

export default function ModulesMarketplaceClient({
  catalog,
  activeModules,
  monthlySpend,
  locale,
  labels,
  recentlyActivated = [],
}: ModulesMarketplaceClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [expandedModule, setExpandedModule] = useState<string | null>(null)

  const categoryLabels: Record<Category, string> = {
    all: labels.allCategories,
    sell: labels.categorySell,
    engage: labels.categoryEngage,
    grow: labels.categoryGrow,
    automate: labels.categoryAutomate,
  }

  const filteredModules = useMemo(() => {
    if (selectedCategory === 'all') return catalog
    return catalog.filter(m => m.category === selectedCategory)
  }, [catalog, selectedCategory])

  const activeCount = Object.keys(activeModules).length
  const totalModules = catalog.length
  const isPowerUser = activeCount >= 5

  return (
    <div className="space-y-6">
      {/* ── Power User Banner ── */}
      {isPowerUser && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <p className="text-sm font-bold text-text-primary">
                {labels.powerUserTitle || 'Power User!'}
              </p>
              <p className="text-xs text-text-muted">
                {labels.powerUserDesc || `You have ${activeCount} modules active. Keep exploring to unlock the full potential of your store!`}
              </p>
            </div>
          </div>
          {/* Subtle shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        </div>
      )}
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-1 rounded-xl p-4 border border-border">
          <div className="text-sm text-text-muted">{labels.activeModules}</div>
          <div className="text-2xl font-bold text-text-primary mt-1">
            {activeCount} <span className="text-sm font-normal text-text-muted">/ {totalModules}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${totalModules > 0 ? (activeCount / totalModules) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-surface-1 rounded-xl p-4 border border-border">
          <div className="text-sm text-text-muted">{labels.monthlySpend}</div>
          <div className="text-2xl font-bold text-text-primary mt-1">
            {monthlySpend > 0 ? `${monthlySpend} CHF` : '—'}
            <span className="text-sm font-normal text-text-muted">{labels.monthly}</span>
          </div>
        </div>

        <div className="bg-surface-1 rounded-xl p-4 border border-border">
          <div className="text-sm text-text-muted">{labels.availableModules}</div>
          <div className="text-2xl font-bold text-text-primary mt-1">
            {totalModules - activeCount}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {labels.subtitle}
          </div>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
              transition-all duration-200
              ${selectedCategory === cat
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-1 text-text-muted hover:bg-surface-2 hover:text-text-primary border border-border'
              }
            `}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* ── Module Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModules.map(mod => {
          const isActive = mod.key in activeModules
          const activeTierKey = activeModules[mod.key]?.tierKey
          const activeTier = mod.tiers.find(t => t.key === activeTierKey)
          const canUpgrade = isActive && mod.tiers.some(t => {
            const tierIndex = mod.tiers.findIndex(tt => tt.key === t.key)
            const activeIndex = mod.tiers.findIndex(tt => tt.key === activeTierKey)
            return tierIndex > activeIndex
          })
          const isExpanded = expandedModule === mod.key
          const isRecent = recentlyActivated.includes(mod.key)

          return (
            <div
              key={mod.key}
              className={`
                relative bg-surface-1 rounded-xl border transition-all duration-300
                ${isRecent
                  ? 'border-primary/50 ring-2 ring-primary/20 shadow-md shadow-primary/10 animate-pulse-subtle'
                  : isActive
                    ? 'border-primary/30 shadow-sm shadow-primary/5'
                    : 'border-border hover:border-border-hover hover:shadow-sm'
                }
              `}
            >
              {/* Module card header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`
                      text-2xl w-10 h-10 flex items-center justify-center rounded-lg
                      bg-gradient-to-br ${mod.color_gradient} bg-opacity-10
                    `}>
                      {mod.emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-text-primary">{mod.name}</h3>
                        {isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                            ✓ {labels.active}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-muted mt-0.5 line-clamp-2">{mod.description}</p>
                    </div>
                  </div>
                </div>

                {/* Price preview */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isActive && activeTier ? (
                      <span className="text-sm text-text-muted">
                        {activeTier.name} — <span className="font-semibold text-text-primary">{activeTier.price} CHF</span>{labels.monthly}
                      </span>
                    ) : (
                      <span className="text-sm text-text-muted">
                        {mod.has_free_tier
                          ? labels.free
                          : `${Math.min(...mod.tiers.map(t => t.price))} CHF${labels.monthly}`
                        }
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!isActive && (
                      <ModuleCheckoutButton
                        moduleKey={mod.key}
                        tierKey={mod.tiers[0]?.key}
                        label={labels.activate}
                        variant="activate"
                        colorGradient={mod.color_gradient}
                        locale={locale}
                      />
                    )}
                    {canUpgrade && (
                      <ModuleCheckoutButton
                        moduleKey={mod.key}
                        tierKey={mod.tiers[mod.tiers.findIndex(t => t.key === activeTierKey) + 1]?.key}
                        label={labels.upgrade}
                        variant="upgrade"
                        locale={locale}
                      />
                    )}
                    <button
                      onClick={() => setExpandedModule(isExpanded ? null : mod.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
                    >
                      {labels.viewDetails}
                    </button>
                  </div>
                </div>

                {/* Dependencies */}
                {mod.requires.length > 0 && (
                  <div className="mt-2 text-xs text-text-muted">
                    {labels.requires}: {mod.requires.map(r => {
                      const dep = catalog.find(m => m.key === r)
                      return dep?.name || r
                    }).join(', ')}
                  </div>
                )}
              </div>

              {/* ── Expanded Tier Comparison ── */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 bg-surface-0 rounded-b-xl">
                  <h4 className="text-sm font-semibold text-text-primary mb-3">{labels.features}</h4>

                  <div className="grid gap-3" style={{
                    gridTemplateColumns: `repeat(${mod.tiers.length}, 1fr)`,
                  }}>
                    {mod.tiers.map(tier => {
                      const isCurrentTier = activeTierKey === tier.key

                      return (
                        <div
                          key={tier.key}
                          className={`
                            rounded-lg p-3 border transition-all
                            ${isCurrentTier
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-surface-1'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-text-primary">{tier.name}</span>
                            {tier.is_recommended && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                                {labels.recommended}
                              </span>
                            )}
                          </div>

                          <div className="text-lg font-bold text-text-primary">
                            {tier.price > 0 ? `${tier.price} CHF` : labels.free}
                            <span className="text-xs font-normal text-text-muted">{tier.price > 0 ? labels.monthly : ''}</span>
                          </div>

                          {isCurrentTier && (
                            <div className="mt-1.5 text-xs text-primary font-medium">
                              ✓ {labels.currentPlan}
                            </div>
                          )}

                          <ul className="mt-3 space-y-1.5">
                            {tier.features.map((feature, idx) => (
                              <li key={idx} className="text-xs text-text-muted flex items-start gap-1.5">
                                <span className={`mt-0.5 ${isCurrentTier ? 'text-primary' : 'text-text-muted'}`}>✓</span>
                                {feature}
                              </li>
                            ))}
                          </ul>

                          {!isCurrentTier && (
                            <ModuleCheckoutButton
                              moduleKey={mod.key}
                              tierKey={tier.key}
                              label={isActive ? labels.upgrade : labels.activate}
                              variant={isActive && mod.tiers.indexOf(tier) > mod.tiers.findIndex(t => t.key === activeTierKey) ? 'upgrade' : 'activate'}
                              colorGradient={mod.color_gradient}
                              locale={locale}
                              className="mt-3 w-full"
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
