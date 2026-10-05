-- ==============================================================================
-- C5ISR COFFEE SHOP POS — PRODUCTION SQLITE SCHEMA (OFFLINE WINDOWS RUNTIME)
-- Database Engine: SQLite 3.x with WAL (Write-Ahead Logging) and Foreign Keys
-- Monetary Strategy: 64-bit INTEGER (centavos for Philippine Pesos ₱)
-- ==============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- 1. LOCAL USER ACCOUNTS & ROLES
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'manager', 'cashier')) NOT NULL,
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. CASHIER SHIFTS & DRAWER CASH MOVEMENTS
CREATE TABLE IF NOT EXISTS cashier_shifts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    opening_cash_cents INTEGER NOT NULL,
    closing_cash_cents INTEGER,
    expected_cash_cents INTEGER,
    actual_cash_cents INTEGER,
    cash_variance_cents INTEGER,
    notes TEXT,
    status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'open',
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME
);

CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL REFERENCES cashier_shifts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT CHECK(type IN ('cash_in', 'cash_out', 'drop')) NOT NULL,
    amount_cents INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCT CATALOG, VARIANTS & MODIFIERS
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    color_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    price_cents INTEGER NOT NULL,
    cost_price_cents INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS modifier_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER DEFAULT 1,
    is_required INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modifiers (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER DEFAULT 0
);

-- 4. RAW INVENTORY, RECIPES (BOM), & AUDIT MOVEMENTS
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    unit TEXT CHECK(unit IN ('grams', 'ml', 'pcs', 'shots', 'kg', 'liters')) NOT NULL,
    current_stock REAL NOT NULL DEFAULT 0,
    min_threshold REAL NOT NULL DEFAULT 10,
    cost_per_unit_cents INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity_required REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY,
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    type TEXT CHECK(type IN ('sale', 'purchase', 'waste', 'spill', 'count_adjustment', 'refund')) NOT NULL,
    quantity_delta REAL NOT NULL,
    balance_after REAL NOT NULL,
    reference_id TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. SUPPLIERS & PURCHASES
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    invoice_number TEXT,
    status TEXT CHECK(status IN ('pending', 'received', 'cancelled')) NOT NULL,
    total_amount_cents INTEGER NOT NULL,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    received_at DATETIME
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity REAL NOT NULL,
    unit_cost_cents INTEGER NOT NULL,
    total_cost_cents INTEGER NOT NULL
);

-- 6. SALES, ORDER LINE ITEMS, & PAYMENTS
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    shift_id TEXT REFERENCES cashier_shifts(id),
    cashier_id TEXT NOT NULL REFERENCES users(id),
    order_type TEXT CHECK(order_type IN ('dine_in', 'take_out', 'delivery_pickup')) NOT NULL,
    customer_name TEXT,
    customer_notes TEXT,
    subtotal_cents INTEGER NOT NULL,
    discount_cents INTEGER DEFAULT 0,
    discount_label TEXT,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL,
    payment_status TEXT CHECK(payment_status IN ('paid', 'refunded', 'partially_refunded', 'voided')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    variant_id TEXT NOT NULL REFERENCES product_variants(id),
    product_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS sale_item_modifiers (
    id TEXT PRIMARY KEY,
    sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    modifier_name_snapshot TEXT NOT NULL,
    price_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    method TEXT CHECK(method IN ('cash', 'gcash', 'maya', 'card_pos', 'bank_transfer')) NOT NULL,
    amount_cents INTEGER NOT NULL,
    tendered_cents INTEGER NOT NULL,
    change_cents INTEGER NOT NULL DEFAULT 0,
    reference_number TEXT,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
    order_number TEXT NOT NULL,
    reason TEXT NOT NULL,
    authorized_by TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    restock_inventory INTEGER DEFAULT 1,
    refunded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. EXPENSES
CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    shift_id TEXT REFERENCES cashier_shifts(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    amount_cents INTEGER NOT NULL,
    payee TEXT NOT NULL,
    description TEXT NOT NULL,
    receipt_reference TEXT,
    spent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. AUDIT LOGS & SHOP SETTINGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    terminal TEXT DEFAULT 'TERMINAL_1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shop_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR SUB-MILLISECOND POS SEARCH
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_order_number ON sales(order_number);
CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref ON inventory_movements(reference_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- INITIAL ROOT ADMINISTRATOR (NO DUMMY CASHIERS OR TRANSACTIONS)
INSERT OR IGNORE INTO users (id, username, pin_hash, full_name, role, status)
VALUES ('usr-admin', 'admin', '1234', 'System Administrator', 'admin', 'active');

-- INITIAL EXPENSE CATEGORIES
INSERT OR IGNORE INTO expense_categories (id, name) VALUES
('exp-1', 'Dairy & Fresh Produce Runs'),
('exp-2', 'Ice & Water Supply'),
('exp-3', 'Petty Cash & Consumables'),
('exp-4', 'Equipment Maintenance & Cleaning');
