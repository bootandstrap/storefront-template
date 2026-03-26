-- =============================================================================
-- 20260326_module_tiers_unique_constraint.sql
-- Phase 2: DB Schema Fixes for Governance Unification
-- Safe to run multiple times (all operations are idempotent)
-- =============================================================================

-- 2.1: Populate key column from tier_name (lowercase, spaces→underscores)
UPDATE module_tiers
SET key = lower(regexp_replace(tier_name, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE key IS NULL;

-- 2.2: DELETE DUPLICATES before adding UNIQUE constraint
-- Keeps the row with the highest sort_order (or lowest id as tiebreaker)
DELETE FROM module_tiers
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY module_id, tier_name
                   ORDER BY sort_order DESC, created_at DESC NULLS LAST, id DESC
               ) AS rn
        FROM module_tiers
    ) ranked
    WHERE rn > 1
);

-- 2.3: Add UNIQUE constraint on (module_id, tier_name) for idempotent seeding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_tiers_module_name'
    ) THEN
        ALTER TABLE module_tiers
        ADD CONSTRAINT uq_tiers_module_name UNIQUE (module_id, tier_name);
    END IF;
END $$;

-- 2.4: Delete legacy capacidad tiers that no longer exist in the contract
DELETE FROM module_tiers
WHERE module_id IN (SELECT id FROM modules WHERE key = 'capacidad')
  AND tier_name NOT IN ('Basic', 'Pro', 'Enterprise');

-- Verify
SELECT m.key AS module, mt.tier_name, mt.key AS tier_key, mt.price
FROM module_tiers mt
JOIN modules m ON m.id = mt.module_id
ORDER BY m.key, mt.sort_order;
