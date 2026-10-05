import React, { useState } from 'react';
import {
  Users,
  Shield,
  KeyRound,
  RotateCcw,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Check,
  AlertTriangle,
  Clock,
  DollarSign
} from 'lucide-react';
import { User, CashierShift, CashMovement, Sale, Expense } from '../../types';
import { db, formatPHP, parsePHPAmountToCents } from '../../services/storage';
import { dataService } from '../../services/dataService';

interface StaffViewProps {
  users: User[];
  currentUser: User;
  activeShift: CashierShift | null;
  shifts: CashierShift[];
  cashMovements: CashMovement[];
  sales: Sale[];
  expenses: Expense[];
  onRefreshData: () => void;
  onSwitchUser: () => void;
}

export const StaffView: React.FC<StaffViewProps> = ({
  users,
  currentUser,
  activeShift,
  shifts,
  cashMovements,
  sales,
  expenses,
  onRefreshData,
  onSwitchUser
}) => {
  // Cash In / Out Modal
  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'cash_in' | 'cash_out' | 'drop'>('drop');
  const [movementAmountInput, setMovementAmountInput] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Open Shift Modal
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState('3000');
  const [openingNotes, setOpeningNotes] = useState('');

  // Close Shift & Reconciliation Modal
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [countedCashInput, setCountedCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Add Staff User Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const [newPin, setNewPin] = useState('');

  // Active shift calculations
  const shiftCashSales = activeShift
    ? sales
        .filter(s => s.shiftId === activeShift.id && s.payment.method === 'cash' && s.paymentStatus === 'paid')
        .reduce((sum, s) => sum + s.totalCents, 0)
    : 0;

  const shiftCashIn = activeShift
    ? cashMovements
        .filter(m => m.shiftId === activeShift.id && m.type === 'cash_in' && m.reason !== 'Shift Opening Cash Float')
        .reduce((sum, m) => sum + m.amountCents, 0)
    : 0;

  const shiftCashOut = activeShift
    ? cashMovements
        .filter(m => m.shiftId === activeShift.id && (m.type === 'cash_out' || m.type === 'drop'))
        .reduce((sum, m) => sum + m.amountCents, 0)
    : 0;

  const shiftExpenses = activeShift
    ? expenses
        .filter(e => e.shiftId === activeShift.id)
        .reduce((sum, e) => sum + e.amountCents, 0)
    : 0;

  const expectedDrawerCashCents = activeShift
    ? activeShift.openingCashCents + shiftCashSales + shiftCashIn - shiftCashOut - shiftExpenses
    : 0;

  // Open Shift
  const handleOpenShift = async () => {
    const floatPHP = parseFloat(openingFloatInput);
    if (isNaN(floatPHP) || floatPHP < 0) {
      alert('Please enter a valid opening float.');
      return;
    }
    try {
      await dataService.openShift(parsePHPAmountToCents(floatPHP), openingNotes.trim() || undefined);
      setIsOpenShiftModalOpen(false);
      onRefreshData();
    } catch (err) {
      alert('Failed to open shift: ' + (err as Error).message);
    }
  };

  // Cash In / Cash Out
  const handleRecordCashMovement = async () => {
    const amountPHP = parseFloat(movementAmountInput);
    if (isNaN(amountPHP) || amountPHP <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    if (!movementReason.trim()) {
      alert('Please provide a reason for the cash movement.');
      return;
    }

    try {
      await dataService.addCashMovement(movementType, parsePHPAmountToCents(amountPHP), movementReason.trim());
      setIsCashMovementModalOpen(false);
      setMovementAmountInput('');
      setMovementReason('');
      onRefreshData();
    } catch (err) {
      alert('Failed to record cash movement: ' + (err as Error).message);
    }
  };

  // Close Shift
  const handleCloseShift = async () => {
    const countedPHP = parseFloat(countedCashInput);
    if (isNaN(countedPHP) || countedPHP < 0) {
      alert('Please enter the counted cash.');
      return;
    }

    try {
      await dataService.closeShift(parsePHPAmountToCents(countedPHP), closingNotes.trim() || undefined);
      setIsCloseShiftModalOpen(false);
      setCountedCashInput('');
      setClosingNotes('');
      onRefreshData();
    } catch (err) {
      alert('Failed to close shift: ' + (err as Error).message);
    }
  };

  // Add User
  const handleAddUser = () => {
    if (!newFullName.trim() || !newUsername.trim()) {
      alert('Please fill out user name and username.');
      return;
    }
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      alert('PIN must be exactly 4 digits.');
      return;
    }

    db.addUser({
      username: newUsername.toLowerCase().trim(),
      fullName: newFullName.trim(),
      role: newRole,
      pinHash: newPin,
      status: 'active'
    });

    setIsUserModalOpen(false);
    setNewFullName('');
    setNewUsername('');
    setNewPin('');
    onRefreshData();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-c5-beige pb-4">
        <div>
          <h2 className="text-xl font-bold text-c5-charcoal">Staff Accounts & Shift Controls</h2>
          <p className="text-xs text-c5-charcoal-muted mt-0.5">
            Cash drawer floats, midway cash drops, end-of-shift reconciliation, and staff PINs
          </p>
        </div>

        <button
          onClick={onSwitchUser}
          className="px-4 py-2 rounded-xl border border-c5-beige bg-white hover:bg-c5-cream text-xs font-semibold text-c5-charcoal transition flex items-center gap-1.5 shadow-xs"
        >
          <KeyRound className="w-4 h-4 text-c5-espresso" />
          <span>Switch Active Cashier</span>
        </button>
      </div>

      {/* ACTIVE SHIFT SUMMARY CARD */}
      <div className="bg-white rounded-3xl p-6 border border-c5-beige shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-c5-beige/60 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                activeShift ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <div>
              <h3 className="font-bold text-base text-c5-charcoal">
                {activeShift ? `Active Shift: ${activeShift.userName}` : 'No Shift Currently Open'}
              </h3>
              <p className="text-xs text-c5-charcoal-muted mt-0.5">
                {activeShift
                  ? `Opened at ${new Date(activeShift.openedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`
                  : 'Start a shift with an initial opening float to ring up cash sales.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeShift ? (
              <>
                <button
                  onClick={() => setIsCashMovementModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-c5-cream border border-c5-beige hover:bg-c5-beige text-xs font-semibold text-c5-charcoal transition"
                >
                  Cash In / Out / Drop
                </button>
                <button
                  onClick={() => setIsCloseShiftModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition shadow-xs"
                >
                  Close Shift & Reconcile
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsOpenShiftModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-c5-espresso hover:bg-c5-espresso-dark text-c5-cream text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start New Shift (Open Float)</span>
              </button>
            )}
          </div>
        </div>

        {activeShift && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-c5-cream/40 border border-c5-beige">
              <span className="text-[10px] font-bold uppercase text-c5-charcoal-muted">
                Opening Float
              </span>
              <p className="text-lg font-black font-mono text-c5-charcoal mt-1">
                {formatPHP(activeShift.openingCashCents)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-c5-cream/40 border border-c5-beige">
              <span className="text-[10px] font-bold uppercase text-c5-charcoal-muted">
                Cash Sales
              </span>
              <p className="text-lg font-black font-mono text-emerald-700 mt-1">
                +{formatPHP(shiftCashSales)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-c5-cream/40 border border-c5-beige">
              <span className="text-[10px] font-bold uppercase text-c5-charcoal-muted">
                Cash In / Adds
              </span>
              <p className="text-lg font-black font-mono text-c5-charcoal mt-1">
                +{formatPHP(shiftCashIn)}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-c5-cream/40 border border-c5-beige">
              <span className="text-[10px] font-bold uppercase text-c5-charcoal-muted">
                Drops & Petty Cash
              </span>
              <p className="text-lg font-black font-mono text-rose-600 mt-1">
                -{formatPHP(shiftCashOut + shiftExpenses)}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1 p-3.5 rounded-2xl bg-c5-espresso text-c5-cream">
              <span className="text-[10px] font-bold uppercase text-c5-sage">
                Expected in Drawer
              </span>
              <p className="text-xl font-black font-mono text-white mt-1">
                {formatPHP(expectedDrawerCashCents)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* STAFF ACCOUNTS DIRECTORY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-wider text-c5-charcoal">
            Staff Members & Local PINs ({users.length})
          </h3>
          <button
            onClick={() => setIsUserModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-c5-espresso text-c5-cream text-xs font-bold hover:bg-c5-espresso-dark transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Account</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {users.map(u => (
            <div
              key={u.id}
              className="bg-white p-5 rounded-2xl border border-c5-beige shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-c5-cream text-c5-espresso font-bold text-sm flex items-center justify-center">
                  {u.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-c5-charcoal">{u.fullName}</h4>
                  <p className="text-[11px] text-c5-charcoal-muted capitalize">
                    @{u.username} • <span className="font-semibold text-c5-espresso">{u.role}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-c5-charcoal-muted uppercase block">PIN</span>
                <span className="font-mono font-bold text-xs bg-c5-cream px-2 py-0.5 rounded border border-c5-beige">
                  ••••
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OPEN SHIFT MODAL */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Open Cashier Shift</h3>
                <p className="text-xs text-c5-beige mt-0.5">Cashier: {currentUser.fullName}</p>
              </div>
              <button
                onClick={() => setIsOpenShiftModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Opening Cash Float (PHP) *
                </label>
                <input
                  type="number"
                  step="1"
                  value={openingFloatInput}
                  onChange={e => setOpeningFloatInput(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xl font-mono font-bold text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>

              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Shift Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Morning Shift, Full Float Verified"
                  value={openingNotes}
                  onChange={e => setOpeningNotes(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                onClick={() => setIsOpenShiftModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenShift}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Open Shift</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASH IN / OUT / DROP MODAL */}
      {isCashMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Cash Drawer Adjustment</h3>
                <p className="text-xs text-c5-beige mt-0.5">Shift: {activeShift?.userName}</p>
              </div>
              <button
                onClick={() => setIsCashMovementModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Movement Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'drop', label: 'Cash Drop (Safe)' },
                    { id: 'cash_in', label: 'Cash In (Float Add)' },
                    { id: 'cash_out', label: 'Cash Out (Payout)' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMovementType(t.id as any)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition ${
                        movementType === t.id
                          ? 'bg-c5-espresso text-c5-cream border-c5-espresso'
                          : 'border-c5-beige hover:bg-c5-cream text-c5-charcoal'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Amount (PHP) *
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="₱ e.g. 1000"
                  value={movementAmountInput}
                  onChange={e => setMovementAmountInput(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xl font-mono font-bold text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>

              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Reason / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mid-day cash drop to vault, coin change replenished"
                  value={movementReason}
                  onChange={e => setMovementReason(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                onClick={() => setIsCashMovementModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordCashMovement}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark"
              >
                Save Cash Movement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT & RECONCILIATION MODAL */}
      {isCloseShiftModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Close Shift & Reconcile Drawer</h3>
                <p className="text-xs text-c5-beige mt-0.5">Barista: {activeShift.userName}</p>
              </div>
              <button
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-c5-cream rounded-xl border border-c5-beige flex justify-between items-center">
                <span className="font-bold text-c5-charcoal-muted">System Expected Cash:</span>
                <span className="font-mono font-black text-base text-c5-charcoal">
                  {formatPHP(expectedDrawerCashCents)}
                </span>
              </div>

              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Physical Counted Cash in Drawer (PHP) *
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="₱ e.g. 5200"
                  value={countedCashInput}
                  onChange={e => setCountedCashInput(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xl font-mono font-bold text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>

              {countedCashInput && (
                <div
                  className={`p-3 rounded-xl border flex justify-between items-center ${
                    parsePHPAmountToCents(parseFloat(countedCashInput) || 0) - expectedDrawerCashCents >= 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  <span className="font-bold">Variance (Over / Short):</span>
                  <span className="font-mono font-black text-sm">
                    {formatPHP(
                      parsePHPAmountToCents(parseFloat(countedCashInput) || 0) - expectedDrawerCashCents
                    )}
                  </span>
                </div>
              )}

              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Closing Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. End of shift, drawer reconciled with no issues"
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                onClick={() => setIsCloseShiftModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseShift}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-700 text-white hover:bg-rose-800"
              >
                Finalize & Close Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STAFF USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">Add Staff Member</h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Juan dela Cruz"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                    Username *
                  </label>
                  <input
                    type="text"
                    placeholder="juan"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
                  />
                </div>
                <div>
                  <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                    Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as any)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  4-Digit Terminal PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 font-mono text-center tracking-widest text-base font-bold outline-hidden focus:border-c5-espresso"
                />
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark"
              >
                Create Staff Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
