import React from 'react';
import {
  Home,
  Coffee,
  ShoppingCart,
  History,
  Users,
  Settings,
  Heart,
  LogOut,
  Package,
  Layers,
  Sparkles
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
  cartCount?: number;
  storeName?: string;
  onSwitchUser: () => void;
  onLockTerminal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentModule,
  onSelectModule,
  currentUser,
  activeShift,
  lowStockCount,
  cartCount = 0,
  storeName = 'C5ISR COFFEE SHOP',
  onSwitchUser,
  onLockTerminal
}) => {
  const primaryNavItems: {
    id: NavModule;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Home page', icon: Home },
    { id: 'pos', label: 'Menu', icon: Coffee },
    { id: 'orders', label: 'My orders', icon: ShoppingCart, badge: cartCount > 0 ? cartCount : undefined },
    { id: 'reports', label: 'History', icon: History },
    { id: 'staff', label: 'Partners', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const secondaryNavItems: {
    id: NavModule;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }[] = [
    { id: 'menu', label: 'Menu Editor', icon: Layers },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined }
  ];

  return (
    <aside className="w-60 bg-[#FFFDFB] flex flex-col h-full shrink-0 border-r border-[#EFE4D9] select-none shadow-[2px_0_20px_rgba(200,165,135,0.06)] rounded-r-[32px] my-2 ml-2 p-4 justify-between">
      {/* Top Brand Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="w-10 h-10 rounded-2xl bg-[#FCEFE5] text-[#C68A57] flex items-center justify-center shadow-xs">
            <Coffee className="w-5 h-5 fill-[#C68A57] text-[#C68A57]" />
          </div>
          <div>
            <div className="font-extrabold text-[15px] tracking-tight text-[#2B2521] leading-tight">
              {storeName || 'C5ISR COFFEE SHOP'}
            </div>
            <div className="text-[10px] text-[#A59B93] font-medium tracking-wide mt-0.5">
              Specialty Barista POS
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          {primaryNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#FCEFE5] text-[#C68A57] font-bold shadow-xs'
                    : 'text-[#5A4F47] hover:bg-[#F9F4EE] hover:text-[#2B2521]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-[#C68A57]' : 'text-[#8C7F76]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#E67E44] text-white text-[11px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-3 pb-1 px-4">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#B0A49B]">
              Operations
            </span>
          </div>

          {secondaryNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#FCEFE5] text-[#C68A57] font-bold shadow-xs'
                    : 'text-[#5A4F47] hover:bg-[#F9F4EE] hover:text-[#2B2521]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon
                    className={`w-4 h-4 transition ${
                      isActive ? 'text-[#C68A57]' : 'text-[#8C7F76]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="space-y-1.5 pt-4 border-t border-[#EFE4D9]/80">
        <button
          onClick={() => onSelectModule('staff')}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-medium text-[#5A4F47] hover:bg-[#F9F4EE] hover:text-[#2B2521] transition"
        >
          <Heart className="w-4 h-4 text-[#C68A57]" />
          <span>{activeShift ? 'Shift Active' : 'Donate to shelter'}</span>
        </button>

        <button
          onClick={onLockTerminal}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs font-medium text-[#5A4F47] hover:bg-[#F9F4EE] hover:text-rose-600 transition"
        >
          <LogOut className="w-4 h-4 text-[#8C7F76]" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};
