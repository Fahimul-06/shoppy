
/*
# Seller System

## Overview
Adds a complete seller/vendor system to the e-commerce platform.

## New Tables
- `sellers`: Stores seller/vendor profiles linked to Supabase auth users.
  - `id` — matches auth.users.id (PK)
  - `name` — full legal name of the seller
  - `phone` — unique phone number used as login identifier
  - `address` — personal address
  - `shop_name` — name of the seller's shop
  - `shop_address` — physical shop location
  - `nid_front_url` — Storage URL for NID front image
  - `nid_back_url` — Storage URL for NID back image
  - `trade_license_url` — Storage URL for trade license image
  - `status` — account status: pending | approved | rejected
  - `rejection_reason` — optional note from admin on rejection

## Modified Tables
- `products`: Added `seller_id` (nullable UUID FK to auth.users).
  Platform-seeded products remain seller_id = NULL.
  New products inserted by sellers automatically get seller_id = auth.uid() via column DEFAULT.
  RLS policies updated: sellers can only insert/update/delete their own products.

## Storage Buckets
- `seller-documents` (private) — NID front/back and trade license photos.
  Path pattern: {user_id}/{filename}
- `product-images` (public) — product photos uploaded by sellers.
  Path pattern: {user_id}/{filename}

## Security
- RLS enabled on sellers table with owner-scoped policies.
- Products insert/update/delete policies updated to scope per seller_id.
- Storage object policies restrict sellers to their own folder.
*/

-- ── Sellers table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sellers (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  phone             TEXT UNIQUE NOT NULL,
  address           TEXT NOT NULL,
  shop_name         TEXT NOT NULL,
  shop_address      TEXT NOT NULL,
  nid_front_url     TEXT,
  nid_back_url      TEXT,
  trade_license_url TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected')),
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sellers_select_own"  ON sellers;
DROP POLICY IF EXISTS "sellers_insert_own"  ON sellers;
DROP POLICY IF EXISTS "sellers_update_own"  ON sellers;
DROP POLICY IF EXISTS "sellers_delete_own"  ON sellers;

CREATE POLICY "sellers_select_own" ON sellers FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "sellers_insert_own" ON sellers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "sellers_update_own" ON sellers FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "sellers_delete_own" ON sellers FOR DELETE TO authenticated
  USING (auth.uid() = id);

CREATE TRIGGER sellers_updated_at
  BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Add seller_id to products ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'seller_id'
  ) THEN
    ALTER TABLE products
      ADD COLUMN seller_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS products_seller_idx ON products(seller_id);

-- Update products RLS: replace blanket authenticated policies with seller-scoped ones
DROP POLICY IF EXISTS "products_insert_auth"           ON products;
DROP POLICY IF EXISTS "products_update_auth"           ON products;
DROP POLICY IF EXISTS "products_delete_auth"           ON products;
DROP POLICY IF EXISTS "sellers_insert_products"        ON products;
DROP POLICY IF EXISTS "sellers_update_own_products"    ON products;
DROP POLICY IF EXISTS "sellers_delete_own_products"    ON products;
DROP POLICY IF EXISTS "sellers_select_own_products"    ON products;

-- Sellers can see ALL their own products (active or not)
CREATE POLICY "sellers_select_own_products" ON products FOR SELECT TO authenticated
  USING (auth.uid() = seller_id);

-- Sellers can insert products; DEFAULT auth.uid() on seller_id satisfies WITH CHECK
CREATE POLICY "sellers_insert_products" ON products FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can update only their own products
CREATE POLICY "sellers_update_own_products" ON products FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete only their own products
CREATE POLICY "sellers_delete_own_products" ON products FOR DELETE TO authenticated
  USING (auth.uid() = seller_id);

-- ── Storage buckets ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('seller-documents', 'seller-documents', false, 5242880,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
  ('product-images',   'product-images',   true,  5242880,
   ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — seller-documents (private, owner-folder only)
DROP POLICY IF EXISTS "sd_insert" ON storage.objects;
DROP POLICY IF EXISTS "sd_select" ON storage.objects;
DROP POLICY IF EXISTS "sd_update" ON storage.objects;
DROP POLICY IF EXISTS "sd_delete" ON storage.objects;

CREATE POLICY "sd_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'seller-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sd_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'seller-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sd_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'seller-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "sd_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'seller-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS — product-images (public read, owner-folder write)
DROP POLICY IF EXISTS "pi_public_select" ON storage.objects;
DROP POLICY IF EXISTS "pi_insert"        ON storage.objects;
DROP POLICY IF EXISTS "pi_update"        ON storage.objects;
DROP POLICY IF EXISTS "pi_delete"        ON storage.objects;

CREATE POLICY "pi_public_select" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product-images');
CREATE POLICY "pi_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "pi_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "pi_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text);
