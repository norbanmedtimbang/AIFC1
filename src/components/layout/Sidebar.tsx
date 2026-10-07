import React from 'react';
import {
  LayoutDashboard,
  Coffee,
  BookOpen,
  Package,
  Truck,
  Receipt,
  CreditCard,
  BarChart3,
  Users,
  Settings,
  Lock,
  LogOut,
  X
} from 'lucide-react';
import { User, CashierShift } from '../../types';
import { hasModuleAccess, ROLE_PERMISSIONS } from '../../services/rbac';

export type NavModule =
  | 'dashboard'
  | 'pos'
  | 'menu'
  | 'inventory'
  | 'purchases'
  | 'orders'
  | 'expenses'
  | 'reports'
  | 'staff'
  | 'settings';

interface SidebarProps {
  currentModule: NavModule;
  onSelectModule: (module: NavModule) => void;
  currentUser: User;
  activeShift: CashierShift | null;
  lowStockCount: number;
  onSwitchUser: () => void;
  onLockTerminal: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  currentUser,
  activeShift,
  lowStockCount,
  onSwitchUser,
  onLockTerminal,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const roleConfig = ROLE_PERMISSIONS[currentUser.role];

  // Full module registry with role-dependent labels
  const allNavItems: { id: NavModule; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS Register', icon: Coffee },
    { id: 'menu', label: 'Menu & Recipes', icon: BookOpen },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStockCount },
    { id: 'purchases', label: 'Purchases', icon: Truck },
    { id: 'orders', label: 'Transactions', icon: Receipt },
    { id: 'expenses', label: 'Expenses', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    {
      id: 'staff',
      label: currentUser.role === 'cashier' ? 'Cashier Shifts' : 'Staff & Shifts',
      icon: Users
    }
  ];

  // Automatic RBAC filtering: only show authorized modules
  const visibleNav = allNavItems.filter(item => hasModuleAccess(currentUser.role, item.id));
  const canAccessSettings = hasModuleAccess(currentUser.role, 'settings');

  const handleItemClick = (mod: NavModule) => {
    onSelectModule(mod);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleSwitchUserClick = () => {
    if (onCloseMobile) onCloseMobile();
    onSwitchUser();
  };

  const handleLockClick = () => {
    if (onCloseMobile) onCloseMobile();
    onLockTerminal();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FBF9F5] text-[#292929] select-none">
      {/* Brand & Mobile Close */}
      <div className="px-5 py-4 border-b border-[#E8E2D9] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#3B2925] text-white flex items-center justify-center shadow-[0_2px_8px_rgba(59,41,37,0.2)] shrink-0">
            <Coffee className="w-4.5 h-4.5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold tracking-tight text-[#3B2925] leading-none">
                C5ISR
              </h1>
              {activeShift && (
                <span
                  title="Shift open"
                  className="inline-block w-1.5 h-1.5 rounded-full bg-[#A8B5A0] ring-2 ring-[#A8B5A0]/25"
                />
              )}
            </div>
            <p className="text-[11px] text-[#9B948C] font-medium mt-1 tracking-wide">
              Coffee POS
            </p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-[#9B948C] hover:text-[#292929] hover:bg-[#EFE9DF] rounded-xl transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {visibleNav.map(item => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 sm:py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer min-h-[42px] ${
                isActive
                  ? 'bg-[#3B2925] text-white shadow-[0_2px_8px_rgba(59,41,37,0.18)]'
                  : 'text-[#6E6862] hover:bg-[#EFE9DF]/80 hover:text-[#292929]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-[#9B948C]'
                  }`}
                  strokeWidth={isActive ? 2.1 : 1.75}
                />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] min-w-[1.25rem] h-5 px-1.5 rounded-full font-mono font-medium flex items-center justify-center tabular-nums ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F0D9D2] text-[#A25035]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {canAccessSettings && (
          <>
            <div className="py-2 px-1">
              <div className="h-px bg-[#E8E2D9]" />
            </div>

            <button
              onClick={() => handleItemClick('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer min-h-[42px] ${
                currentModule === 'settings'
                  ? 'bg-[#3B2925] text-white shadow-[0_2px_8px_rgba(59,41,37,0.18)]'
                  : 'text-[#6E6862] hover:bg-[#EFE9DF]/80 hover:text-[#292929]'
              }`}
            >
              <Settings
                className={`w-4 h-4 shrink-0 ${
                  currentModule === 'settings' ? 'text-white' : 'text-[#9B948C]'
                }`}
                strokeWidth={currentModule === 'settings' ? 2.1 : 1.75}
              />
              <span className="tracking-tight">Settings</span>
            </button>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-[#E8E2D9] bg-[#F7F3EB]/60">
        <div className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-[#EFE9DF]/60 transition">
          <button
            onClick={handleSwitchUserClick}
            title="Switch Active User"
            className="flex-1 flex items-center gap-2.5 text-left cursor-pointer min-w-0 py-1"
          >
            <div className="w-8 h-8 rounded-xl bg-[#3B2925] text-white flex items-center justify-center text-[11px] font-semibold shrink-0 shadow-[0_1px_3px_rgba(59,41,37,0.15)]">
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="truncate min-w-0">
              <div className="text-[12px] font-semibold text-[#292929] truncate tracking-tight">
                {currentUser.fullName}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded-full tracking-wider ${
                    roleConfig?.badgeColor || 'bg-stone-200 text-stone-800'
                  }`}
                >
                  {roleConfig?.displayName || currentUser.role}
                </span>
              </div>
            </div>
          </button>
          <button
            onClick={handleLockClick}
            title="Lock register"
            className="p-2 text-[#9B948C] hover:text-[#3B2925] rounded-xl hover:bg-white transition cursor-pointer shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <Lock className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 h-screen border-r border-[#E8E2D9] flex-col select-none">
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Off-Canvas Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div className="relative w-64 max-w-[80vw] h-full bg-[#FBF9F5] shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
