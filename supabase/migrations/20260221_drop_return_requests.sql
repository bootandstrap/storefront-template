-- Migration: Drop unused return_requests table
-- Reason: Returns now handled by Medusa native Returns API (2026-02-21)
-- The table was a custom Supabase implementation that duplicated commerce state.
-- Code references have been removed in Fase 5 of the ecommerce audit remediation.

-- Rollback: restore table definition from migration history if needed
DROP TABLE IF EXISTS return_requests CASCADE;
