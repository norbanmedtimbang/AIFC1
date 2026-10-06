import React, { useState } from 'react';
import {
  Settings,
  HardDrive,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  Building,
  Receipt,
  FileSpreadsheet,
  Database,
  Lock
} from 'lucide-react';
import { ShopSettings, AuditLog, User } from '../../types';
import { db } from '../../services/storage';
import { dataService } from '../../services/dataService';
import { PinDialog } from '../shared/PinDialog';
import { ConfirmModal } from '../shared/ConfirmModal';

interface SettingsViewProps {
  settings: ShopSettings;
  auditLogs: AuditLog[];
  currentUser: User;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  auditLogs,
  currentUser,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'receipt' | 'backup' | 'audit'>('store');

  // Form State
  const [storeName, setStoreName] = useState(settings.storeName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [branchName, setBranchName] = useState(settings.branchName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [tinNumber, setTinNumber] = useState(settings.tinNumber);
  const [receiptHeader, setReceiptHeader] = useState(settings.receiptHeader);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Backup State
  const [lastBackupInfo, setLastBackupInfo] = useState<{
    filename: string;
    checksum: string;
  } | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [backupContentToRestore, setBackupContentToRestore] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Factory Reset Pin Dialog
  const [isResetPinOpen, setIsResetPinOpen] = useState(false);

  const handleSaveSettings = async () => {
    try {
      await dataService.saveSettings({
        storeName: storeName.trim(),
        tagline: tagline.trim(),
        branchName: branchName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        tinNumber: tinNumber.trim(),
        receiptHeader: receiptHeader.trim(),
        receiptFooter: receiptFooter.trim()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefreshData();
    } catch (err) {
      console.warn('Failed saving settings:', err);
    }
  };

  // One-click Backup Export
  const handleExportBackup = () => {
    const { jsonString, filename, checksum } = db.createBackup();

    // Trigger download in browser/desktop
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setLastBackupInfo({ filename, checksum });
    onRefreshData();
  };

  const handleExportSqlSchema = () => {
    const sqlContent = `-- ==============================================================================
-- C5ISR COFFEE SHOP POS — PRODUCTION SQLITE 3 SCHEMA (OFFLINE WINDOWS RUNTIME)
-- Database Engine: SQLite 3.x with WAL and Foreign Key constraints
-- Currency: Integer centavos for Philippine Pesos (₱)
-- ==============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

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

-- INITIAL ROOT ADMINISTRATOR
INSERT OR IGNORE INTO users (id, username, pin_hash, full_name, role, status)
VALUES ('usr-admin', 'admin', '1234', 'System Administrator', 'admin', 'active');
`;

    const blob = new Blob([sqlContent], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'c5isr_pos_schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Restore Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (!content) return;
      setBackupContentToRestore(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestoreBackup = () => {
    if (!backupContentToRestore) return;
    setIsRestoring(true);
    try {
      const result = db.restoreBackup(backupContentToRestore);
      if (result.success) {
        setRestoreStatus('Database successfully restored from backup.');
        onRefreshData();
      } else {
        setRestoreStatus('Failed: ' + result.message);
      }
    } finally {
      setIsRestoring(false);
      setBackupContentToRestore(null);
    }
  };

  const handleAuthorizedReset = () => {
    setIsResetPinOpen(false);
    db.resetToFactory();
    setRestoreStatus('System successfully reset to default seed data.');
    onRefreshData();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-c5-beige pb-4">
        <div>
          <h2 className="text-xl font-bold text-c5-charcoal">Terminal Configuration & Backups</h2>
          <p className="text-xs text-c5-charcoal-muted mt-0.5">
            Store identity, 80mm receipt headers, local SQLite backup/restore, and audit logs
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-c5-cream p-1 rounded-xl border border-c5-beige">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'store'
                ? 'bg-c5-espresso text-c5-cream shadow-xs'
                : 'text-c5-charcoal hover:text-black'
            }`}
          >
            Store Profile
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'receipt'
                ? 'bg-c5-espresso text-c5-cream shadow-xs'
                : 'text-c5-charcoal hover:text-black'
            }`}
          >
            Receipt Setup
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              activeTab === 'backup'
                ? 'bg-c5-espresso text-c5-cream shadow-xs'
                : 'text-c5-charcoal hover:text-black'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Database Backup</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'audit'
                ? 'bg-c5-espresso text-c5-cream shadow-xs'
                : 'text-c5-charcoal hover:text-black'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* STORE PROFILE TAB */}
      {activeTab === 'store' && (
        <div className="max-w-2xl bg-white rounded-3xl p-6 border border-c5-beige shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-c5-charcoal uppercase tracking-wider">
            Coffee Shop Identity
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                Business / Brand Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
              />
            </div>
            <div>
              <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                Branch Identifier
              </label>
              <input
                type="text"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
              Tagline / Subheading
            </label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
            />
          </div>

          <div>
            <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
              Complete Store Address
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                Telephone / Mobile Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
              />
            </div>
            <div>
              <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                Tax Identification Number (TIN)
              </label>
              <input
                type="text"
                value={tinNumber}
                onChange={e => setTinNumber(e.target.value)}
                className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 font-mono outline-hidden focus:border-c5-espresso"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between">
            {saveSuccess && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" />
                <span>Settings saved successfully!</span>
              </span>
            )}
            <button
              onClick={handleSaveSettings}
              className="ml-auto px-5 py-2.5 rounded-xl bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark font-bold transition shadow-xs"
            >
              Save Store Profile
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT SETUP TAB */}
      {activeTab === 'receipt' && (
        <div className="max-w-2xl bg-white rounded-3xl p-6 border border-c5-beige shadow-sm space-y-4 text-xs">
          <h3 className="font-bold text-sm text-c5-charcoal uppercase tracking-wider">
            80mm Thermal Receipt Layout
          </h3>

          <div>
            <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
              Receipt Header Lines
            </label>
            <textarea
              rows={3}
              value={receiptHeader}
              onChange={e => setReceiptHeader(e.target.value)}
              className="w-full bg-white border border-c5-beige rounded-xl p-3 font-mono text-xs outline-hidden focus:border-c5-espresso"
            />
          </div>

          <div>
            <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
              Receipt Footer Notice
            </label>
            <textarea
              rows={3}
              value={receiptFooter}
              onChange={e => setReceiptFooter(e.target.value)}
              className="w-full bg-white border border-c5-beige rounded-xl p-3 font-mono text-xs outline-hidden focus:border-c5-espresso"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2.5 rounded-xl bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark font-bold transition shadow-xs"
            >
              Save Receipt Layout
            </button>
          </div>
        </div>
      )}

      {/* BACKUP & RECOVERY TAB */}
      {activeTab === 'backup' && (
        <div className="max-w-3xl space-y-6">
          {/* Export Box */}
          <div className="bg-white rounded-3xl p-6 border border-c5-beige shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-c5-charcoal">
                  Create Local Offline Database Backup
                </h3>
                <p className="text-xs text-c5-charcoal-muted mt-1 leading-relaxed max-w-xl">
                  Generates an ACID-consistent snapshot of all sales, inventory movements, recipes,
                  shifts, and accounts with an embedded SHA checksum. No internet connection is
                  required.
                </p>
              </div>
              <div className="p-3 bg-c5-cream rounded-2xl text-c5-espresso">
                <ShieldCheck className="w-6 h-6 text-c5-sage-dark" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-c5-beige/60">
              <div className="text-xs text-c5-charcoal">
                <span className="font-semibold">Last Backup Created:</span>{' '}
                <span className="font-mono text-c5-charcoal-muted">
                  {settings.lastBackupAt
                    ? new Date(settings.lastBackupAt).toLocaleString()
                    : 'None yet'}
                </span>
                {lastBackupInfo && (
                  <p className="text-[11px] font-mono text-emerald-800 mt-0.5">
                    Saved: {lastBackupInfo.filename} (Checksum: {lastBackupInfo.checksum})
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportSqlSchema}
                  className="px-4 py-2.5 rounded-xl border border-c5-beige bg-c5-cream hover:bg-c5-beige text-xs font-bold text-c5-charcoal transition flex items-center gap-2 shadow-xs"
                  title="Download production SQLite 3 table schema file (.sql)"
                >
                  <Database className="w-4 h-4 text-c5-espresso" />
                  <span>SQLite Schema (.sql)</span>
                </button>
                <button
                  onClick={handleExportBackup}
                  className="px-5 py-2.5 rounded-xl bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark text-xs font-bold transition flex items-center gap-2 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Backup (.json)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Import / Restore Box */}
          <div className="bg-white rounded-3xl p-6 border border-c5-beige shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-c5-charcoal">
                  Restore Database from Backup Archive
                </h3>
                <p className="text-xs text-c5-charcoal-muted mt-1 leading-relaxed max-w-xl">
                  Select a previously exported C5ISR backup file to restore complete historical
                  records. Integrity checks verify the backup before replacing active memory.
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-c5-beige/60">
              <label className="px-5 py-2.5 rounded-xl border border-c5-beige bg-c5-cream hover:bg-c5-beige text-xs font-bold text-c5-charcoal transition flex items-center gap-2 cursor-pointer shadow-xs">
                <Upload className="w-4 h-4 text-c5-espresso" />
                <span>Select & Restore File...</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              {restoreStatus && (
                <span className="text-xs font-bold text-c5-espresso">{restoreStatus}</span>
              )}
            </div>
          </div>

          {/* Danger Zone: Factory Reset */}
          <div className="bg-rose-50/50 rounded-3xl p-6 border border-rose-200 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-rose-900">Reset Database to Clean State</h4>
              <p className="text-xs text-rose-700/80 mt-0.5">
                Clears all sales, inventory movements, products, and restores the pristine Administrator account (PIN 1234).
              </p>
            </div>
            <button
              onClick={() => setIsResetPinOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Clean Database</span>
            </button>
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-c5-beige overflow-hidden shadow-xs">
          <div className="p-4 bg-c5-cream/40 border-b border-c5-beige flex items-center justify-between">
            <h4 className="font-bold text-xs text-c5-charcoal uppercase tracking-wider">
              Immutable Local Audit Logs ({auditLogs.length})
            </h4>
            <span className="text-[11px] text-c5-charcoal-muted">
              Auto-logged on every shift, refund, sale, stock adjustment, and configuration change
            </span>
          </div>

          <div className="divide-y divide-c5-beige/60 max-h-[600px] overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="p-3.5 text-xs flex items-start justify-between hover:bg-c5-cream/20">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-c5-espresso text-c5-cream">
                      {log.action}
                    </span>
                    <span className="font-semibold text-c5-charcoal">{log.userName}</span>
                    <span className="text-[10px] text-c5-charcoal-muted font-mono">
                      ({log.terminal})
                    </span>
                  </div>
                  <p className="text-c5-charcoal">{log.details}</p>
                </div>
                <span className="text-[10px] text-c5-charcoal-muted font-mono shrink-0">
                  {new Date(log.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN PIN FOR FACTORY RESET */}
      <PinDialog
        isOpen={isResetPinOpen}
        onClose={() => setIsResetPinOpen(false)}
        onSuccess={handleAuthorizedReset}
        title="Admin Authorization Required"
        description="Enter Administrator 4-digit PIN (default 1234) to reset database"
        allowedRoles={['admin']}
      />

      {/* CONFIRM RESTORE BACKUP MODAL */}
      <ConfirmModal
        isOpen={!!backupContentToRestore}
        onClose={() => {
          if (!isRestoring) setBackupContentToRestore(null);
        }}
        onConfirm={handleConfirmRestoreBackup}
        title="Confirm Backup Restoration"
        message="Restoring will replace all current business records with the data from this backup file. All recent unsaved modifications will be overwritten. Do you wish to continue?"
        confirmText="Restore Backup"
        confirmVariant="danger"
        isLoading={isRestoring}
      />
    </div>
  );
};
