-- ============================================================================
-- Canonical migration: Chat tables
-- Previously existed only as ad-hoc schema (created by code at runtime or
-- manually applied). This migration provides a canonical, reviewable source.
--
-- Tables: chat_settings, chat_usage, chat_logs, chat_daily_stats, chat_tier_config
-- ============================================================================

-- 1. chat_settings — per-tenant chatbot configuration
CREATE TABLE IF NOT EXISTS public.chat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    enabled BOOLEAN NOT NULL DEFAULT true,
    model TEXT NOT NULL DEFAULT 'gpt-4.1-nano',
    system_prompt TEXT,
    welcome_message TEXT,
    max_response_tokens INT NOT NULL DEFAULT 500,
    temperature NUMERIC(3,2) NOT NULL DEFAULT 0.7,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id)
);

-- 2. chat_usage — per-user monthly message counters
CREATE TABLE IF NOT EXISTS public.chat_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    month TEXT NOT NULL,           -- YYYY-MM format
    message_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id, month)
);

-- 3. chat_logs — detailed message log for analytics/audit
CREATE TABLE IF NOT EXISTS public.chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    tokens_used INT,
    locale TEXT DEFAULT 'es',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. chat_daily_stats — aggregated daily metrics
CREATE TABLE IF NOT EXISTS public.chat_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    date DATE NOT NULL,
    total_messages INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    unique_users INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, date)
);

-- 5. chat_tier_config — per-tenant tier overrides
CREATE TABLE IF NOT EXISTS public.chat_tier_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    tier TEXT NOT NULL CHECK (tier IN ('visitor', 'customer', 'premium')),
    message_limit INT,
    max_docs INT,
    quick_actions TEXT[] DEFAULT '{}',
    suggested_prompts INT,
    history_mode TEXT CHECK (history_mode IN ('session', 'local', 'cloud')),
    window_size TEXT CHECK (window_size IN ('compact', 'standard', 'full')),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, tier)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_settings_tenant ON public.chat_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_tenant_user ON public.chat_usage(tenant_id, user_id, month);
CREATE INDEX IF NOT EXISTS idx_chat_logs_tenant ON public.chat_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created ON public.chat_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_daily_stats_tenant ON public.chat_daily_stats(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_chat_tier_config_tenant ON public.chat_tier_config(tenant_id);

-- RLS
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_tier_config ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin client only)
-- These are accessed via createAdminClient() which uses service_role key
DROP POLICY IF EXISTS "chat_settings_service" ON public.chat_settings;
CREATE POLICY "chat_settings_service" ON public.chat_settings
    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "chat_usage_service" ON public.chat_usage;
CREATE POLICY "chat_usage_service" ON public.chat_usage
    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "chat_logs_service" ON public.chat_logs;
CREATE POLICY "chat_logs_service" ON public.chat_logs
    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "chat_daily_stats_service" ON public.chat_daily_stats;
CREATE POLICY "chat_daily_stats_service" ON public.chat_daily_stats
    FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "chat_tier_config_service" ON public.chat_tier_config;
CREATE POLICY "chat_tier_config_service" ON public.chat_tier_config
    FOR ALL USING (true) WITH CHECK (true);

-- RPC: increment_chat_usage (upsert pattern, called from usage-logger.ts)
CREATE OR REPLACE FUNCTION increment_chat_usage(
    p_tenant_id UUID,
    p_user_id UUID,
    p_month TEXT
) RETURNS void AS $$
BEGIN
    INSERT INTO public.chat_usage (tenant_id, user_id, month, message_count)
    VALUES (p_tenant_id, p_user_id, p_month, 1)
    ON CONFLICT (tenant_id, user_id, month)
    DO UPDATE SET
        message_count = chat_usage.message_count + 1,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
