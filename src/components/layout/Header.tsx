import React, { useState, useEffect } from 'react';
import {
  Clock,
  HardDrive,
  UserCheck,
  RotateCcw,
  ShieldCheck,
  WifiOff
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
          second: '2-digit',
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-stone-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
      {/* Zone 1: View Title & Subtitle */}
      <div className="flex items-center gap-3">
        <h2 className="font-display font-black text-lg text-stone-900 tracking-tight leading-none uppercase">
          {title}
        </h2>
        {subtitle && (
          <span className="hidden lg:inline text-xs font-semibold text-stone-500">
            <span className="mx-1.5 text-stone-300">/</span> {subtitle}
          </span>
        )}
      </div>

      {/* Zone 2: System Metadata */}
      <div className="hidden md:flex items-center gap-2 text-xs text-stone-600 font-semibold">
        <span className="flex items-center gap-1.5 text-stone-800">
          <HardDrive className="w-3.5 h-3.5 text-stone-500" />
          <span>Local SQLite</span>
        </span>
        <span aria-hidden="true" className="text-stone-300">·</span>
        <span className="flex items-center gap-1 text-emerald-700 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>100% Offline Active</span>
        </span>
        <span aria-hidden="true" className="text-stone-300">·</span>
        <span className="font-mono text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-bold">
          TERM-01
        </span>
      </div>

      {/* Zone 3: Actions & Clock */}
      <div className="flex items-center gap-3">
        {/* Monospace Tabular Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 border border-stone-200 text-xs font-mono font-black text-stone-900 tabular-nums shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-stone-500" />
          <span>{currentTime || '00:00:00'}</span>
        </div>

        {/* Active Shift / Float Button */}
        {activeShift ? (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#14100E] text-white text-xs font-bold hover:bg-stone-800 transition shadow-xs"
            title="Click to view or close shift"
          >
            <span className="w-2 h-2 rounded-full bg-[#B4EE10] animate-pulse" />
            <span className="text-stone-300 font-medium">Float:</span>
            <span className="font-mono font-black text-[#B4EE10]">{formatPHP(activeShift.openingCashCents)}</span>
          </button>
        ) : (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Open Shift Float</span>
          </button>
        )}

        {/* Quick User Switch */}
        <button
          onClick={onSwitchUser}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-xs font-bold text-stone-800 transition shadow-2xs"
        >
          <div className="w-5 h-5 rounded-lg bg-[#14100E] text-white text-[10px] font-black flex items-center justify-center">
            {currentUser.fullName.slice(0, 1).toUpperCase()}
          </div>
          <span className="hidden sm:inline">{currentUser.fullName}</span>
        </button>
      </div>
    </header>
  );
};
