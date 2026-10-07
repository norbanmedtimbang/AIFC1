import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Lock,
  X,
  ChevronRight,
  ArrowLeft,
  Delete,
  AlertCircle,
  Clock
} from 'lucide-react';
import { User } from '../../types';
import { dataService } from '../../services/dataService';
import { ROLE_PERMISSIONS } from '../../services/rbac';

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  users: User[];
  currentUser?: User;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  users,
  currentUser
}) => {
  // Step 1: select_user, Step 2: enter_pin
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Active users only from existing user/profile data
  const activeUsers = useMemo(
    () => users.filter(u => u.status === 'active'),
    [users]
  );

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSelectedUser(null);
      setPin('');
      setErrorMessage(null);
      setFailedAttempts(0);
      setIsVerifying(false);
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Handle User Selection (Step 1 -> Step 2)
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setPin('');
    setErrorMessage(null);
  };

  // Back to Step 1
  const handleBackToSelect = () => {
    setSelectedUser(null);
    setPin('');
    setErrorMessage(null);
  };

  // Validate PIN against existing auth system
  const executeVerify = useCallback(
    (codeToVerify: string) => {
      if (!selectedUser) {
        setErrorMessage('Please select a staff member first.');
        return;
      }
      if (lockoutSeconds > 0) {
        setErrorMessage(`Terminal cooldown active. Wait ${lockoutSeconds} seconds.`);
        return;
      }
      if (!codeToVerify || codeToVerify.length !== 4) {
        setErrorMessage('Please enter your 4-digit numeric PIN.');
        return;
      }

      setIsVerifying(true);
      setErrorMessage(null);

      // Validate against the existing authentication/user system
      const verified = dataService.verifyUserPin(selectedUser.id, codeToVerify);

      if (verified) {
        // Success: switch active user immediately
        setPin('');
        setErrorMessage(null);
        setFailedAttempts(0);
        setIsVerifying(false);
        onSuccess(verified);
      } else {
        // Incorrect PIN: do NOT switch user, clear PIN, show error message
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        setPin('');
        setIsVerifying(false);

        if (nextAttempts >= 5) {
          setLockoutSeconds(30);
          setErrorMessage('Too many failed attempts. Cooldown active for 30s.');
        } else {
          setErrorMessage(`Invalid PIN for ${selectedUser.fullName}. Please try again.`);
        }
      }
    },
    [selectedUser, lockoutSeconds, failedAttempts, onSuccess]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      if (lockoutSeconds > 0 || isVerifying) return;
      setPin(prev => {
        if (prev.length < 4) {
          const next = prev + digit;
          setErrorMessage(null);
          if (next.length === 4) {
            setTimeout(() => executeVerify(next), 50);
          }
          return next;
        }
        return prev;
      });
    },
    [lockoutSeconds, isVerifying, executeVerify]
  );

  const handleDelete = useCallback(() => {
    if (lockoutSeconds > 0 || isVerifying) return;
    setPin(prev => prev.slice(0, -1));
    setErrorMessage(null);
  }, [lockoutSeconds, isVerifying]);

  const handleClear = useCallback(() => {
    if (lockoutSeconds > 0 || isVerifying) return;
    setPin('');
    setErrorMessage(null);
  }, [lockoutSeconds, isVerifying]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedUser) {
          handleBackToSelect();
        } else {
          onClose();
        }
      } else if (selectedUser) {
        if (e.key >= '0' && e.key <= '9') {
          e.preventDefault();
          handleDigit(e.key);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleDelete();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (pin.length === 4) {
            executeVerify(pin);
          } else {
            setErrorMessage('Please enter your 4-digit PIN.');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedUser, pin, handleDigit, handleDelete, executeVerify, onClose]);

  if (!isOpen) return null;

  const selectedRole = selectedUser ? ROLE_PERMISSIONS[selectedUser.role] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 select-none overflow-y-auto animate-backdrop">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E8E2D9] overflow-hidden my-auto animate-in flex flex-col">
        {/* MODAL HEADER */}
        <div className="bg-[#F7F3EB] border-b border-[#E8E2D9] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#3B2925] text-white flex items-center justify-center shrink-0 shadow-xs">
              {selectedUser ? (
                <Lock className="w-5 h-5 stroke-[1.8]" />
              ) : (
                <Users className="w-5 h-5 stroke-[1.8]" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#292929] tracking-tight leading-snug">
                Switch Active User
              </h2>
              <p className="text-xs text-[#7A736C] truncate mt-0.5">
                {selectedUser
                  ? `Enter PIN for ${selectedUser.fullName}`
                  : 'Select staff account to take over this register'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#9B948C] hover:text-[#292929] hover:bg-[#E8E2D9] rounded-xl transition cursor-pointer shrink-0"
            aria-label="Cancel switch user"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: SELECT USER SCREEN */}
        {!selectedUser && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A736C]">
                Available Staff ({activeUsers.length})
              </span>
              {currentUser && (
                <span className="text-[11px] text-[#9B948C]">
                  Current: <strong className="text-[#292929]">{currentUser.fullName}</strong>
                </span>
              )}
            </div>

            {activeUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9B948C]">
                No active staff profiles found in database.
              </div>
            ) : (
              <div className="space-y-2 max-h-[22rem] overflow-y-auto pr-1">
                {activeUsers.map(user => {
                  const roleConfig = ROLE_PERMISSIONS[user.role];
                  const isCurrent = user.id === currentUser?.id;
                  const initials = user.fullName
                    .split(' ')
                    .map(n => n.charAt(0))
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition cursor-pointer border ${
                        isCurrent
                          ? 'bg-[#FAF7F2] border-[#3B2925]/30 ring-1 ring-[#3B2925]/15'
                          : 'bg-white border-[#E8E2D9] hover:bg-[#FBF9F5] hover:border-[#3B2925]'
                      } active:scale-[0.99]`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCurrent
                              ? 'bg-[#3B2925] text-white'
                              : 'bg-[#EFE9DF] text-[#523B36]'
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#292929] truncate">
                              {user.fullName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold text-[#3B2925] bg-[#EFE9DF] px-1.5 py-0.2 rounded-md">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#9B948C] truncate mt-0.5">
                            @{user.username}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full tracking-wide ${
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

            <div className="pt-2 border-t border-[#E8E2D9] flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#F7F3EB] transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ENTER PIN SCREEN */}
        {selectedUser && (
          <div className="p-6 space-y-5">
            {/* Selected User Header Card */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#F7F3EB] border border-[#E8E2D9]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-[#3B2925] text-white">
                  {selectedUser.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#292929] truncate">
                    {selectedUser.fullName}
                  </div>
                  <div className="text-[11px] text-[#7A736C]">
                    Role: <strong className="uppercase">{selectedRole?.displayName || selectedUser.role}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToSelect}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#3B2925] hover:bg-white transition cursor-pointer shrink-0 border border-transparent hover:border-[#E8E2D9]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change User</span>
              </button>
            </div>

            {/* Masked PIN Display */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-[#E8E2D9] text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A736C] block">
                Enter 4-Digit Staff PIN
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
                <div className="text-[11px] text-[#9B948C]">
                  Authenticate with {selectedUser.fullName.split(' ')[0]}’s PIN
                </div>
              )}
            </div>

            {/* Numeric Keypad */}
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
                disabled={lockoutSeconds > 0 || isVerifying || pin.length === 0}
                onClick={handleClear}
                className="h-12 bg-white hover:bg-[#F7F3EB] active:bg-[#EFE9DF] text-[#7A736C] font-semibold text-xs rounded-xl border border-[#E8E2D9] transition flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Clear
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
                disabled={lockoutSeconds > 0 || isVerifying || pin.length === 0}
                onClick={handleDelete}
                className="h-12 bg-white hover:bg-[#F7F3EB] active:bg-[#EFE9DF] text-[#7A736C] rounded-xl border border-[#E8E2D9] transition flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Delete last digit"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Cancel & Back Actions */}
            <div className="pt-2 border-t border-[#E8E2D9] flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackToSelect}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#3B2925] hover:bg-[#F7F3EB] transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Select Different Staff</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#F7F3EB] transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
