-- Migration: count_tenant_orders_month RPC
-- Phase 2 of MEGA PLAN v4 — Real-time order limit enforcement
-- 
-- This RPC provides a secure, anon-key-accessible count of orders
-- placed by a tenant in the current calendar month.
-- 
-- SECURITY: SECURITY DEFINER — runs as owner, callable with anon key.
-- The function reads from module_orders (status = paid/active/completed/confirmed)
-- to count actual fulfilled orders, not pending ones.
--
-- Usage from storefront:
--   SELECT count_tenant_orders_month('tenant-uuid');
-- Returns: integer (count of orders this month)

CREATE OR REPLACE FUNCTION public.count_tenant_orders_month(
    p_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    order_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO order_count
    FROM module_orders
    WHERE tenant_id = p_tenant_id
      AND status IN ('paid', 'active', 'completed', 'confirmed')
      AND created_at >= date_trunc('month', NOW());
    
    RETURN COALESCE(order_count, 0);
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.count_tenant_orders_month(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.count_tenant_orders_month(UUID) TO authenticated;

COMMENT ON FUNCTION public.count_tenant_orders_month IS 
    'Returns the count of paid/active orders for a tenant in the current month. Used by storefront checkout to enforce max_orders_month plan limit.';
