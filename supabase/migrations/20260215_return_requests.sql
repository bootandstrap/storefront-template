-- ============================================================================
-- Canonical migration: return_requests table
-- Moved from non-canonical path (apps/storefront/src/supabase/migrations/)
-- to the proper monorepo supabase/migrations/ directory.
-- 
-- C4: This migration is idempotent (IF NOT EXISTS throughout).
-- C5: RLS admin policy now includes tenant_id scoping to prevent cross-tenant
--     data leaks.
-- ============================================================================

-- Table
CREATE TABLE IF NOT EXISTS public.return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    order_id TEXT NOT NULL,
    customer_id UUID NOT NULL REFERENCES auth.users(id),
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_return_requests_tenant 
    ON public.return_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_customer 
    ON public.return_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status 
    ON public.return_requests(status);

-- Enable RLS
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing (potentially insecure) policies, then recreate
DROP POLICY IF EXISTS "return_requests_select_own" ON public.return_requests;
DROP POLICY IF EXISTS "return_requests_insert_own" ON public.return_requests;
DROP POLICY IF EXISTS "return_requests_select_admin" ON public.return_requests;
DROP POLICY IF EXISTS "return_requests_update_admin" ON public.return_requests;

-- Customers can view their own return requests
CREATE POLICY "return_requests_select_own" ON public.return_requests
    FOR SELECT USING (
        auth.uid() = customer_id
    );

-- Customers can create new return requests
CREATE POLICY "return_requests_insert_own" ON public.return_requests
    FOR INSERT WITH CHECK (
        auth.uid() = customer_id
    );

-- C5 FIX: Admins can view return requests ONLY within their tenant
-- Previously missing: profiles.tenant_id = return_requests.tenant_id
CREATE POLICY "return_requests_select_admin" ON public.return_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'super_admin')
            AND profiles.tenant_id = return_requests.tenant_id
        )
    );

-- Admins can update return requests (status, admin_notes) within their tenant
CREATE POLICY "return_requests_update_admin" ON public.return_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'super_admin')
            AND profiles.tenant_id = return_requests.tenant_id
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_return_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_return_requests_updated_at ON public.return_requests;
CREATE TRIGGER set_return_requests_updated_at
    BEFORE UPDATE ON public.return_requests
    FOR EACH ROW EXECUTE FUNCTION update_return_requests_updated_at();
