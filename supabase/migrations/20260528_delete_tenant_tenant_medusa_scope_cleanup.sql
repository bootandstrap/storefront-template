-- Ensure tenant cleanup also removes Medusa sales-channel scope bindings.
CREATE OR REPLACE FUNCTION delete_tenant(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'analytics_events',
        'cms_pages',
        'whatsapp_templates',
        'carousel_slides',
        'plan_limits',
        'feature_flags',
        'tenant_medusa_scope',
        'config'
    ] LOOP
        IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
            EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', v_table) USING p_tenant_id;
        END IF;
    END LOOP;

    DELETE FROM tenants WHERE id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
    END IF;
END;
$$;
