import React, { useState } from 'react';
import { Lock, Delete, X, AlertCircle } from 'lucide-react';
import { db } from '../../services/storage';
import { User, UserRole } from '../../types';

interface PinDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  title: string;
  description?: string;
  allowedRoles?: UserRole[];
}

export const PinDialog: React.FC<PinDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  description,
  allowedRoles = ['admin', 'manager']
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        verify(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const verify = (codeToVerify: string) => {
    const verifiedUser = db.verifyPin(codeToVerify, allowedRoles);
    if (verifiedUser) {
      setPin('');
      setError(null);
      onSuccess(verifiedUser);
    } else {
      setError(`Invalid PIN or insufficient role permissions (${allowedRoles.join('/')} required).`);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 select-none animate-backdrop">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#E8E2D9] overflow-hidden animate-in">
        {/* Header */}
        <div className="bg-[#F7F3EB] border-b border-[#E8E2D9] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3B2925] text-white flex items-center justify-center">
              <Lock className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#292929] leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-[#7A736C] mt-0.5">
                {description || `Authorized for ${allowedRoles.join(', ')}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9B948C] hover:text-[#292929] hover:bg-[#E8E2D9] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Indicators */}
        <div className="p-6 flex flex-col items-center">
          <div className="flex gap-3 my-2">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? 'bg-[#3B2925] border-[#3B2925] scale-110'
                    : 'border-[#DDD4C7] bg-[#F7F3EB]'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-[#A25035] bg-[#FDF6F4] px-3 py-1.5 rounded-lg border border-[#F0D9D2] mt-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-[11px] text-[#9B948C] mt-2">
            Default Administrator PIN: 1234
          </div>

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full mt-5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigit(num)}
                className="h-12 rounded-xl bg-[#F7F3EB] hover:bg-[#EFE9DF] text-[#292929] font-medium font-mono text-lg active:scale-[0.97] transition flex items-center justify-center border border-[#E8E2D9] cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 rounded-xl bg-[#F7F3EB] hover:bg-[#EFE9DF] text-[#6E6862] text-[11px] font-medium active:scale-[0.97] transition border border-[#E8E2D9] cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-12 rounded-xl bg-[#F7F3EB] hover:bg-[#EFE9DF] text-[#292929] font-medium font-mono text-lg active:scale-[0.97] transition flex items-center justify-center border border-[#E8E2D9] cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-12 rounded-xl bg-[#F7F3EB] hover:bg-[#EFE9DF] text-[#292929] active:scale-[0.97] transition flex items-center justify-center border border-[#E8E2D9] cursor-pointer"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
