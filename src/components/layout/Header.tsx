import React, { useState, useEffect } from 'react';
import { Clock, Plus, Menu } from 'lucide-react';
import { User, CashierShift, ShopSettings } from '../../types';
import { formatPHP } from '../../services/storage';

interface HeaderProps {
  title: string;
  subtitle?: string;
  currentUser: User;
  activeShift: CashierShift | null;
  settings: ShopSettings;
  onOpenShiftModal: () => void;
  onSwitchUser: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  activeShift,
  onOpenShiftModal,
  onToggleMobileMenu
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-PH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-white/95 backdrop-blur-sm border-b border-[#E8E2D9] px-3 sm:px-6 flex items-center justify-between shrink-0 select-none z-10 gap-2">
      {/* Mobile Menu Button + Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-[#292929] hover:bg-[#F7F3EB] rounded-xl transition cursor-pointer shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center -ml-1"
            aria-label="Open menu navigation"
          >
            <Menu className="w-5 h-5 text-[#3B2925]" strokeWidth={2} />
          </button>
        )}

        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-[14px] sm:text-[15px] font-semibold text-[#292929] tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <span className="hidden md:inline text-xs text-[#9B948C] font-normal truncate">
              <span className="mx-1 text-[#DDD4C7]">·</span>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Status & Shift controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#9B948C] font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5 text-[#C4B9AA]" strokeWidth={1.8} />
          <span>{currentTime}</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-[#E8E2D9]" />

        {activeShift ? (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#F7F3EB] hover:bg-[#EFE9DF] text-xs transition cursor-pointer text-[#292929] border border-transparent hover:border-[#E8E2D9]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A8B5A0] opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A8B5A0]" />
            </span>
            <span className="hidden xs:inline text-[#7A736C]">Drawer</span>
            <span className="font-mono font-medium tabular-nums text-[11px] sm:text-xs">
              {formatPHP(activeShift.openingCashCents)}
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-semibold transition cursor-pointer shadow-[0_2px_6px_rgba(59,41,37,0.18)]"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
            <span className="text-[11.5px] sm:text-xs">Open Shift</span>
          </button>
        )}
      </div>
    </header>
  );
};
