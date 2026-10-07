import React, { useState, useEffect, useCallback } from 'react';
import {
  Coffee,
  Lock,
  Delete,
  AlertCircle,
  Clock,
  UserCheck,
  ArrowLeft,
  ChevronRight
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
  const activeUsers = users.filter(u => u.status !== 'inactive');

  // No account is preselected: step 1 is choosing who is signing in.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = activeUsers.find(u => u.id === selectedUserId) ?? null;

  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

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

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setPin('');
    setErrorMessage(null);
  };

  const handleChangeStaff = () => {
    setSelectedUserId(null);
    setPin('');
    setErrorMessage(null);
  };

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

      const isMatch = selectedUser.pinHash === codeToVerify;

      if (isMatch) {
        setFailedAttempts(0);
        setPin('');
        setIsVerifying(false);
        onLoginSuccess(selectedUser);
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setPin('');
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

  // Physical keyboard support — only on the PIN step
  useEffect(() => {
    if (!selectedUser) return;

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
  }, [selectedUser, pin, lockoutSeconds, handleDigit, handleDelete, handleClear, executeLogin]);

  const selectedRole = selectedUser ? ROLE_PERMISSIONS[selectedUser.role] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F3EB] p-4 select-none overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-[#E8E2D9] overflow-hidden my-auto animate-in">
        {/* Header Branding */}
        <div className="bg-[#3B2925] text-white px-6 py-6 text-center border-b border-[#2C1E1A]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 text-white mb-3 shadow-inner">
            <Coffee className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h1 className="text-base font-bold tracking-tight uppercase">{shopName}</h1>
          <p className="text-xs text-white/70 mt-0.5 tracking-wide">{tagline}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] text-white/90">
            <Lock className="w-3 h-3 text-[#A8B5A0]" />
            <span>Tactical Cashier Terminal</span>
          </div>
        </div>

        {!selectedUser ? (
          /* STEP 1 — choose staff account */
          <div className="p-6 space-y-4">
            <div className="text-center">
              <h2 className="text-sm font-bold text-[#292929] tracking-tight">Who’s signing in?</h2>
              <p className="text-[11px] text-[#9B948C] mt-1">Select your staff account to continue</p>
            </div>

            {lockoutSeconds > 0 && (
              <div className="text-[11.5px] text-amber-700 font-medium flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0 animate-spin" />
                <span>Terminal cooldown active ({lockoutSeconds}s)</span>
              </div>
            )}

            {activeUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9B948C]">
                No active staff accounts. Ask an administrator to create or reactivate one.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-[22rem] overflow-y-auto pr-0.5">
                {activeUsers.map(user => {
                  const roleConfig = ROLE_PERMISSIONS[user.role];
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user.id)}
                      className="flex items-center justify-between p-3 rounded-2xl text-left transition cursor-pointer border bg-white border-[#E8E2D9] hover:bg-[#FAF7F2] hover:border-[#3B2925] active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 bg-[#EFE9DF] text-[#6E6862]">
                          {user.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#292929] truncate">{user.fullName}</div>
                          <div className="text-[11px] text-[#9B948C] truncate">@{user.username}</div>
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
                        <ChevronRight className="w-4 h-4 text-[#C4B9AA]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* STEP 2 — enter PIN for the chosen account */
          <div className="p-6 space-y-5">
            {/* Selected account + change */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F7F3EB] border border-[#E8E2D9]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 bg-[#3B2925] text-white">
                  {selectedUser.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#292929] truncate">{selectedUser.fullName}</div>
                  <div className="text-[11px] text-[#9B948C] truncate">
                    {selectedRole?.displayName || selectedUser.role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleChangeStaff}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#3B2925] hover:underline cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change
              </button>
            </div>

            {/* Masked PIN indicators */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E8E2D9] text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A736C] block">
                Enter 4-Digit Terminal PIN
              </span>

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
                <div className="text-[11px] text-[#9B948C]">Enter the PIN for this account</div>
              )}
            </div>

            {/* Numeric keypad */}
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

            {/* Login */}
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
        )}
      </div>
    </div>
  );
};
