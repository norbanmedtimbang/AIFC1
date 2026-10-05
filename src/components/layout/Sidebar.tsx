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
  Flame,
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
  const navItems: { id: NavModule; label: string; icon: React.ElementType; badge?: number; hotkey?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Cashier POS', icon: Coffee, hotkey: 'F1' },
    { id: 'menu', label: 'Menu & Recipes', icon: BookOpen },
    { id: 'inventory', label: 'Inventory Stock', icon: Package, badge: lowStockCount },
    { id: 'purchases', label: 'Purchases & Vendors', icon: Truck },
    { id: 'orders', label: 'Orders & Receipts', icon: Receipt },
    { id: 'expenses', label: 'Store Expenses', icon: CreditCard },
    { id: 'reports', label: 'Reports & Readings', icon: BarChart3 },
    { id: 'staff', label: 'Staff & Shifts', icon: Users },
    { id: 'settings', label: 'Settings & Database', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-[#14100E] text-stone-200 flex flex-col h-screen shrink-0 border-r border-stone-800 select-none shadow-2xl">
      {/* Brand Header - Gen Z Aesthetic */}
      <div className="p-5 border-b border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#B4EE10] text-[#14100E] flex items-center justify-center font-black shadow-[0_0_15px_rgba(180,238,16,0.3)]">
            <Flame className="w-6 h-6 fill-[#14100E]" />
          </div>
          <div>
            <div className="font-display font-black text-lg tracking-tight uppercase text-white leading-none">
              C5ISR
            </div>
            <div className="text-[10px] text-stone-400 font-mono tracking-widest uppercase mt-1">
              COMMAND COFFEE
            </div>
          </div>
        </div>

        {/* Clean unboxed offline indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 text-[10px] font-mono font-bold text-[#B4EE10]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B4EE10] animate-pulse" />
          <span>OFFLINE</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-[#B4EE10] text-[#14100E] shadow-lg font-black'
                  : 'text-stone-300 hover:bg-stone-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive ? 'text-[#14100E]' : 'text-stone-400 group-hover:text-[#B4EE10]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.hotkey && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-extrabold ${
                      isActive ? 'bg-[#14100E]/20 text-[#14100E]' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {item.hotkey}
                  </span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Shift & Cashier Section */}
      <div className="p-3 border-t border-stone-800 bg-black/40 space-y-2.5">
        {/* Shift Status */}
        <div className="px-3 py-2 rounded-xl bg-stone-900/80 border border-stone-800 text-xs flex items-center justify-between text-stone-300">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                activeShift ? 'bg-[#B4EE10] animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-bold text-white">
              {activeShift ? 'Shift Active' : 'No Shift Open'}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#B4EE10]">SQLite Ready</span>
        </div>

        {/* Current User Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-900 border border-stone-800 text-white">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] text-[#14100E] font-display font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
              {currentUser.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate leading-tight text-white">{currentUser.fullName}</p>
              <p className="text-[10px] text-stone-400 uppercase font-mono mt-0.5">
                {currentUser.role}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onSwitchUser}
              title="Switch Active Cashier"
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={onLockTerminal}
              title="Lock Terminal"
              className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-300 hover:text-white transition"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
