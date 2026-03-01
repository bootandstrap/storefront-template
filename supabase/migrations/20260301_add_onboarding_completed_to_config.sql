-- ============================================================================
-- Migration: Add onboarding_completed flag to config
-- Date: 2026-03-01
-- Purpose: Persist first-run owner panel onboarding completion state.
-- ============================================================================

ALTER TABLE config
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

