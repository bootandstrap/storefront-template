-- Add Stripe billing columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for reverse lookup from webhook events
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id
ON tenants (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id
ON tenants (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
