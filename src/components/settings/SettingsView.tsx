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
  Lock,
  Sparkles,
  Layers,
  Table
} from 'lucide-react';
import { ShopSettings, AuditLog, User } from '../../types';
import { db } from '../../services/storage';
import { PinDialog } from '../shared/PinDialog';

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
  const [activeTab, setActiveTab] = useState<'store' | 'receipt' | 'database' | 'audit'>('store');

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

  // Factory Reset Pin Dialog
  const [isResetPinOpen, setIsResetPinOpen] = useState(false);

  const dbState = db.getState();

  const handleSaveSettings = () => {
    db.updateSettings({
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
  };

  // One-click JSON Backup Export
  const handleExportBackup = () => {
    const { jsonString, filename, checksum } = db.createBackup();

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

  // One-click SQLite SQL Dump Export
  const handleExportSqlDump = () => {
    const sqlContent = db.generateSQLiteDump();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `c5isr_offline_sqlite_dump_${timestamp}.sql`;

    const blob = new Blob([sqlContent], { type: 'application/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onRefreshData();
  };

  // Restore Backup
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      if (!content) return;

      const result = db.restoreBackup(content);
      if (result.success) {
        setRestoreStatus('✓ Database restored successfully! Reloading...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setRestoreStatus('✕ ' + result.message);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleMenu = () => {
    db.loadSpecialtyCoffeeSampleMenu();
    alert('Loaded specialty coffee sample menu and inventory items.');
    onRefreshData();
  };

  const handleAuthorizedReset = () => {
    setIsResetPinOpen(false);
    db.resetToFactory();
    alert('System cleanly reset to clean state with 1 Master Administrator account (PIN: 1234).');
    window.location.reload();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 uppercase font-display tracking-tight">
            Terminal Configuration & Database
          </h2>
          <p className="text-xs text-stone-600 font-medium mt-1">
            Store identity, 80mm thermal receipt setup, local SQLite database management, and immutable audit trails
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'store'
                ? 'bg-[#14100E] text-[#B4EE10] shadow-sm'
                : 'text-stone-700 hover:text-black hover:bg-stone-200'
            }`}
          >
            Store Profile
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'receipt'
                ? 'bg-[#14100E] text-[#B4EE10] shadow-sm'
                : 'text-stone-700 hover:text-black hover:bg-stone-200'
            }`}
          >
            Receipt Setup
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'database'
                ? 'bg-[#14100E] text-[#B4EE10] shadow-sm'
                : 'text-stone-700 hover:text-black hover:bg-stone-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>SQLite Database</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#14100E] text-[#B4EE10] shadow-sm'
                : 'text-stone-700 hover:text-black hover:bg-stone-200'
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* STORE PROFILE TAB */}
      {activeTab === 'store' && (
        <div className="max-w-2xl bg-white rounded-3xl p-7 border border-stone-200 shadow-sm space-y-5 text-xs">
          <h3 className="font-display font-black text-sm text-stone-900 uppercase tracking-wider">
            Coffee Shop Identity
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-stone-900 block mb-1 uppercase text-[10px]">
                Business / Brand Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-stone-900 font-bold outline-hidden focus:border-stone-900"
              />
            </div>
            <div>
              <label className="font-bold text-stone-900 block mb-1 uppercase text-[10px]">
                Branch Identifier
              </label>
              <input
                type="text"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-stone-900 font-bold outline-hidden focus:border-stone-900"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-900 block mb-1 uppercase text-[10px]">
              Tagline / Subheading
            </label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-stone-900 font-medium outline-hidden focus:border-stone-900"
            />
          </div>

          <div>
            <label className="font-bold text-stone-900 block mb-1 uppercase text-[10px]">
              Complete Store Address
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-stone-900 font-medium outline-hidden focus:border-stone-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-stone-900 block mb-1 uppercase text-[10px]">
                Telephone / Mobile Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-stone-900 font-mono font-bold outline-hidden focus:border-stone-900"
              />
            </div>
            <div>
              <label className="font-bold text-stone-900 block mb-1 uppercase text-[10px]">
                Tax Identification Number (TIN)
              </label>
              <input
                type="text"
                value={tinNumber}
                onChange={e => setTinNumber(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 font-mono text-stone-900 font-bold outline-hidden focus:border-stone-900"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between">
            {saveSuccess && (
              <span className="text-emerald-700 font-black flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Settings saved successfully!</span>
              </span>
            )}
            <button
              onClick={handleSaveSettings}
              className="ml-auto px-6 py-3 rounded-2xl bg-[#14100E] text-[#B4EE10] hover:bg-stone-900 font-black text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
            >
              Save Store Profile
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT SETUP TAB */}
      {activeTab === 'receipt' && (
        <div className="max-w-2xl bg-white rounded-3xl p-7 border border-stone-200 shadow-sm space-y-5 text-xs">
          <h3 className="font-display font-black text-sm text-stone-900 uppercase tracking-wider">
            80mm Thermal Receipt Layout
          </h3>

          <div>
            <label className="font-bold text-stone-900 block mb-1 uppercase text-[10px]">
              Receipt Header Lines
            </label>
            <textarea
              rows={3}
              value={receiptHeader}
              onChange={e => setReceiptHeader(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 font-mono text-xs text-stone-900 font-semibold outline-hidden focus:border-stone-900"
            />
          </div>

          <div>
            <label className="font-bold text-stone-900 block mb-1 uppercase text-[10px]">
              Receipt Footer Notice
            </label>
            <textarea
              rows={3}
              value={receiptFooter}
              onChange={e => setReceiptFooter(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 font-mono text-xs text-stone-900 font-semibold outline-hidden focus:border-stone-900"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="px-6 py-3 rounded-2xl bg-[#14100E] text-[#B4EE10] hover:bg-stone-900 font-black text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
            >
              Save Receipt Layout
            </button>
          </div>
        </div>
      )}

      {/* DATABASE & SQLITE CENTER TAB */}
      {activeTab === 'database' && (
        <div className="max-w-4xl space-y-6">
          {/* Database Table Statistics */}
          <div className="bg-white rounded-3xl p-7 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-stone-900" />
                <h3 className="font-display font-black text-sm text-stone-900 uppercase tracking-wide">
                  SQLite Database Records Overview
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-mono text-[11px] font-bold">
                PRAGMA foreign_keys = ON
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-500">Users & Roles</span>
                <p className="text-xl font-black font-mono text-stone-900 mt-1">{dbState.users.length}</p>
                <span className="text-[10px] text-stone-600 font-medium">Clean admin ready</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-500">Menu Products</span>
                <p className="text-xl font-black font-mono text-stone-900 mt-1">{dbState.products.length}</p>
                <span className="text-[10px] text-stone-600 font-medium">Catalog items</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-500">Inventory Items</span>
                <p className="text-xl font-black font-mono text-stone-900 mt-1">{dbState.inventoryItems.length}</p>
                <span className="text-[10px] text-stone-600 font-medium">Raw ingredients</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-500">Sales Tickets</span>
                <p className="text-xl font-black font-mono text-stone-900 mt-1">{dbState.sales.length}</p>
                <span className="text-[10px] text-stone-600 font-medium">Offline orders</span>
              </div>
            </div>
          </div>

          {/* Export Box */}
          <div className="bg-white rounded-3xl p-7 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-black text-base text-stone-900 uppercase">
                  Export Local Offline SQLite Database
                </h3>
                <p className="text-xs text-stone-600 font-medium mt-1 leading-relaxed max-w-xl">
                  Export standard SQLite 3 DDL schema and complete database dump (.sql) compatible with SQLite CLI, Windows Desktop Electron IPC, and SQLite browser tools.
                </p>
              </div>
              <div className="p-3.5 bg-stone-100 rounded-2xl text-stone-900">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-stone-200">
              <div className="text-xs text-stone-800">
                <span className="font-bold">Last Archive Created:</span>{' '}
                <span className="font-mono text-stone-600 font-bold">
                  {settings.lastBackupAt
                    ? new Date(settings.lastBackupAt).toLocaleString()
                    : 'None yet'}
                </span>
                {lastBackupInfo && (
                  <p className="text-[11px] font-mono text-emerald-800 font-bold mt-0.5">
                    Saved: {lastBackupInfo.filename} ({lastBackupInfo.checksum})
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportSqlDump}
                  className="px-5 py-3 rounded-2xl border-2 border-stone-900 bg-white hover:bg-stone-100 text-xs font-black text-stone-900 transition flex items-center gap-2 shadow-xs cursor-pointer"
                  title="Download complete SQLite SQL Dump with CREATE and INSERT statements"
                >
                  <Database className="w-4 h-4 text-stone-900" />
                  <span>Download SQLite (.sql)</span>
                </button>
                <button
                  onClick={handleExportBackup}
                  className="px-5 py-3 rounded-2xl bg-[#14100E] text-[#B4EE10] hover:bg-stone-900 text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON Backup</span>
                </button>
              </div>
            </div>
          </div>

          {/* Import / Restore Box */}
          <div className="bg-white rounded-3xl p-7 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-black text-base text-stone-900 uppercase">
                  Restore Database from Backup Archive
                </h3>
                <p className="text-xs text-stone-600 font-medium mt-1 leading-relaxed max-w-xl">
                  Select a previously exported C5ISR backup file to restore complete historical records. Integrity checks verify the backup structure before replacing active records.
                </p>
              </div>
              <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-stone-200">
              <label className="px-5 py-3 rounded-2xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-xs font-black text-stone-900 transition flex items-center gap-2 cursor-pointer shadow-xs">
                <Upload className="w-4 h-4 text-stone-900" />
                <span>Select & Restore File...</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              {restoreStatus && (
                <span className="text-xs font-black text-stone-900">{restoreStatus}</span>
              )}
            </div>
          </div>

          {/* Helper: Sample Coffee Menu Loader */}
          <div className="bg-[#FAF7F2] rounded-3xl p-7 border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-black text-sm text-stone-900 uppercase">
                Specialty Coffee Starter Menu
              </h4>
              <p className="text-xs text-stone-600 font-medium mt-0.5">
                Quickly populate sample specialty coffee drinks (Spanish Latte, Dirty Matcha, Croissants) and raw inventory ingredients for testing.
              </p>
            </div>
            <button
              onClick={handleLoadSampleMenu}
              className="px-5 py-3 rounded-2xl bg-white border border-stone-300 hover:border-stone-900 text-stone-900 text-xs font-black uppercase tracking-wider transition shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Load Sample Menu</span>
            </button>
          </div>

          {/* Danger Zone: Clean Database Reset */}
          <div className="bg-rose-50 rounded-3xl p-7 border-2 border-rose-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-black text-sm text-rose-950 uppercase">
                Reset to Clean Database
              </h4>
              <p className="text-xs text-rose-800 font-medium mt-0.5 max-w-lg">
                Clears all sales, inventory movements, products, expenses, and restores 1 clean Administrator account (PIN: 1234).
              </p>
            </div>
            <button
              onClick={() => setIsResetPinOpen(true)}
              className="px-5 py-3 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start Clean (Wipe)</span>
            </button>
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h4 className="font-display font-black text-xs text-stone-900 uppercase tracking-wider">
                Immutable Local Audit Trail ({auditLogs.length})
              </h4>
              <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                Recorded locally for every shift, sale, refund, stock adjustment, and terminal configuration
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-stone-600">TERMINAL_1</span>
          </div>

          <div className="divide-y divide-stone-100 max-h-[600px] overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="p-4 text-xs flex items-start justify-between hover:bg-stone-50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg font-mono text-[10px] font-black bg-[#14100E] text-[#B4EE10]">
                      {log.action}
                    </span>
                    <span className="font-bold text-stone-900">{log.userName}</span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      ({log.terminal})
                    </span>
                  </div>
                  <p className="text-stone-700 font-medium">{log.details}</p>
                </div>
                <span className="text-[10px] text-stone-500 font-mono font-bold shrink-0">
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

      {/* ADMIN PIN FOR CLEAN RESET */}
      <PinDialog
        isOpen={isResetPinOpen}
        onClose={() => setIsResetPinOpen(false)}
        onSuccess={handleAuthorizedReset}
        title="Admin Authorization Required"
        description="Enter Administrator 4-digit PIN (default 1234) to confirm clean reset"
        allowedRoles={['admin']}
      />
    </div>
  );
};
