import React, { useState, useEffect, useCallback } from 'react';
import {
  Coffee,
  Lock,
  Delete,
  X,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { User } from '../../types';
import { ROLE_PERMISSIONS } from '../../services/rbac';

interface PinLoginViewProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  shopName?: string;
  tagline?: string;
}

export const PinLoginView: React.FC<PinLoginViewProps> = ({
  users,
  onLoginSuccess,
  shopName = 'C5ISR COFFEE SHOP',
  tagline = 'Specialty Coffee & Command Operations'
}) => {
  // Filter active staff members
  const activeUsers = users.filter(u => u.status !== 'inactive');
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return activeUsers[0]?.id || '';
  });

  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Selected user object
  const selectedUser = activeUsers.find(u => u.id === selectedUserId) || activeUsers[0];

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  // Attempt authentication
  const executeLogin = useCallback(
    (codeToVerify: string) => {
      if (!selectedUser) {
        setErrorMessage('Please select a staff account first.');
        return;
      }
      if (lockoutSeconds > 0) {
        setErrorMessage(`Terminal locked. Try again in ${lockoutSeconds} seconds.`);
        return;
      }
      if (!codeToVerify || codeToVerify.length !== 4) {
        setErrorMessage('Please enter your complete 4-digit PIN.');
        return;
      }

      setIsVerifying(true);
      setErrorMessage(null);

      // Verify PIN against selected user's stored PIN hash
      const isMatch = selectedUser.pinHash === codeToVerify;

      if (isMatch) {
        setFailedAttempts(0);
        setPin('');
        setIsVerifying(false);
        // Automatic Role Detection: passes full user with role to parent
        onLoginSuccess(selectedUser);
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setPin(''); // Clear PIN after failed login
        setIsVerifying(false);

        if (nextAttempts >= 5) {
          setLockoutSeconds(30);
          setErrorMessage('Too many failed attempts. Security cooldown active for 30 seconds.');
        } else {
          setErrorMessage(`Invalid PIN. Please try again. (${5 - nextAttempts} attempts remaining)`);
        }
      }
    },
    [selectedUser, lockoutSeconds, failedAttempts, onLoginSuccess]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (lockoutSeconds > 0) return;
      setPin(prev => {
        if (prev.length < 4) {
          const next = prev + digit;
          setErrorMessage(null);
          if (next.length === 4) {
            setTimeout(() => executeLogin(next), 60);
          }
          return next;
        }
        return prev;
      });
    },
    [lockoutSeconds, executeLogin]
  );

  const handleDelete = useCallback(() => {
    if (lockoutSeconds > 0) return;
    setPin(prev => prev.slice(0, -1));
    setErrorMessage(null);
  }, [lockoutSeconds]);

  const handleClear = useCallback(() => {
    if (lockoutSeconds > 0) return;
    setPin('');
    setErrorMessage(null);
  }, [lockoutSeconds]);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lockoutSeconds > 0) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length === 4) {
          executeLogin(pin);
        } else {
          setErrorMessage('Please enter your 4-digit PIN.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, lockoutSeconds, handleDigit, handleDelete, handleClear, executeLogin]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F3EB] p-4 select-none overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#E8E2D9] overflow-hidden my-auto animate-in">
        {/* Header Branding */}
        <div className="bg-[#3B2925] text-white px-6 py-6 text-center border-b border-[#2C1E1A]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 text-white mb-3 shadow-inner">
            <Coffee className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h1 className="text-base font-bold tracking-tight uppercase">
            {shopName}
          </h1>
          <p className="text-xs text-white/70 mt-0.5 tracking-wide">
            {tagline}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] text-white/90">
            <Lock className="w-3 h-3 text-[#A8B5A0]" />
            <span>Tactical Cashier Terminal</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* 1. Account Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#7A736C] mb-2 text-center">
              Select Staff Account
            </label>
            <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {activeUsers.map(user => {
                const isSelected = selectedUser?.id === user.id;
                const roleConfig = ROLE_PERMISSIONS[user.role];
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setPin('');
                      setErrorMessage(null);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#F7F3EB] border-[#3B2925] shadow-xs'
                        : 'bg-white border-[#E8E2D9] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-[#3B2925] text-white'
                            : 'bg-[#EFE9DF] text-[#6E6862]'
                        }`}
                      >
                        {user.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#292929] truncate">
                          {user.fullName}
                        </div>
                        <div className="text-[10px] text-[#9B948C] truncate">
                          @{user.username}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wide ${
                          roleConfig?.badgeColor || 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {roleConfig?.displayName || user.role}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#3B2925]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Masked PIN Indicators */}
          <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E8E2D9] text-center space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A736C] block">
              Enter 4-Digit Terminal PIN
            </span>

            {/* Bubble Dots: ● ● ● ● */}
            <div className="flex justify-center items-center gap-3 py-1">
              {[0, 1, 2, 3].map(i => {
                const isFilled = i < pin.length;
                return (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-150 flex items-center justify-center ${
                      isFilled
                        ? 'bg-[#3B2925] scale-110 shadow-xs ring-2 ring-[#3B2925]/20'
                        : 'bg-white border-2 border-[#DDD4C7]'
                    }`}
                  >
                    {isFilled && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                );
              })}
            </div>

            {/* Feedback / Error message */}
            {errorMessage ? (
              <div className="text-[11.5px] text-rose-600 font-medium flex items-center justify-center gap-1.5 animate-shake">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : lockoutSeconds > 0 ? (
              <div className="text-[11.5px] text-amber-700 font-medium flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0 animate-spin" />
                <span>Cooldown active ({lockoutSeconds}s)</span>
              </div>
            ) : (
              <div className="text-[11px] text-[#9B948C]">
                Role will be automatically resolved from account data
              </div>
            )}
          </div>

          {/* 3. Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
              <button
                key={digit}
                type="button"
                disabled={lockoutSeconds > 0 || isVerifying}
                onClick={() => handleDigit(digit)}
                className="h-12 bg-white hover:bg-[#F7F3EB] active:bg-[#EFE9DF] text-[#292929] font-bold text-base rounded-xl border border-[#E8E2D9] transition shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              disabled={lockoutSeconds > 0 || pin.length === 0}
              onClick={handleClear}
              className="h-12 bg-[#F7F3EB] hover:bg-[#EFE9DF] text-[#7A736C] font-semibold text-xs rounded-xl border border-[#E8E2D9] transition flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              CLEAR
            </button>

            <button
              type="button"
              disabled={lockoutSeconds > 0 || isVerifying}
              onClick={() => handleDigit('0')}
              className="h-12 bg-white hover:bg-[#F7F3EB] active:bg-[#EFE9DF] text-[#292929] font-bold text-base rounded-xl border border-[#E8E2D9] transition shadow-xs flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              0
            </button>

            <button
              type="button"
              disabled={lockoutSeconds > 0 || pin.length === 0}
              onClick={handleDelete}
              className="h-12 bg-[#F7F3EB] hover:bg-[#EFE9DF] text-[#7A736C] rounded-xl border border-[#E8E2D9] transition flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Delete className="w-5 h-5 stroke-[1.8]" />
            </button>
          </div>

          {/* 4. Action Button: [ LOGIN ] */}
          <div>
            <button
              type="button"
              disabled={lockoutSeconds > 0 || pin.length !== 4 || isVerifying}
              onClick={() => executeLogin(pin)}
              className="w-full py-3.5 bg-[#3B2925] hover:bg-[#2C1E1A] text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying PIN…' : 'Login to Register'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
