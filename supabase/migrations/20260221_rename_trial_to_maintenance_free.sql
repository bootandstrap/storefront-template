-- Rename tenant status 'trial' → 'maintenance_free'
-- BootandStrap business model: first month maintenance is free, not a product trial.

-- 1. Update existing rows
UPDATE tenants
SET status = 'maintenance_free'
WHERE status = 'trial';

-- 2. Drop old CHECK constraint and add new one
-- Note: constraint name may vary; use DO block for safety
DO $$
BEGIN
    -- Drop any CHECK constraint on status column
    PERFORM 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'tenants' AND column_name = 'status';

    -- Re-create with new valid values
    ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
    ALTER TABLE tenants ADD CONSTRAINT tenants_status_check
        CHECK (status IN ('active', 'paused', 'suspended', 'maintenance_free'));
END
$$;
