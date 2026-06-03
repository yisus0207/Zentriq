-- ======================================================
-- DATABASE SCHEMA — ZENTRIQ (PRODUCTION-GRADE MULTI-TENANT SAAS)
-- Target: PostgreSQL / Supabase
-- ======================================================

-- Enable PostGIS extension for spatial queries and geofencing
CREATE EXTENSION IF NOT EXISTS postgis;

-- Cleanup existing objects if they exist in reverse dependency order
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_restaurant_order_number() CASCADE;
DROP FUNCTION IF EXISTS is_restaurant_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_restaurant_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS associate_restaurant_creator() CASCADE;
DROP FUNCTION IF EXISTS get_public_order(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_public_order_items(UUID) CASCADE;

DROP VIEW IF EXISTS public_restaurants CASCADE;

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS restaurant_media CASCADE;
DROP TABLE IF EXISTS restaurant_settings CASCADE;
DROP TABLE IF EXISTS restaurant_business_hours CASCADE;
DROP TABLE IF EXISTS restaurant_locations CASCADE;
DROP TABLE IF EXISTS restaurant_counters CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS restaurant_members CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;

-- ======================================================
-- 1. FUNCTIONS & TRIGGERS (GENERIC)
-- ======================================================

-- Trigger function for updating updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to generate high-concurrency order codes (YYMMDD-[5-RAND-HEX])
-- This completely avoids table locks and sequential tracking vulnerabilities.
CREATE OR REPLACE FUNCTION generate_restaurant_order_number()
RETURNS TRIGGER 
SET search_path = public
AS $$
BEGIN
  NEW.order_number := to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 5));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ======================================================
-- 2. TABLES DEFINITIONS
-- ======================================================

-- 2.1 SUBSCRIPTION PLANS TABLE
CREATE TABLE subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- 'free', 'pro', 'premium'
  max_restaurants INTEGER NOT NULL DEFAULT 1,
  max_orders_month INTEGER NOT NULL DEFAULT 100,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed basic subscription plans
INSERT INTO subscription_plans (name, max_restaurants, max_orders_month, price_monthly)
VALUES 
  ('free', 1, 50, 0.00),
  ('pro', 3, 500, 29.99),
  ('premium', 99, 99999, 79.99)
ON CONFLICT (name) DO NOTHING;

-- 2.2 PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'owner'
    CONSTRAINT chk_profile_role CHECK (role IN ('owner', 'admin', 'support', 'cashier', 'kitchen', 'manager')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 RESTAURANTS TABLE
-- Owner column has been removed. Ownership is determined by roles in restaurant_members.
-- Geographic coordinates have been removed. Centralized in restaurant_locations.
CREATE TABLE restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  public_slug TEXT UNIQUE NOT NULL, -- The URL public path representation (slug)
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  phone TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free' REFERENCES subscription_plans(name),
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Allows hiding restaurant from public discoverability maps
  
  -- Audit fields
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Soft Delete fields
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NULL
);

-- 2.4 RESTAURANT MEMBERS TABLE (Multi-user roles per restaurant)
CREATE TABLE restaurant_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL
    CONSTRAINT chk_member_role CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen')),
  is_active BOOLEAN NOT NULL DEFAULT true, -- Soft toggle access state
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Prevent duplicate user membership in the same restaurant
  CONSTRAINT uq_restaurant_user UNIQUE (restaurant_id, user_id)
);

-- 2.5 RESTAURANT LOCATIONS TABLE (Multi-location / multi-branch support)
-- Includes PostGIS geography generated column for optimized proximity query calculations.
CREATE TABLE restaurant_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Sucursal Norte', 'Sede Poblado'
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  
  -- Spatial location represented as a WGS 84 geography point
  coords GEOGRAPHY(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.6 RESTAURANT BUSINESS HOURS TABLE
CREATE TABLE restaurant_business_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CONSTRAINT chk_day CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  open_time TIME NULL,
  close_time TIME NULL,
  is_closed BOOLEAN DEFAULT false,
  CONSTRAINT uq_restaurant_day UNIQUE (restaurant_id, day_of_week)
);

-- 2.7 RESTAURANT SETTINGS TABLE (Decoupled configuration parameters)
CREATE TABLE restaurant_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID UNIQUE NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'COP',
  timezone TEXT DEFAULT 'America/Bogota',
  pickup_enabled BOOLEAN DEFAULT true,
  delivery_enabled BOOLEAN DEFAULT false,
  minimum_order_value NUMERIC(10, 2) DEFAULT 0.00,
  
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.8 RESTAURANT MEDIA TABLE (Dedicated gallery asset storage)
CREATE TABLE restaurant_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CONSTRAINT chk_media_type CHECK (type IN ('logo', 'cover', 'gallery')),
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.9 MENU CATEGORIES TABLE
CREATE TABLE menu_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Emoji string or icon identifier
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit & Soft Delete
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NULL
);

-- 2.10 MENU ITEMS (PRODUCTS) TABLE
CREATE TABLE menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  options JSONB DEFAULT '[]', -- JSON array of option groups
  
  -- Audit & Soft Delete
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NULL
);

-- 2.11 ORDERS TABLE
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_number TEXT NULL, -- Alphanumeric code generated automatically (e.g. 260603-A9BF2)
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT, -- Nullable email field
  subtotal NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending'
    CONSTRAINT chk_order_status CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending'
    CONSTRAINT chk_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_type TEXT DEFAULT 'pickup'
    CONSTRAINT chk_order_type CHECK (order_type IN ('pickup', 'delivery', 'dine_in')),
  notes TEXT,
  metadata JSONB DEFAULT '{}', -- Extended metadata storage for custom integrations
  
  -- Audit & Soft Delete
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NULL
);

-- 2.12 ORDER ITEMS TABLE (Normalized purchases with historical snapshots)
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL, -- Keep item records even if deleted from menu
  quantity INTEGER NOT NULL CONSTRAINT chk_qty_positive CHECK (quantity > 0),
  price_snapshot NUMERIC(10, 2) NOT NULL,
  name_snapshot TEXT NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL
);

-- 2.13 AUDIT LOGS TABLE (For activity tracking and system events)
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., 'order_created', 'menu_item_updated'
  entity_type TEXT NOT NULL, -- e.g., 'orders', 'menu_items'
  entity_id UUID,
  ip_address TEXT, -- Client IP tracking
  user_agent TEXT, -- Client browser agent tracking
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ======================================================
-- 3. ASSIGN AUTO-UPDATED TRIGGERS & SERIALIZERS
-- ======================================================

-- 3.1 UPDATED_AT TRIGGERS
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_members_updated_at BEFORE UPDATE ON restaurant_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restaurant_settings_updated_at BEFORE UPDATE ON restaurant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3.2 ORDER NUMBER CODE GENERATOR TRIGGER (Scoped per Restaurant)
CREATE TRIGGER tr_generate_order_number BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_restaurant_order_number();

-- 3.3 AUTOMATIC RESTAURANT OWNER CREATOR PROVISIONING
-- Trigger function that auto-populates restaurant_members with 'owner' on restaurant inserts.
CREATE OR REPLACE FUNCTION associate_restaurant_creator()
RETURNS TRIGGER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO restaurant_members (restaurant_id, user_id, role, is_active)
  VALUES (
    NEW.id, 
    COALESCE(NEW.created_by, auth.uid()), 
    'owner', 
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_associate_restaurant_creator
AFTER INSERT ON restaurants
FOR EACH ROW
EXECUTE FUNCTION associate_restaurant_creator();

-- 3.4 AUTOMATIC PROFILE CREATOR ON SIGNUP (SECURITY DEFINER to bypass RLS during auth signup flow)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'owner'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ======================================================
-- 4. INDEX DEFINITIONS (Performance & Soft Delete Optimization)
-- ======================================================

-- Partial index for active public slug searches (used by public routing)
CREATE INDEX idx_restaurants_public_slug ON restaurants(public_slug) WHERE deleted_at IS NULL;

-- Spatial index for geosearch queries (using PostGIS GiST index)
CREATE INDEX idx_restaurant_locations_coords ON restaurant_locations USING GIST(coords);

-- Partial index on active memberships
CREATE INDEX idx_restaurant_members_restaurant ON restaurant_members(restaurant_id) WHERE is_active = true;
CREATE INDEX idx_restaurant_members_user ON restaurant_members(user_id) WHERE is_active = true;

-- Partial index on menu categories
CREATE INDEX idx_menu_categories_restaurant ON menu_categories(restaurant_id) WHERE deleted_at IS NULL;

-- Partial indexes on menu items
CREATE INDEX idx_menu_items_category ON menu_items(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id) WHERE deleted_at IS NULL;

-- Composite index optimized for menu rendering (category, visibility and custom ordering)
CREATE INDEX idx_menu_items_list ON menu_items(restaurant_id, category_id, is_available, sort_order) WHERE deleted_at IS NULL;

-- Partial index on orders
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status) WHERE deleted_at IS NULL;

-- Order details index
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Audit logs index
CREATE INDEX idx_audit_logs_restaurant ON audit_logs(restaurant_id);

-- Partial unique index to enforce exactly one primary location per restaurant branch setup
CREATE UNIQUE INDEX uq_primary_location 
ON restaurant_locations(restaurant_id) 
WHERE is_primary = true;


-- ======================================================
-- 5. SECURE INLINED FUNCTIONS (For RLS & query optimization)
-- ======================================================

-- SQL-language STABLE security helper function to determine membership.
-- It can be completely inlined by the PostgreSQL query planner to prevent O(N) scanning.
CREATE OR REPLACE FUNCTION is_restaurant_member(restaurant_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM restaurant_members 
    WHERE restaurant_members.restaurant_id = $1 
      AND restaurant_members.user_id = auth.uid()
      AND restaurant_members.is_active = true
  );
$$;

-- SQL-language STABLE security helper function to determine ownership.
CREATE OR REPLACE FUNCTION is_restaurant_owner(restaurant_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM restaurant_members 
    WHERE restaurant_members.restaurant_id = $1 
      AND restaurant_members.user_id = auth.uid()
      AND restaurant_members.role = 'owner'
      AND restaurant_members.is_active = true
  );
$$;


-- ======================================================
-- 6. SECURE VIEW FOR PUBLIC DISCOVERY
-- ======================================================
-- View is forced to invoke caller's context permissions (WITH security_invoker = true)
-- Hides private columns, audit logs, and soft deleted restaurants.
CREATE OR REPLACE VIEW public_restaurants 
WITH (security_invoker = true) AS
SELECT 
  id, 
  name, 
  public_slug, 
  description, 
  logo_url, 
  cover_url, 
  phone, 
  plan_type
FROM restaurants
WHERE is_active = true 
  AND is_public = true 
  AND deleted_at IS NULL;


-- ======================================================
-- 7. SECURE PUBLIC ACCESS FUNCTIONS (RPC API Wrapper)
-- ======================================================
-- Since customers cannot directly SELECT orders to avoid data leakage, they query 
-- their specific order and items through these secure, qualified RPC functions.
CREATE OR REPLACE FUNCTION get_public_order(order_uuid UUID)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  order_number TEXT,
  customer_name TEXT,
  subtotal NUMERIC,
  total NUMERIC,
  status TEXT,
  payment_status TEXT,
  order_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, 
    restaurant_id, 
    order_number, 
    customer_name, 
    subtotal, 
    total, 
    status, 
    payment_status, 
    order_type, 
    created_at
  FROM orders
  WHERE orders.id = $1 AND orders.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION get_public_order_items(order_uuid UUID)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  menu_item_id UUID,
  quantity INTEGER,
  price_snapshot NUMERIC,
  name_snapshot TEXT,
  total_price NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, 
    order_id, 
    menu_item_id, 
    quantity, 
    price_snapshot, 
    name_snapshot, 
    total_price
  FROM order_items
  WHERE order_items.order_id = $1;
$$;


-- ======================================================
-- 8. ROW LEVEL SECURITY (RLS) & GRANULAR POLICIES
-- ======================================================

-- Enable RLS across all tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 8.0 SUBSCRIPTION PLANS POLICIES
CREATE POLICY "Public can read subscription plans" ON subscription_plans FOR SELECT USING (true);

-- 8.1 PROFILES POLICIES
CREATE POLICY "Select profiles: self" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Update profiles: self" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Insert profiles: registration" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 8.2 RESTAURANTS POLICIES
CREATE POLICY "Select restaurants: public" ON restaurants FOR SELECT
  USING (is_active = true AND is_public = true AND deleted_at IS NULL);

CREATE POLICY "Select restaurants: members" ON restaurants FOR SELECT
  USING (is_restaurant_member(id));

CREATE POLICY "Insert restaurants: authenticated creators" ON restaurants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Update restaurants: owners and managers" ON restaurants FOR UPDATE
  USING (
    is_restaurant_owner(id) OR 
    (is_restaurant_member(id) AND EXISTS (
      SELECT 1 FROM restaurant_members 
      WHERE restaurant_members.restaurant_id = id 
        AND restaurant_members.user_id = auth.uid() 
        AND restaurant_members.role = 'manager'
        AND restaurant_members.is_active = true
    ))
  );

-- 8.3 RESTAURANT MEMBERS POLICIES
CREATE POLICY "Select members: restaurant members" ON restaurant_members FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Insert members: owners only" ON restaurant_members FOR INSERT
  WITH CHECK (is_restaurant_owner(restaurant_id));

CREATE POLICY "Update members: owners only" ON restaurant_members FOR UPDATE
  USING (is_restaurant_owner(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

CREATE POLICY "Delete members: owners only" ON restaurant_members FOR DELETE
  USING (is_restaurant_owner(restaurant_id));

-- 8.4 RESTAURANT LOCATIONS POLICIES
CREATE POLICY "Select locations: public" ON restaurant_locations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM restaurants
    WHERE restaurants.id = restaurant_id
      AND restaurants.is_active = true
      AND restaurants.is_public = true
      AND restaurants.deleted_at IS NULL
  ));

CREATE POLICY "Select locations: members" ON restaurant_locations FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Manage locations: owners and managers" ON restaurant_locations FOR ALL
  USING (
    is_restaurant_owner(restaurant_id) OR 
    (is_restaurant_member(restaurant_id) AND EXISTS (
      SELECT 1 FROM restaurant_members 
      WHERE restaurant_members.restaurant_id = restaurant_id 
        AND restaurant_members.user_id = auth.uid() 
        AND restaurant_members.role = 'manager'
        AND restaurant_members.is_active = true
    ))
  );

-- 8.5 RESTAURANT BUSINESS HOURS POLICIES
CREATE POLICY "Select business hours: public" ON restaurant_business_hours FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM restaurants
    WHERE restaurants.id = restaurant_id
      AND restaurants.is_active = true
      AND restaurants.is_public = true
      AND restaurants.deleted_at IS NULL
  ));

CREATE POLICY "Select business hours: members" ON restaurant_business_hours FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Manage business hours: owners and managers" ON restaurant_business_hours FOR ALL
  USING (
    is_restaurant_owner(restaurant_id) OR 
    (is_restaurant_member(restaurant_id) AND EXISTS (
      SELECT 1 FROM restaurant_members 
      WHERE restaurant_members.restaurant_id = restaurant_id 
        AND restaurant_members.user_id = auth.uid() 
        AND restaurant_members.role = 'manager'
        AND restaurant_members.is_active = true
    ))
  );

-- 8.6 RESTAURANT SETTINGS POLICIES
CREATE POLICY "Select settings: public" ON restaurant_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM restaurants
    WHERE restaurants.id = restaurant_id
      AND restaurants.is_active = true
      AND restaurants.is_public = true
      AND restaurants.deleted_at IS NULL
  ));

CREATE POLICY "Select settings: members" ON restaurant_settings FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Manage settings: owners and managers" ON restaurant_settings FOR ALL
  USING (
    is_restaurant_owner(restaurant_id) OR 
    (is_restaurant_member(restaurant_id) AND EXISTS (
      SELECT 1 FROM restaurant_members 
      WHERE restaurant_members.restaurant_id = restaurant_id 
        AND restaurant_members.user_id = auth.uid() 
        AND restaurant_members.role = 'manager'
        AND restaurant_members.is_active = true
    ))
  );

-- 8.7 RESTAURANT MEDIA POLICIES
CREATE POLICY "Select media: public" ON restaurant_media FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM restaurants
    WHERE restaurants.id = restaurant_id
      AND restaurants.is_active = true
      AND restaurants.is_public = true
      AND restaurants.deleted_at IS NULL
  ));

CREATE POLICY "Select media: members" ON restaurant_media FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Manage media: owners and managers" ON restaurant_media FOR ALL
  USING (
    is_restaurant_owner(restaurant_id) OR 
    (is_restaurant_member(restaurant_id) AND EXISTS (
      SELECT 1 FROM restaurant_members 
      WHERE restaurant_members.restaurant_id = restaurant_id 
        AND restaurant_members.user_id = auth.uid() 
        AND restaurant_members.role = 'manager'
        AND restaurant_members.is_active = true
    ))
  );

-- 8.8 MENU CATEGORIES POLICIES
CREATE POLICY "Select categories: public" ON menu_categories FOR SELECT
  USING (
    is_active = true 
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = restaurant_id
        AND restaurants.is_active = true
        AND restaurants.is_public = true
        AND restaurants.deleted_at IS NULL
    )
  );

CREATE POLICY "Select categories: members" ON menu_categories FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Manage categories: owners and managers" ON menu_categories FOR ALL
  USING (
    is_restaurant_owner(restaurant_id) OR 
    (is_restaurant_member(restaurant_id) AND EXISTS (
      SELECT 1 FROM restaurant_members 
      WHERE restaurant_members.restaurant_id = restaurant_id 
        AND restaurant_members.user_id = auth.uid() 
        AND restaurant_members.role = 'manager'
        AND restaurant_members.is_active = true
    ))
  );

-- 8.9 MENU ITEMS POLICIES
CREATE POLICY "Select menu items: public" ON menu_items FOR SELECT
  USING (
    is_available = true 
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM menu_categories
      WHERE menu_categories.id = category_id
        AND menu_categories.is_active = true
        AND menu_categories.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = restaurant_id
        AND restaurants.is_active = true
        AND restaurants.is_public = true
        AND restaurants.deleted_at IS NULL
    )
  );

CREATE POLICY "Select menu items: members" ON menu_items FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Manage menu items: owners and managers" ON menu_items FOR ALL
  USING (
    is_restaurant_owner(restaurant_id) OR 
    (is_restaurant_member(restaurant_id) AND EXISTS (
      SELECT 1 FROM restaurant_members 
      WHERE restaurant_members.restaurant_id = restaurant_id 
        AND restaurant_members.user_id = auth.uid() 
        AND restaurant_members.role = 'manager'
        AND restaurant_members.is_active = true
    ))
  );

-- 8.10 ORDERS POLICIES
CREATE POLICY "Insert orders: public" ON orders FOR INSERT
  WITH CHECK (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = restaurant_id
        AND restaurants.is_active = true
        AND restaurants.is_public = true
        AND restaurants.deleted_at IS NULL
    )
  );

CREATE POLICY "Select orders: members" ON orders FOR SELECT
  USING (is_restaurant_member(restaurant_id));

CREATE POLICY "Update orders: members" ON orders FOR UPDATE
  USING (is_restaurant_member(restaurant_id))
  WITH CHECK (is_restaurant_member(restaurant_id));

-- 8.11 ORDER ITEMS POLICIES
CREATE POLICY "Insert order items: public" ON order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
      AND orders.deleted_at IS NULL
  ));

CREATE POLICY "Select order items: members" ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_id
      AND is_restaurant_member(orders.restaurant_id)
      AND orders.deleted_at IS NULL
  ));

-- 8.12 AUDIT LOGS POLICIES
CREATE POLICY "Insert audit logs: system" ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Select audit logs: members" ON audit_logs FOR SELECT
  USING (is_restaurant_member(restaurant_id));
