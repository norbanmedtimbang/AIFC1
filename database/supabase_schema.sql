-- ==============================================================================
-- C5ISR COFFEE SHOP POS — SUPABASE (POSTGRESQL) SCHEMA
-- Ready to run directly in Supabase Dashboard -> SQL Editor
-- Stores Philippine Peso (₱) amounts in integer centavos (cents)
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & STAFF
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'manager', 'cashier')) NOT NULL,
    status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 2. CASHIER SHIFTS & DRAWER RECONCILIATION
CREATE TABLE IF NOT EXISTS public.cashier_shifts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id),
    opening_cash_cents BIGINT NOT NULL,
    closing_cash_cents BIGINT,
    expected_cash_cents BIGINT,
    actual_cash_cents BIGINT,
    cash_variance_cents BIGINT,
    notes TEXT,
    status TEXT CHECK (status IN ('open', 'closed')) DEFAULT 'open',
    opened_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    closed_at TIMESTAMPTZ
);

-- 3. CASH MOVEMENTS
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL REFERENCES public.cashier_shifts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id),
    type TEXT CHECK (type IN ('cash_in', 'cash_out', 'drop')) NOT NULL,
    amount_cents BIGINT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 4. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    color_code TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 6. PRODUCT VARIANTS
CREATE TABLE IF NOT EXISTS public.product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    price_cents BIGINT NOT NULL,
    cost_price_cents BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- 7. MODIFIER GROUPS & MODIFIERS
CREATE TABLE IF NOT EXISTS public.modifier_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.modifiers (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_cents BIGINT NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE
);

-- 8. INVENTORY ITEMS (RAW BEANS, MILK, SYRUPS, PACKAGING)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    unit TEXT CHECK (unit IN ('grams', 'ml', 'pcs', 'shots', 'kg', 'liters')) NOT NULL,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    min_threshold NUMERIC(12, 2) NOT NULL DEFAULT 10,
    cost_per_unit_cents BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 9. RECIPES (BILL OF MATERIALS)
CREATE TABLE IF NOT EXISTS public.recipes (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    inventory_item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    quantity_required NUMERIC(10, 2) NOT NULL
);

-- 10. INVENTORY MOVEMENTS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id TEXT PRIMARY KEY,
    inventory_item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    type TEXT CHECK (type IN ('sale', 'purchase', 'waste', 'spill', 'count_adjustment', 'refund')) NOT NULL,
    quantity_delta NUMERIC(10, 2) NOT NULL,
    balance_after NUMERIC(12, 2) NOT NULL,
    reference_id TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 11. SUPPLIERS & PURCHASES
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.purchases (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    invoice_number TEXT,
    status TEXT CHECK (status IN ('pending', 'received', 'cancelled')) NOT NULL,
    total_amount_cents BIGINT NOT NULL,
    purchased_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    received_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    inventory_item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_cost_cents BIGINT NOT NULL,
    total_cost_cents BIGINT NOT NULL
);

-- 12. SALES & TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    shift_id TEXT REFERENCES public.cashier_shifts(id),
    cashier_id TEXT NOT NULL REFERENCES public.users(id),
    order_type TEXT CHECK (order_type IN ('dine_in', 'take_out', 'delivery_pickup')) NOT NULL,
    customer_name TEXT,
    customer_notes TEXT,
    subtotal_cents BIGINT NOT NULL,
    discount_cents BIGINT DEFAULT 0,
    discount_label TEXT,
    tax_cents BIGINT DEFAULT 0,
    total_cents BIGINT NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('paid', 'refunded', 'partially_refunded', 'voided')) NOT NULL,
    payment_method TEXT NOT NULL,
    tendered_cents BIGINT NOT NULL,
    change_cents BIGINT DEFAULT 0,
    reference_number TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    product_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT NOT NULL,
    unit_price_cents BIGINT NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal_cents BIGINT NOT NULL,
    notes TEXT
);

-- 13. REFUNDS
CREATE TABLE IF NOT EXISTS public.refunds (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    order_number TEXT NOT NULL,
    reason TEXT NOT NULL,
    authorized_by TEXT NOT NULL,
    amount_cents BIGINT NOT NULL,
    restock_inventory BOOLEAN DEFAULT TRUE,
    refunded_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 14. EXPENSES
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    shift_id TEXT REFERENCES public.cashier_shifts(id),
    user_id TEXT NOT NULL REFERENCES public.users(id),
    amount_cents BIGINT NOT NULL,
    payee TEXT NOT NULL,
    description TEXT NOT NULL,
    receipt_reference TEXT,
    spent_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 15. AUDIT LOGS & SETTINGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id),
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    terminal TEXT DEFAULT 'TERMINAL_1',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.shop_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Default: Enable RLS and grant read/write access to anon/authenticated client
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated roles full access for POS operations
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon full access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Allow anon full access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Enable Realtime replication on high-velocity tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cashier_shifts;

-- ==============================================================================
-- INITIAL CLEAN ADMIN SEED
-- ==============================================================================
INSERT INTO public.users (id, username, pin_hash, full_name, role, status)
VALUES ('usr-admin', 'admin', '1234', 'System Administrator', 'admin', 'active')
ON CONFLICT (id) DO NOTHING;

-- Default Categories
INSERT INTO public.categories (id, name, display_order) VALUES
  ('cat-1', 'Espresso Bar', 1),
  ('cat-2', 'Specialty Lattes', 2),
  ('cat-3', 'Cold Brew & Nitro', 3),
  ('cat-4', 'Matcha & Tea', 4),
  ('cat-5', 'Pastries & Bakes', 5),
  ('cat-6', 'Coffee Beans (Retail)', 6)
ON CONFLICT (id) DO NOTHING;
