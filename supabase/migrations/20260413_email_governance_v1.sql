-- ═══════════════════════════════════════════════════════════════
-- Email Governance v1 — Owner Preferences + email_log Fix
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)
-- ═══════════════════════════════════════════════════════════════

-- 1. Owner-controlled per-template toggles
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  -- Essential (always sendable, but owner can opt out)
  send_order_confirmation BOOLEAN DEFAULT true,
  send_payment_failed BOOLEAN DEFAULT true,
  -- Transactional (requires basic tier)
  send_order_shipped BOOLEAN DEFAULT true,
  send_order_delivered BOOLEAN DEFAULT true,
  send_order_cancelled BOOLEAN DEFAULT true,
  send_refund_processed BOOLEAN DEFAULT true,
  send_welcome BOOLEAN DEFAULT true,
  send_low_stock_alert BOOLEAN DEFAULT true,
  -- Marketing (requires pro tier)
  send_abandoned_cart BOOLEAN DEFAULT true,
  send_review_request BOOLEAN DEFAULT true,
  -- Design selection (slug of chosen template design)
  template_design TEXT DEFAULT 'minimal',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Service role full access (storefront uses admin client)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_preferences' AND policyname = 'service_email_preferences'
  ) THEN
    CREATE POLICY "service_email_preferences" ON email_preferences
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Auto-create on tenant provisioning
CREATE OR REPLACE FUNCTION trg_create_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_preferences (tenant_id) VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_preferences ON tenants;
CREATE TRIGGER trg_email_preferences
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION trg_create_email_preferences();

-- Auto-update timestamp
DROP TRIGGER IF EXISTS update_email_preferences_updated_at ON email_preferences;
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Fix email_log CHECK constraint: add missing types
-- Drop old constraint and replace with complete list
ALTER TABLE email_log DROP CONSTRAINT IF EXISTS email_log_email_type_check;
ALTER TABLE email_log ADD CONSTRAINT email_log_email_type_check
  CHECK (email_type IN (
    'order_confirmation', 'order_shipped', 'order_delivered', 'order_cancelled',
    'payment_failed', 'refund_processed', 'low_stock_alert',
    'welcome', 'password_reset', 'account_verification',
    'review_request', 'abandoned_cart', 'campaign'
  ));

-- 3. Add 'delivered' status to email_log (for Resend webhook updates)
ALTER TABLE email_log DROP CONSTRAINT IF EXISTS email_log_status_check;
ALTER TABLE email_log ADD CONSTRAINT email_log_status_check
  CHECK (status IN ('sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'));

-- 4. Add resend_id column for webhook correlation
ALTER TABLE email_log ADD COLUMN IF NOT EXISTS resend_id TEXT;
CREATE INDEX IF NOT EXISTS idx_email_log_resend_id ON email_log(resend_id)
  WHERE resend_id IS NOT NULL;
