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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#14100E] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B4EE10] text-[#14100E] flex items-center justify-center font-black">
              <Lock className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm uppercase tracking-tight text-white leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-stone-300 font-medium mt-0.5">
                {description || `Authorized for ${allowedRoles.join(', ')}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Indicators */}
        <div className="p-6 flex flex-col items-center">
          <div className="flex gap-4 my-3">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? 'bg-[#14100E] border-[#14100E] scale-125'
                    : 'border-stone-300 bg-stone-100'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 mt-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-[11px] text-stone-600 font-bold mt-2">
            Default Administrator PIN: 1234
          </div>

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-2.5 w-full mt-5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigit(num)}
                className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-900 font-black font-mono text-xl active:scale-95 transition shadow-2xs flex items-center justify-center border border-stone-200 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-black uppercase tracking-wider active:scale-95 transition border border-stone-200 cursor-pointer"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-900 font-black font-mono text-xl active:scale-95 transition shadow-2xs flex items-center justify-center border border-stone-200 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-900 active:scale-95 transition shadow-2xs flex items-center justify-center border border-stone-200 cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
