-- ============================================================
-- Custom Email Domain Support (Ruta B — Enterprise Feature)
-- ============================================================
-- Adds custom sender domain management to tenant config.
-- Enterprise email_marketing tier can register their own domain
-- e.g. noreply@campifruit.co instead of noreply@bootandstrap.com
-- 
-- @module email_marketing (enterprise tier)
-- @governance_flag enable_custom_email_domain
-- ============================================================

-- Custom email domain columns in config table
ALTER TABLE config ADD COLUMN IF NOT EXISTS custom_email_domain TEXT;
ALTER TABLE config ADD COLUMN IF NOT EXISTS custom_email_domain_status TEXT DEFAULT 'none'
    CHECK (custom_email_domain_status IN ('none', 'pending', 'verified', 'failed'));
ALTER TABLE config ADD COLUMN IF NOT EXISTS custom_email_domain_id TEXT;
-- Resend domain ID for API verification calls

-- Index for quick lookups by domain status
CREATE INDEX IF NOT EXISTS idx_config_email_domain_status
    ON config (custom_email_domain_status)
    WHERE custom_email_domain IS NOT NULL;

COMMENT ON COLUMN config.custom_email_domain IS 'Custom sender domain for email delivery (e.g. campifruit.co). Enterprise email_marketing tier only.';
COMMENT ON COLUMN config.custom_email_domain_status IS 'DNS verification status: none | pending | verified | failed';
COMMENT ON COLUMN config.custom_email_domain_id IS 'Resend domain ID for API operations (verification, deletion)';
