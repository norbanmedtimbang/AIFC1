import React, { useState, useEffect } from 'react';
import {
  Clock,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
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
  onOpenShiftModal,
  onSwitchUser
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
    <header className="h-16 px-6 flex items-center justify-between shrink-0 select-none">
      {/* Zone 1: Section Title */}
      <div className="flex items-center gap-3">
        <h2 className="font-extrabold text-xl text-[#2B2521] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <span className="hidden xl:inline text-xs text-[#8C7F76]">
            — {subtitle}
          </span>
        )}
      </div>

      {/* Zone 2: Actions & Indicators */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#EFE4D9] text-xs font-semibold text-[#5A4F47] shadow-xs tabular-nums">
          <Clock className="w-3.5 h-3.5 text-[#C68A57]" />
          <span>{currentTime || '12:00 PM'}</span>
        </div>

        {/* Active Shift / Cash float button */}
        {activeShift ? (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FCEFE5] text-[#C68A57] border border-[#DEBEA6] text-xs font-bold hover:bg-[#F8DFCE] transition shadow-xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Float: {formatPHP(activeShift.openingCashCents)}</span>
          </button>
        ) : (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#C68A57] hover:bg-[#AC7140] text-white text-xs font-bold transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Open Shift</span>
          </button>
        )}

        {/* User Pill */}
        <button
          onClick={onSwitchUser}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#EFE4D9] hover:border-[#C68A57] text-xs font-semibold text-[#2B2521] transition shadow-xs"
        >
          <div className="w-5 h-5 rounded-full bg-[#FCEFE5] text-[#C68A57] text-[10px] font-bold flex items-center justify-center">
            {currentUser.fullName.slice(0, 1)}
          </div>
          <span>{currentUser.fullName.split(' ')[0]}</span>
        </button>
      </div>
    </header>
  );
};
