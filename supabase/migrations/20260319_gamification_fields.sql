-- ============================================================================
-- Migration: Gamification columns for config table
-- Date: 2026-03-19
-- Purpose: Add typed columns for achievements, smart tips, checklist,
--          tour completion, and language preferences.
--
-- These fields power the Owner Panel gamification layer:
--   - achievements_unlocked: JSONB array of achievement IDs earned by owner
--   - dismissed_tips: JSONB array of smart tip IDs dismissed by owner
--   - checklist_skipped: Whether owner skipped the setup checklist
--   - tour_completed: Whether guided panel tour has been completed
--   - panel_language: Owner's preferred language for the panel UI
--   - storefront_language: Owner's preferred language for the storefront
--
-- Prior to this migration, actions.ts wrote to these columns via `as any`
-- casts with no schema or migration backing — this formalizes them.
-- ============================================================================

ALTER TABLE config
  ADD COLUMN IF NOT EXISTS achievements_unlocked JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dismissed_tips JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS checklist_skipped BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS panel_language TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storefront_language TEXT DEFAULT NULL;

-- Index for efficient lookups (optional — config table is small per-tenant)
COMMENT ON COLUMN config.achievements_unlocked IS 'JSONB array of achievement IDs earned by the tenant owner';
COMMENT ON COLUMN config.dismissed_tips IS 'JSONB array of smart tip IDs dismissed by the tenant owner';
COMMENT ON COLUMN config.checklist_skipped IS 'Whether the owner skipped the setup checklist (DB-persisted, replaces localStorage)';
COMMENT ON COLUMN config.tour_completed IS 'Whether the guided panel tour has been completed at least once';
COMMENT ON COLUMN config.panel_language IS 'Owner preferred language for the panel UI (null = inherit from config.language)';
COMMENT ON COLUMN config.storefront_language IS 'Owner preferred language for the storefront (null = inherit from config.language)';
