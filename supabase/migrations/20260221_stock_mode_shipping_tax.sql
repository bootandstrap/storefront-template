-- =============================================================================
-- Migration: Inventory stock mode + shipping/tax config fields
-- Covers Phase 1.7 (Inventory) and 1.9 (Shipping & Tax)
-- =============================================================================

-- 1.7 — Inventory & Stock Mode
ALTER TABLE config
ADD COLUMN IF NOT EXISTS stock_mode TEXT DEFAULT 'always_in_stock'
    CHECK (stock_mode IN ('always_in_stock', 'managed')),
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- 1.9 — Shipping & Tax display
ALTER TABLE config
ADD COLUMN IF NOT EXISTS free_shipping_threshold INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_display_mode TEXT DEFAULT 'tax_included'
    CHECK (tax_display_mode IN ('tax_included', 'tax_excluded'));
