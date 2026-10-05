import React, { useState, useEffect } from 'react';
import { Clock, Plus } from 'lucide-react';
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
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  currentUser,
  activeShift,
  onOpenShiftModal
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
    <header className="h-14 bg-white border-b border-[#E8E2D9] px-6 flex items-center justify-between shrink-0 select-none z-10">
      {/* View Title */}
      <div className="flex items-center gap-2.5">
        <h2 className="text-sm font-semibold text-[#292929]">
          {title}
        </h2>
        {subtitle && (
          <span className="hidden md:inline text-xs text-[#7A736C] font-normal">
            <span className="mx-1 text-[#DDD4C7]">·</span> {subtitle}
          </span>
        )}
      </div>

      {/* Status & Clock */}
      <div className="flex items-center gap-4">
        {/* Real-time Clock */}
        <div className="flex items-center gap-1.5 text-xs text-[#7A736C] font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5 text-[#9B948C]" />
          <span>{currentTime}</span>
        </div>

        <div className="h-4 w-px bg-[#E8E2D9]" />

        {/* Shift status action */}
        {activeShift ? (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F7F3EB] hover:bg-[#EFE9DF] text-xs transition cursor-pointer text-[#292929] border border-[#E8E2D9]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#A8B5A0]" />
            <span className="text-[#6E6862]">Drawer:</span>
            <span className="font-medium">{formatPHP(activeShift.openingCashCents)}</span>
          </button>
        ) : (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-medium transition cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open Shift</span>
          </button>
        )}
      </div>
    </header>
  );
};
