-- Performance indexes for governance tables (MEGA PLAN Phase 4.4)
-- These tables are queried on every storefront request for capability resolution.

-- Governance core tables (hot path: every page load)
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant 
  ON feature_flags(tenant_id);

CREATE INDEX IF NOT EXISTS idx_plan_limits_tenant 
  ON plan_limits(tenant_id);

CREATE INDEX IF NOT EXISTS idx_config_tenant 
  ON config(tenant_id);

-- Module orders (panel queries + webhook processing)
CREATE INDEX IF NOT EXISTS idx_module_orders_tenant_status 
  ON module_orders(tenant_id, status);

-- Job queue (cron processor queries pending/running jobs)
CREATE INDEX IF NOT EXISTS idx_async_jobs_status_created 
  ON async_jobs(status, created_at);

-- Entitlement audit log (SuperAdmin queries + cascade debugging)
CREATE INDEX IF NOT EXISTS idx_entitlement_log_tenant_created 
  ON entitlement_log(tenant_id, created_at DESC);

-- Capability overrides (engine layer 5 resolution)
CREATE INDEX IF NOT EXISTS idx_capability_overrides_tenant 
  ON capability_overrides(tenant_id);

-- Tenant errors (SuperAdmin error inbox)
CREATE INDEX IF NOT EXISTS idx_tenant_errors_tenant_created 
  ON tenant_errors(tenant_id, created_at DESC);

-- Revalidation queue (ISR processing)
CREATE INDEX IF NOT EXISTS idx_revalidation_queue_status 
  ON revalidation_queue(status, created_at);
