-- ============================================================================
-- stripe_webhook_events — Idempotency store for Stripe webhook processing
-- ============================================================================
-- Prevents duplicate processing of webhook events on retries.
-- Service-role access only (no public RLS).
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    tenant_id UUID,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast dedup lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id 
    ON stripe_webhook_events(event_id);

-- RLS: deny all public access (service-role only)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies = no access via anon/authenticated keys

COMMENT ON TABLE stripe_webhook_events IS 
    'Idempotency store for Stripe webhook events. Service-role access only.';
