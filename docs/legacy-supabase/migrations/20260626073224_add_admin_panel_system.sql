/*
# Admin Panel System

## Overview
Adds a full admin panel system with role management, promo codes,
and admin-scoped RLS policies for all major tables.

## New Tables
- `admin_users`: Tracks which auth users have admin access.
  - `id` (uuid, PK, FK to auth.users)
  - `email` (text)
  - `created_at` (timestamp)
- `promo_codes`: Discount/promo codes that can target all orders, a specific
  product, or a specific category.
  - All fields for discount type, value, usage limits, expiry, active toggle.

## Modified Tables
- `sellers`: Added 'blocked' to the status CHECK constraint.
- `products`: Added admin-scoped SELECT/INSERT/UPDATE/DELETE policies.
- `orders`: Added admin-scoped SELECT/UPDATE policies.
- `order_items`: Added admin SELECT policy.
- `profiles`: Added admin SELECT policy.
- `storage.objects`: Added admin SELECT policy on seller-documents bucket.

## New SQL Functions
- `claim_first_admin()`: One-shot RPC that makes the caller the first admin.
  Fails if any admin already exists, preventing subsequent calls.

## Security Notes
- Admin check uses `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())`
  in every policy — standard Supabase role-check pattern, no recursion.
- `claim_first_admin()` is SECURITY DEFINER with explicit search_path.
- All new admin policies follow the 4-policy (select/insert/update/delete) pattern.
*/

-- ── admin_users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_self" ON admin_users;
CREATE POLICY "admin_select_self" ON admin_users FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- ── claim_first_admin() RPC ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_first_admin()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM admin_users;
  IF cnt > 0 THEN
    RETURN 'error: admin already exists';
  END IF;
  INSERT INTO admin_users (id, email)
  SELECT auth.uid(), email FROM auth.users WHERE id = auth.uid();
  RETURN 'success';
END;
$$;

-- ── promo_codes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE NOT NULL,
  description      TEXT,
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value   NUMERIC(10,2) NOT NULL,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_uses         INTEGER,
  used_count       INTEGER DEFAULT 0,
  applies_to       TEXT NOT NULL DEFAULT 'all'
                     CHECK (applies_to IN ('all','product','category')),
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  category_slug    TEXT REFERENCES categories(slug) ON DELETE SET NULL,
  expires_at       TIMESTAMPTZ,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_public_select"  ON promo_codes;
DROP POLICY IF EXISTS "promo_admin_select"   ON promo_codes;
DROP POLICY IF EXISTS "promo_admin_insert"   ON promo_codes;
DROP POLICY IF EXISTS "promo_admin_update"   ON promo_codes;
DROP POLICY IF EXISTS "promo_admin_delete"   ON promo_codes;

-- Anyone can read active codes (needed for checkout validation)
CREATE POLICY "promo_public_select" ON promo_codes FOR SELECT TO anon, authenticated
  USING (active = true);
-- Admins see all (active or not)
CREATE POLICY "promo_admin_select" ON promo_codes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "promo_admin_insert" ON promo_codes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "promo_admin_update" ON promo_codes FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "promo_admin_delete" ON promo_codes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE TRIGGER promo_codes_updated_at
  BEFORE UPDATE ON promo_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── sellers: add 'blocked' status ─────────────────────────────────────────────
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
  WHERE tc.table_name = 'sellers'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE sellers DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE sellers ADD CONSTRAINT sellers_status_check
  CHECK (status IN ('pending','approved','rejected','blocked'));

-- Admin can see and update ALL sellers
DROP POLICY IF EXISTS "admin_sellers_select" ON sellers;
DROP POLICY IF EXISTS "admin_sellers_update" ON sellers;
CREATE POLICY "admin_sellers_select" ON sellers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_sellers_update" ON sellers FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ── products: admin full CRUD ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_products_select" ON products;
DROP POLICY IF EXISTS "admin_products_insert" ON products;
DROP POLICY IF EXISTS "admin_products_update" ON products;
DROP POLICY IF EXISTS "admin_products_delete" ON products;
CREATE POLICY "admin_products_select" ON products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_products_insert" ON products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_products_update" ON products FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_products_delete" ON products FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ── orders: admin can read and update all ─────────────────────────────────────
DROP POLICY IF EXISTS "admin_orders_select" ON orders;
DROP POLICY IF EXISTS "admin_orders_update" ON orders;
CREATE POLICY "admin_orders_select" ON orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
CREATE POLICY "admin_orders_update" ON orders FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ── order_items: admin can read all ──────────────────────────────────────────
DROP POLICY IF EXISTS "admin_order_items_select" ON order_items;
CREATE POLICY "admin_order_items_select" ON order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ── profiles: admin can read all (for customer lookup) ───────────────────────
DROP POLICY IF EXISTS "admin_profiles_select" ON profiles;
CREATE POLICY "admin_profiles_select" ON profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- ── storage: admin can read seller-documents ──────────────────────────────────
DROP POLICY IF EXISTS "sd_admin_select" ON storage.objects;
CREATE POLICY "sd_admin_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'seller-documents'
    AND EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
  );
