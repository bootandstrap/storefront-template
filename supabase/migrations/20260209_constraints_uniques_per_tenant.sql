-- ============================================================================
-- Unique Constraints: One row per tenant for governance tables
-- ============================================================================
-- Prevents orphaned duplicate rows when provisioning fails mid-way.
-- ============================================================================

-- Only one config row per tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_config_tenant_id'
    ) THEN
        ALTER TABLE config ADD CONSTRAINT uq_config_tenant_id UNIQUE (tenant_id);
    END IF;
END $$;

-- Only one feature_flags row per tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_feature_flags_tenant_id'
    ) THEN
        ALTER TABLE feature_flags ADD CONSTRAINT uq_feature_flags_tenant_id UNIQUE (tenant_id);
    END IF;
END $$;

-- Only one plan_limits row per tenant
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_plan_limits_tenant_id'
    ) THEN
        ALTER TABLE plan_limits ADD CONSTRAINT uq_plan_limits_tenant_id UNIQUE (tenant_id);
    END IF;
END $$;
