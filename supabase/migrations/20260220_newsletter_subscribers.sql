-- Newsletter subscribers table for footer signup
-- Canonical migration (moved from apps/storefront/supabase/migrations/)
-- Gated by enable_newsletter feature flag

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'footer'
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Admin-only read access
DROP POLICY IF EXISTS "Admins can read newsletter subscribers" ON newsletter_subscribers;
CREATE POLICY "Admins can read newsletter subscribers" ON newsletter_subscribers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
));

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
