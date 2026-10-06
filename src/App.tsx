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
import { PinLoginView } from './components/auth/PinLoginView';
import { AccessDeniedView } from './components/shared/AccessDeniedView';
import { hasModuleAccess, getDefaultModuleForRole } from './services/rbac';
import { Lock, Coffee, RefreshCw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [dbState, setDbState] = useState<AppDataState>(() => dataService.getState());
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
      console.warn('Network or database connection issue, smoothly using offline register cache:', err);
      const offlineData = dataService.loadOfflineData();
      setDbState(offlineData);
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

  const handleLoginSuccess = (user: User) => {
    dataService.setCurrentUserId(user.id);
    db.setCurrentUserId(user.id);
    setIsAuthenticated(true);
    setIsLocked(false);
    setIsSwitchUserOpen(false);
    // Automatic Role Detection: Route to authorized landing module
    const defaultMod = getDefaultModuleForRole(user.role);
    setCurrentModule(defaultMod);
    refreshData();
  };

  const handleUnlockSuccess = (user: User) => {
    handleLoginSuccess(user);
  };

  const handleSwitchUserSuccess = (user: User) => {
    handleLoginSuccess(user);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsLocked(false);
  };

  const handleLockTerminal = () => {
    setIsLocked(true);
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
      title: currentUser.role === 'cashier' ? 'Cashier Shifts' : 'Staff & Shifts',
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
      if (!isAuthenticated || isLocked) return;
      if (e.key === 'F1' && hasModuleAccess(currentUser.role, 'pos')) {
        e.preventDefault();
        setCurrentModule('pos');
      } else if (e.key === 'F2' && hasModuleAccess(currentUser.role, 'dashboard')) {
        e.preventDefault();
        setCurrentModule('dashboard');
      } else if (e.key === 'F3' && hasModuleAccess(currentUser.role, 'inventory')) {
        e.preventDefault();
        setCurrentModule('inventory');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser.role, isAuthenticated, isLocked]);

  // INITIAL DATABASE SYNCHRONIZATION LOADING SCREEN
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F3EB] p-6 select-none">
        <div className="text-center space-y-6 max-w-sm w-full bg-white border border-[#E8E2D9] p-8 rounded-2xl shadow-sm">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[#E8E2D9] border-t-[#3B2925] animate-spin" />
            <div className="w-11 h-11 rounded-xl bg-[#3B2925] text-white flex items-center justify-center">
              <Coffee className="w-5 h-5 stroke-[1.8]" />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#7A736C] tracking-wide mb-2">
              C5ISR Coffee POS
            </p>
            <h2 className="text-lg font-semibold text-[#292929]">
              Connecting…
            </h2>
            <p className="text-xs text-[#7A736C] mt-1.5 leading-relaxed">
              Syncing menu, inventory & shifts
            </p>
          </div>
          <div className="w-full bg-[#E8E2D9] h-1 rounded-full overflow-hidden">
            <div className="bg-[#3B2925] h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // DATABASE CONNECTION UNAVAILABLE ERROR SCREEN
  if (connectionError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F3EB] p-6 select-none">
        <div className="text-center space-y-5 max-w-sm w-full bg-white border border-[#E8E2D9] p-8 rounded-2xl shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#F7F3EB] border border-[#E8E2D9] text-[#A25035] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#292929]">
              Database offline
            </h2>
            <p className="text-xs text-[#7A736C] mt-2 leading-relaxed">
              {connectionError}
            </p>
          </div>
          <button
            onClick={loadInitialData}
            className="w-full py-2.5 rounded-xl bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  // POS-STYLE PIN LOGIN & AUTOMATIC ROLE DETECTION SCREEN
  if (!isAuthenticated || isLocked) {
    return (
      <PinLoginView
        users={dbState.users}
        onLoginSuccess={handleLoginSuccess}
        shopName={dbState.settings.storeName}
        tagline={dbState.settings.tagline}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-c5-cream select-none text-c5-charcoal">
      {/* 10-MODULE SIDEBAR WITH AUTOMATIC RBAC */}
      <Sidebar
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        currentUser={currentUser}
        activeShift={activeShift}
        lowStockCount={lowStockCount}
        onSwitchUser={handleLogout}
        onLockTerminal={handleLockTerminal}
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
          onSwitchUser={handleLogout}
        />

        {/* ACTIVE MODULE CONTAINER WITH DIRECT ACCESS BLOCKING */}
        <main className="flex-1 overflow-hidden bg-c5-cream">
          {!hasModuleAccess(currentUser.role, currentModule) ? (
            <AccessDeniedView
              currentModule={currentModule}
              currentUser={currentUser}
              onNavigateBack={() => setCurrentModule(getDefaultModuleForRole(currentUser.role))}
            />
          ) : (
            <>
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
                  currentUser={currentUser}
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
            </>
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
