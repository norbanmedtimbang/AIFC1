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
  UserCheck
} from 'lucide-react';
import { User, CashierShift } from '../../types';

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
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  currentUser,
  activeShift,
  lowStockCount,
  onSwitchUser,
  onLockTerminal
}) => {
  const primaryNav: { id: NavModule; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'POS', icon: Coffee },
    { id: 'menu', label: 'Menu', icon: BookOpen },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStockCount },
    { id: 'purchases', label: 'Purchases', icon: Truck },
    { id: 'orders', label: 'Transactions', icon: Receipt },
    { id: 'expenses', label: 'Expenses', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'staff', label: 'Staff', icon: Users }
  ];

  return (
    <aside className="w-56 bg-[#FBF9F5] text-[#292929] flex flex-col h-screen shrink-0 border-r border-[#E8E2D9] select-none">
      {/* Brand Header */}
      <div className="px-5 py-6 border-b border-[#E8E2D9]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#3B2925] leading-none">
              C5ISR
            </h1>
            <p className="text-xs text-[#7A736C] font-medium mt-1">
              Coffee POS
            </p>
          </div>
          {activeShift && (
            <span
              title="Shift Open"
              className="inline-block w-2 h-2 rounded-full bg-[#A8B5A0]"
            />
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {primaryNav.map(item => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#3B2925] text-white shadow-xs'
                  : 'text-[#6E6862] hover:bg-[#EFE9DF] hover:text-[#292929]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-[#8E867E]'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#E8DFD2] text-[#3B2925]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="pt-2 pb-1">
          <div className="h-px bg-[#E8E2D9]" />
        </div>

        {/* Settings item */}
        <button
          onClick={() => onSelectModule('settings')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            currentModule === 'settings'
              ? 'bg-[#3B2925] text-white shadow-xs'
              : 'text-[#6E6862] hover:bg-[#EFE9DF] hover:text-[#292929]'
          }`}
        >
          <Settings
            className={`w-4 h-4 shrink-0 ${
              currentModule === 'settings' ? 'text-white' : 'text-[#8E867E]'
            }`}
            strokeWidth={currentModule === 'settings' ? 2.2 : 1.8}
          />
          <span>Settings</span>
        </button>
      </nav>

      {/* User & Terminal Footer */}
      <div className="p-3 border-t border-[#E8E2D9] bg-[#F7F3EB]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <button
            onClick={onSwitchUser}
            className="flex items-center gap-2 text-left cursor-pointer group hover:opacity-80 transition"
          >
            <div className="w-7 h-7 rounded-lg bg-[#E8DFD2] text-[#3B2925] flex items-center justify-center text-xs font-bold shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-[#292929] truncate">
                {currentUser.fullName}
              </div>
              <div className="text-[10px] text-[#7A736C] capitalize leading-tight">
                {currentUser.role}
              </div>
            </div>
          </button>
          <button
            onClick={onLockTerminal}
            title="Lock Register"
            className="p-1.5 text-[#8E867E] hover:text-[#3B2925] rounded-lg hover:bg-[#E8DFD2] transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
