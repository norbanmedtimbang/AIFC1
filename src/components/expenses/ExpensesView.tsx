import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  DollarSign,
  Receipt,
  Tag,
  Check,
  Calendar
} from 'lucide-react';
import { Expense, ExpenseCategory, CashierShift } from '../../types';
import { db, formatPHP, parsePHPAmountToCents } from '../../services/storage';

interface ExpensesViewProps {
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
  activeShift: CashierShift | null;
  onRefreshData: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  expenseCategories,
  activeShift,
  onRefreshData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(expenseCategories[0]?.id || '');
  const [amountInput, setAmountInput] = useState('');
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [receiptRef, setReceiptRef] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpenses = expenses.filter(e => e.spentAt.startsWith(todayStr));
  const totalExpensesTodayCents = todayExpenses.reduce((sum, e) => sum + e.amountCents, 0);

  const handleAddExpense = () => {
    const amountPHP = parseFloat(amountInput);
    if (isNaN(amountPHP) || amountPHP <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }
    if (!description.trim() || !payee.trim()) {
      alert('Please provide a payee and description.');
      return;
    }

    const cat = expenseCategories.find(c => c.id === selectedCategoryId);

    db.addExpense({
      categoryId: selectedCategoryId,
      categoryName: cat?.name || 'Store Operations',
      amountCents: parsePHPAmountToCents(amountPHP),
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
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-c5-beige pb-4">
        <div>
          <h2 className="text-xl font-bold text-c5-charcoal">Store Expenses & Petty Cash</h2>
          <p className="text-xs text-c5-charcoal-muted mt-0.5">
            Log daily ice runs, emergency milk, equipment maintenance, and barista petty cash
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-c5-charcoal-muted">
              Today's Expenses
            </span>
            <p className="text-base font-black font-mono text-rose-700">
              {formatPHP(totalExpensesTodayCents)}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-c5-beige overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-c5-cream/60 border-b border-c5-beige text-c5-charcoal-muted uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Payee / Vendor</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Receipt / Ref</th>
              <th className="py-3 px-4">Logged By</th>
              <th className="py-3 px-4 text-right">Amount (PHP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-c5-beige/60">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-c5-charcoal-muted">
                  No expenses recorded yet. Click "Record Expense" to disburse petty cash.
                </td>
              </tr>
            ) : (
              expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-c5-cream/20 transition">
                  <td className="py-3 px-4 text-c5-charcoal-muted">
                    {new Date(exp.spentAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 font-bold text-c5-charcoal">{exp.payee}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-c5-cream border border-c5-beige text-c5-charcoal font-medium">
                      {exp.categoryName}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-c5-charcoal">{exp.description}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-c5-charcoal-muted">
                    {exp.receiptReference || '—'}
                  </td>
                  <td className="py-3 px-4 text-c5-charcoal-muted">{exp.userName}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                    {formatPHP(exp.amountCents)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Record Petty Cash Disbursement</h3>
                <p className="text-xs text-c5-beige mt-0.5">
                  Logged under active shift {activeShift?.userName ? `(${activeShift.userName})` : ''}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Amount (PHP) *
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="₱ e.g. 250"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-base font-mono font-bold text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>

              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Expense Category *
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={e => setSelectedCategoryId(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                >
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                    Payee / Recipient *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7-Eleven, Ice Dealer"
                    value={payee}
                    onChange={e => setPayee(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                  />
                </div>
                <div>
                  <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                    Receipt / OR #
                  </label>
                  <input
                    type="text"
                    placeholder="OR-59102"
                    value={receiptRef}
                    onChange={e => setReceiptRef(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs font-mono text-c5-charcoal outline-hidden focus:border-c5-espresso"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Description / Purpose *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3 bags of tube ice for rush hour, sponge & sanitizer"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddExpense}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Disbursement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
