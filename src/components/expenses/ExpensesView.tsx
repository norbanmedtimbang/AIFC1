import React, { useState } from 'react';
import {
  Plus,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Expense, ExpenseCategory, CashierShift, User } from '../../types';
import { formatPHP, parsePHPAmountToCents } from '../../services/storage';
import { dataService } from '../../services/dataService';

interface ExpensesViewProps {
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  activeShift: CashierShift | null;
  currentUser: User;
  onRefreshData: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  expenseCategories,
  activeShift,
  currentUser,
  onRefreshData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(expenseCategories[0]?.id || '');
  const [amountInput, setAmountInput] = useState('');
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpenses = expenses.filter(e => e.spentAt.startsWith(todayStr));
  const totalExpensesTodayCents = todayExpenses.reduce((sum, e) => sum + e.amountCents, 0);

  const handleOpenModal = () => {
    setModalError(null);
    setAmountInput('');
    setPayee('');
    setDescription('');
    setReceiptRef('');
    setSelectedCategoryId(expenseCategories[0]?.id || '');
    setIsModalOpen(true);
  };

  const handleAddExpense = async () => {
    setModalError(null);
    if (isSubmitting) return;

    const amountPHP = parseFloat(amountInput);
    if (isNaN(amountPHP) || amountPHP <= 0) {
      setModalError('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!description.trim() || !payee.trim()) {
      setModalError('Please provide both a payee and description.');
      return;
    }
    if (!selectedCategoryId) {
      setModalError('Please select an expense category.');
      return;
    }

    const cat = expenseCategories.find(c => c.id === selectedCategoryId);
    if (!cat) {
      setModalError('Selected expense category is invalid.');
      return;
    }

    const amountCents = parsePHPAmountToCents(amountPHP);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      setModalError('Amount could not be converted to valid centavos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.recordExpense({
        categoryId: selectedCategoryId,
        categoryName: cat.name,
        shiftId: activeShift ? activeShift.id : undefined,
        userId: currentUser.id,
        userName: currentUser.fullName,
        amountCents,
        payee: payee.trim(),
        description: description.trim(),
        receiptReference: receiptRef.trim() || undefined
      });

      setIsModalOpen(false);
      setAmountInput('');
      setPayee('');
      setDescription('');
      setReceiptRef('');
      onRefreshData();
    } catch (err) {
      setModalError((err as Error).message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-6xl mx-auto overflow-y-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#E8E2D9] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#292929]">Store Expenses</h1>
          <p className="text-xs text-[#7A736C] mt-0.5">
            Petty cash disbursements, dairy runs, and store operating expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="text-left sm:text-right">
            <span className="text-xs text-[#7A736C]">Today's Total: </span>
            <span className="text-sm font-bold font-mono text-[#A25035]">
              {formatPHP(totalExpensesTodayCents)}
            </span>
          </div>
          <button
            onClick={handleOpenModal}
            className="px-3.5 py-2 rounded-xl bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table with horizontal scroll container */}
      <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-[#FBF9F5] border-b border-[#E8E2D9] text-[#7A736C]">
              <tr>
                <th className="py-2.5 px-4 font-medium">Date & Time</th>
                <th className="py-2.5 px-4 font-medium">Payee</th>
                <th className="py-2.5 px-4 font-medium">Category</th>
                <th className="py-2.5 px-4 font-medium">Description</th>
                <th className="py-2.5 px-4 font-medium">Receipt / Ref</th>
                <th className="py-2.5 px-4 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F7F3EB]">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#9B948C]">
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-[#FAF7F2] transition">
                    <td className="py-2.5 px-4 text-[#7A736C] whitespace-nowrap">
                      {new Date(exp.spentAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric'
                      })}{' '}
                      {new Date(exp.spentAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#292929]">{exp.payee}</td>
                    <td className="py-2.5 px-4 text-[#6E6862]">
                      {exp.categoryName}
                    </td>
                    <td className="py-2.5 px-4 text-[#292929]">{exp.description}</td>
                    <td className="py-2.5 px-4 font-mono text-[#7A736C]">
                      {exp.receiptReference || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-[#292929] whitespace-nowrap">
                      {formatPHP(exp.amountCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#292929]">Record Store Expense</h3>
                <p className="text-xs text-[#7A736C] mt-0.5">
                  Disburse petty cash or log counter run
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Expense Amount (₱) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 font-mono text-base font-medium text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                >
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Paid To / Vendor *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Puregold Grocery, Ice Delivery"
                  value={payee}
                  onChange={e => setPayee(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Description / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5 bags of tube ice for afternoon shift"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Receipt # / Official Receipt Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. OR-84920"
                  value={receiptRef}
                  onChange={e => setReceiptRef(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs font-mono text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>
            </div>

            <div className="p-4 bg-[#FBF9F5] border-t border-[#E8E2D9] flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Expense</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
