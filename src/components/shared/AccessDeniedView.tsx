import React from 'react';
import { ShieldAlert, ArrowLeft, Coffee, LayoutDashboard } from 'lucide-react';
import { User } from '../../types';
import { NavModule } from '../layout/Sidebar';
import { MODULE_NAMES, ROLE_PERMISSIONS } from '../../services/rbac';

interface AccessDeniedViewProps {
  currentModule: NavModule;
  currentUser: User;
  onNavigateBack: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  currentModule,
  currentUser,
  onNavigateBack
}) => {
  const moduleName = MODULE_NAMES[currentModule] || currentModule;
  const roleConfig = ROLE_PERMISSIONS[currentUser.role];

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-[#F7F3EB] select-none h-full">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E8E2D9] shadow-sm text-center space-y-6 animate-in">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8 stroke-[1.8]" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60 inline-block">
            Security Policy Enforcement
          </span>
          <h2 className="text-xl font-bold text-[#292929] tracking-tight">
            Access Denied
          </h2>
          <p className="text-xs text-[#7A736C] leading-relaxed max-w-sm mx-auto">
            You do not have permission to access the{' '}
            <span className="font-semibold text-[#292929]">{moduleName}</span> module.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#FBF9F5] border border-[#E8E2D9] text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9B948C]">Authenticated User:</span>
            <span className="font-semibold text-[#292929]">{currentUser.fullName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#9B948C]">Detected Role:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${roleConfig?.badgeColor || 'bg-stone-200 text-stone-800'}`}>
              {roleConfig?.displayName || currentUser.role}
            </span>
          </div>
          <div className="text-[11px] text-[#9B948C] pt-1 border-t border-[#E8E2D9]/70 leading-relaxed">
            {roleConfig?.description}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onNavigateBack}
            className="w-full py-3 px-4 bg-[#3B2925] hover:bg-[#2C1E1A] text-white rounded-2xl text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            {currentUser.role === 'cashier' ? (
              <>
                <Coffee className="w-4 h-4" />
                <span>Back to POS Register</span>
              </>
            ) : (
              <>
                <LayoutDashboard className="w-4 h-4" />
                <span>Back to Operations Dashboard</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
