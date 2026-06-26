
-- ── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  image        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select_all"  ON categories FOR SELECT TO public      USING (true);
CREATE POLICY "categories_insert_auth" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "categories_update_auth" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "categories_delete_auth" ON categories FOR DELETE TO authenticated USING (true);

-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id      TEXT UNIQUE,
  name           TEXT NOT NULL,
  price          NUMERIC(12,2) NOT NULL,
  original_price NUMERIC(12,2),
  image          TEXT NOT NULL,
  images         TEXT[] DEFAULT '{}',
  category_slug  TEXT NOT NULL REFERENCES categories(slug),
  brand          TEXT,
  rating         NUMERIC(3,1) DEFAULT 0,
  review_count   INTEGER DEFAULT 0,
  badge          TEXT CHECK (badge IN ('sale','new','hot')),
  discount       INTEGER,
  stock          INTEGER DEFAULT 0,
  description    TEXT,
  features       TEXT[] DEFAULT '{}',
  specifications JSONB DEFAULT '{}',
  active         BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_all"  ON products FOR SELECT TO public      USING (active = true);
CREATE POLICY "products_insert_auth" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "products_update_auth" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "products_delete_auth" ON products FOR DELETE TO authenticated USING (true);
CREATE INDEX products_category_idx ON products(category_slug);
CREATE INDEX products_badge_idx    ON products(badge);
CREATE INDEX products_brand_idx    ON products(brand);
CREATE INDEX products_legacy_idx   ON products(legacy_id);

-- ── Hero Slides ───────────────────────────────────────────────────────────────
CREATE TABLE hero_slides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image       TEXT NOT NULL,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  cta_text    TEXT,
  cta_link    TEXT,
  sort_order  INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hero_select_all"  ON hero_slides FOR SELECT TO public      USING (active = true);
CREATE POLICY "hero_insert_auth" ON hero_slides FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hero_update_auth" ON hero_slides FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hero_delete_auth" ON hero_slides FOR DELETE TO authenticated USING (true);

-- ── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  phone      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- ── Addresses ────────────────────────────────────────────────────────────────
CREATE TABLE addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label         TEXT DEFAULT 'Home',
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city          TEXT NOT NULL,
  district      TEXT,
  zip_code      TEXT,
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses_select_own" ON addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "addresses_insert_own" ON addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_update_own" ON addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "addresses_delete_own" ON addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX addresses_user_idx ON addresses(user_id);

-- ── Wishlists ─────────────────────────────────────────────────────────────────
CREATE TABLE wishlists (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlists_select_own" ON wishlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wishlists_insert_own" ON wishlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wishlists_update_own" ON wishlists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wishlists_delete_own" ON wishlists FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX wishlists_user_idx ON wishlists(user_id);

-- ── Reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author        TEXT NOT NULL,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  verified      BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_all"  ON reviews FOR SELECT TO public      USING (true);
CREATE POLICY "reviews_insert_auth" ON reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own"  ON reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_delete_own"  ON reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX reviews_product_idx ON reviews(product_id);

-- ── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number     TEXT UNIQUE NOT NULL DEFAULT 'ORD-' || UPPER(SUBSTR(gen_random_uuid()::TEXT,1,8)),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_method   TEXT,
  payment_status   TEXT DEFAULT 'pending'
                     CHECK (payment_status IN ('pending','paid','failed','refunded')),
  subtotal         NUMERIC(12,2) NOT NULL,
  discount_amount  NUMERIC(12,2) DEFAULT 0,
  delivery_fee     NUMERIC(12,2) DEFAULT 0,
  total_amount     NUMERIC(12,2) NOT NULL,
  shipping_address JSONB,
  coupon_code      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own" ON orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders_insert_own" ON orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_update_own" ON orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_delete_own" ON orders FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX orders_user_idx ON orders(user_id);

-- ── Order Items ───────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE SET NULL,
  product_snapshot JSONB NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  unit_price       NUMERIC(12,2) NOT NULL,
  total_price      NUMERIC(12,2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "order_items_update_own" ON order_items FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "order_items_delete_own" ON order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE INDEX order_items_order_idx ON order_items(order_id);

-- ── Triggers ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER products_updated_at   BEFORE UPDATE ON products   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at     BEFORE UPDATE ON orders     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at   BEFORE UPDATE ON profiles   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
