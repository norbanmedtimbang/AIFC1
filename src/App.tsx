import React, { useState, useEffect, useCallback } from 'react';
import { db } from './services/storage';
import { dataService, AppDataState } from './services/dataService';
import { User, InventoryItem } from './types';
import { Sidebar, NavModule } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { POSView } from './components/pos/POSView';
import { DashboardView } from './components/dashboard/DashboardView';
import { MenuManagementView } from './components/menu/MenuManagementView';
import { InventoryView } from './components/inventory/InventoryView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { OrdersView } from './components/orders/OrdersView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { StaffView } from './components/staff/StaffView';
import { SettingsView } from './components/settings/SettingsView';
import { PinDialog } from './components/shared/PinDialog';
import { Lock, Coffee, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [dbState, setDbState] = useState<AppDataState>(() => dataService.getState());
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentModule, setCurrentModule] = useState<NavModule>('pos');
  const [isLocked, setIsLocked] = useState(false);
  const [isSwitchUserOpen, setIsSwitchUserOpen] = useState(false);

  // Sync state from Supabase data service
  const refreshData = useCallback(() => {
    dataService.loadAllData().then(state => setDbState(state)).catch(err => {
      console.error('Data refresh error:', err);
    });
  }, []);

  // Initial Load & Realtime Sync
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setConnectionError(null);
    try {
      const liveData = await dataService.loadAllData();
      setDbState(liveData);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to connect to Supabase PostgreSQL:', err);
      setConnectionError(
        (err as Error).message ||
          'Database connection unavailable. Please check your network and Supabase configuration.'
      );
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Subscribe to in-memory state updates
    const unsubscribeState = dataService.subscribe(state => {
      setDbState(state);
    });

    // Subscribe to cross-device Supabase Realtime updates
    const unsubscribeRealtime = dataService.subscribeToRealtime();

    return () => {
      unsubscribeState();
      unsubscribeRealtime();
    };
  }, [loadInitialData]);

  const currentUser = dataService.getCurrentUser();
  const activeShift = dbState.activeShift;
  const lowStockCount = dbState.inventoryItems.filter(
    (i: InventoryItem) => i.currentStock <= i.minThreshold
  ).length;

  const handleUnlockSuccess = (user: User) => {
    dataService.setCurrentUserId(user.id);
    db.setCurrentUserId(user.id);
    setIsLocked(false);
    refreshData();
  };

  const handleSwitchUserSuccess = (user: User) => {
    dataService.setCurrentUserId(user.id);
    db.setCurrentUserId(user.id);
    setIsSwitchUserOpen(false);
    refreshData();
  };

  // Module Titles and Subtitles
  const moduleInfo: Record<NavModule, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Operations Dashboard',
      subtitle: 'Real-time sales velocity, shift metrics, and inventory alerts'
    },
    pos: {
      title: 'Cashier Register (POS)',
      subtitle: 'High-velocity touch orders, recipe deductions, and rapid cash/e-wallet checkout'
    },
    menu: {
      title: 'Menu & Recipes',
      subtitle: 'Specialty coffee drinks, size variants, modifier groups, and BOM recipes'
    },
    inventory: {
      title: 'Inventory & Materials',
      subtitle: 'Specialty beans, dairy, syrups, packaging cups, and audit ledger'
    },
    purchases: {
      title: 'Purchases & Vendors',
      subtitle: 'Vendor directory, bean roaster deliveries, and automatic restock POs'
    },
    orders: {
      title: 'Orders & Receipts',
      subtitle: 'Historical transaction journal, receipt reprints, and manager refunds'
    },
    expenses: {
      title: 'Store Expenses',
      subtitle: 'Petty cash disbursements, emergency ice/dairy runs, and shift expenses'
    },
    reports: {
      title: 'Reports & Readings',
      subtitle: 'Official POS X-Reading, Z-Reading, hourly velocity, and payment distribution'
    },
    staff: {
      title: 'Staff & Shifts',
      subtitle: 'Opening cash floats, cash drawer drops, shift reconciliation, and staff PINs'
    },
    settings: {
      title: 'Settings & Backups',
      subtitle: 'Store profile, receipt header/footer, local database backups, and audit logs'
    }
  };

  // Keyboard Shortcuts for Cashier Terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setCurrentModule('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentModule('dashboard');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentModule('inventory');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // INITIAL DATABASE SYNCHRONIZATION LOADING SCREEN
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14100E] text-white p-6 select-none">
        <div className="text-center space-y-6 max-w-md w-full bg-stone-900/90 border border-stone-800 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-stone-800 border-t-[#B4EE10] animate-spin" />
            <div className="w-14 h-14 rounded-2xl bg-[#B4EE10] text-[#14100E] flex items-center justify-center shadow-[0_0_25px_rgba(180,238,16,0.35)]">
              <Coffee className="w-7 h-7 stroke-[2.5]" />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B4EE10]/15 text-[#B4EE10] text-[10px] font-black tracking-widest uppercase mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              C5ISR POS CLOUD ENGINE
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white font-display">
              Connecting Database
            </h2>
            <p className="text-xs text-stone-300 font-medium mt-1 leading-relaxed">
              Synchronizing live menu, recipes, inventory & shifts from Supabase PostgreSQL...
            </p>
          </div>
          <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#B4EE10] h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // DATABASE CONNECTION UNAVAILABLE ERROR SCREEN
  if (connectionError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14100E] text-white p-6 select-none">
        <div className="text-center space-y-6 max-w-md w-full bg-stone-900 border border-red-900/50 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(239,68,68,0.25)]">
            <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black tracking-widest uppercase mb-3">
              DATABASE UNREACHABLE
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white font-display">
              Database Offline
            </h2>
            <p className="text-xs text-stone-300 font-medium mt-2 leading-relaxed">
              {connectionError}
            </p>
          </div>
          <button
            onClick={loadInitialData}
            className="w-full py-4 rounded-2xl bg-[#B4EE10] hover:bg-[#CCFF00] text-[#14100E] font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // FULLSCREEN TERMINAL LOCKED SCREEN
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14100E] text-white p-4 select-none">
        <div className="text-center space-y-5 max-w-sm w-full bg-stone-900 border border-stone-800 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-[#B4EE10] text-[#14100E] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(180,238,16,0.35)]">
            <Lock className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white font-display">
              C5ISR TERMINAL LOCKED
            </h2>
            <p className="text-xs text-stone-300 font-medium mt-1">
              Terminal is paused. Click below to enter your 4-digit staff PIN.
            </p>
          </div>
          <button
            onClick={() => setIsLocked(false)}
            className="w-full py-4 rounded-2xl bg-[#B4EE10] hover:bg-[#CCFF00] text-[#14100E] font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            Enter PIN to Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-c5-cream select-none text-c5-charcoal">
      {/* 10-MODULE SIDEBAR */}
      <Sidebar
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        currentUser={currentUser}
        activeShift={activeShift}
        lowStockCount={lowStockCount}
        onSwitchUser={() => setIsSwitchUserOpen(true)}
        onLockTerminal={() => setIsLocked(true)}
      />

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP STATUS HEADER */}
        <Header
          title={moduleInfo[currentModule].title}
          subtitle={moduleInfo[currentModule].subtitle}
          currentUser={currentUser}
          activeShift={activeShift}
          settings={dbState.settings}
          onOpenShiftModal={() => setCurrentModule('staff')}
          onSwitchUser={() => setIsSwitchUserOpen(true)}
        />

        {/* ACTIVE MODULE CONTAINER */}
        <main className="flex-1 overflow-hidden bg-c5-cream">
          {currentModule === 'pos' && (
            <POSView
              products={dbState.products}
              categories={dbState.categories}
              modifierGroups={dbState.modifierGroups}
              settings={dbState.settings}
              currentUser={currentUser}
              activeShift={activeShift}
              onRefreshData={refreshData}
              onOpenShiftModal={() => setCurrentModule('staff')}
            />
          )}

          {currentModule === 'dashboard' && (
            <DashboardView
              sales={dbState.sales}
              inventoryItems={dbState.inventoryItems}
              activeShift={activeShift}
              onNavigateToPOS={() => setCurrentModule('pos')}
              onNavigateToInventory={() => setCurrentModule('inventory')}
              onNavigateToStaff={() => setCurrentModule('staff')}
              onNavigateToMenu={() => setCurrentModule('menu')}
            />
          )}

          {currentModule === 'menu' && (
            <MenuManagementView
              products={dbState.products}
              categories={dbState.categories}
              modifierGroups={dbState.modifierGroups}
              inventoryItems={dbState.inventoryItems}
              onRefreshData={refreshData}
            />
          )}

          {currentModule === 'inventory' && (
            <InventoryView
              inventoryItems={dbState.inventoryItems}
              inventoryMovements={dbState.inventoryMovements}
              onRefreshData={refreshData}
            />
          )}

          {currentModule === 'purchases' && (
            <PurchasesView
              suppliers={dbState.suppliers}
              purchases={dbState.purchases}
              inventoryItems={dbState.inventoryItems}
              onRefreshData={refreshData}
            />
          )}

          {currentModule === 'orders' && (
            <OrdersView
              sales={dbState.sales}
              settings={dbState.settings}
              currentUser={currentUser}
              onRefreshData={refreshData}
            />
          )}

          {currentModule === 'expenses' && (
            <ExpensesView
              expenses={dbState.expenses}
              expenseCategories={dbState.expenseCategories}
              activeShift={activeShift}
              onRefreshData={refreshData}
            />
          )}

          {currentModule === 'reports' && (
            <ReportsView
              sales={dbState.sales}
              expenses={dbState.expenses}
              shifts={dbState.shifts}
              activeShift={activeShift}
              categories={dbState.categories}
              settings={dbState.settings}
            />
          )}

          {currentModule === 'staff' && (
            <StaffView
              users={dbState.users}
              currentUser={currentUser}
              activeShift={activeShift}
              shifts={dbState.shifts}
              cashMovements={dbState.cashMovements}
              sales={dbState.sales}
              expenses={dbState.expenses}
              onRefreshData={refreshData}
              onSwitchUser={() => setIsSwitchUserOpen(true)}
            />
          )}

          {currentModule === 'settings' && (
            <SettingsView
              settings={dbState.settings}
              auditLogs={dbState.auditLogs}
              currentUser={currentUser}
              onRefreshData={refreshData}
            />
          )}
        </main>
      </div>

      {/* QUICK SWITCH CASHIER PIN DIALOG */}
      <PinDialog
        isOpen={isSwitchUserOpen}
        onClose={() => setIsSwitchUserOpen(false)}
        onSuccess={handleSwitchUserSuccess}
        title="Switch Active Cashier"
        description="Enter your 4-digit staff PIN (Default Administrator: 1234)"
        allowedRoles={['admin', 'manager', 'cashier']}
      />
    </div>
  );
}
