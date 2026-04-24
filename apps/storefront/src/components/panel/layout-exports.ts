/**
 * Panel Components Barrel — Layout-specific re-exports
 *
 * Consolidates panel component imports used by the (panel) layout
 * to reduce fan-out below the sentrux god-file threshold.
 *
 * Zone: 🟢 GREEN — re-exports only, no logic
 */

export { default as PanelShell } from './PanelShell'
export { default as PanelOnboarding } from './PanelOnboarding'
export { default as AchievementProvider } from './AchievementProvider'
export { default as KeyboardShortcutsGuide } from './KeyboardShortcutsGuide'
