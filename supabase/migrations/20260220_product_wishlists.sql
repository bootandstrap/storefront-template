-- Product Wishlists — Medusa product favorites for storefront customers
-- Canonical migration (moved from apps/storefront/supabase/migrations/)
-- Separate from module_wishlists (which tracks SaaS module interest)

CREATE TABLE IF NOT EXISTS product_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,          -- Medusa product ID (prod_xxx)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)        -- one entry per user per product
);

ALTER TABLE product_wishlists ENABLE ROW LEVEL SECURITY;

-- Users can manage their own wishlist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own wishlist' AND tablename = 'product_wishlists') THEN
    CREATE POLICY "Users can read own wishlist" ON product_wishlists FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can add to own wishlist' AND tablename = 'product_wishlists') THEN
    CREATE POLICY "Users can add to own wishlist" ON product_wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can remove from own wishlist' AND tablename = 'product_wishlists') THEN
    CREATE POLICY "Users can remove from own wishlist" ON product_wishlists FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_product_wishlists_user ON product_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_product_wishlists_product ON product_wishlists(product_id);
