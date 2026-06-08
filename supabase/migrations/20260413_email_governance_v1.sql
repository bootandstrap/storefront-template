-- ═══════════════════════════════════════════════════════════════
-- Email Governance v1 — Owner Preferences + email_log Fix
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards)
-- ═══════════════════════════════════════════════════════════════

-- 1. Owner-controlled per-template toggles
-- Moved into the legacy 001_schema_core.sql squash and canonical control-plane
-- ground truth so the data-plane repo no longer introduces post-cutoff DDL
-- on control-plane-owned tables.

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
