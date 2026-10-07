import { CashMovement, CashierShift, Expense, InventoryItem, Purchase, Sale } from '../types';

/** YYYY-MM-DD in Asia/Manila */
export function manilaDateKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/**
 * Only completed, fully paid sales count. Voided, refunded and partially refunded
 * sales are excluded (the data model has no separate "cancelled"/"failed" status:
 * a transaction that fails never creates a sale row).
 */
export function isCountableSale(s: Sale): boolean {
  return s.paymentStatus === 'paid';
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** The open shift belonging to this user, not simply the first open shift in the system. */
export function findMyOpenShift(shifts: CashierShift[], userId: string): CashierShift | null {
  return shifts.find(s => s.status === 'open' && s.userId === userId) ?? null;
}

export interface CashierMetrics {
  todaySalesCents: number;
  todayTransactions: number;
  hasShift: boolean;
  shiftSalesCents: number | null;
  shiftTransactions: number | null;
  cashInDrawerCents: number | null;
  lowStockCount: number;
}

export function computeCashierMetrics(input: {
  sales: Sale[];
  shift: CashierShift | null;
  cashMovements: CashMovement[];
  expenses: Expense[];
  inventoryItems: InventoryItem[];
  now?: Date;
}): CashierMetrics {
  const todayKey = manilaDateKey(input.now ?? new Date());
  const paid = input.sales.filter(isCountableSale);
  const today = paid.filter(s => manilaDateKey(s.createdAt) === todayKey);
  const lowStockCount = input.inventoryItems.filter(i => i.currentStock <= i.minThreshold).length;

  const base = {
    todaySalesCents: sum(today.map(s => s.totalCents)),
    todayTransactions: today.length,
    lowStockCount
  };

  const shift = input.shift;
  if (!shift) {
    return { ...base, hasShift: false, shiftSalesCents: null, shiftTransactions: null, cashInDrawerCents: null };
  }

  const shiftSales = paid.filter(s => s.shiftId === shift.id);
  const cashSales = sum(shiftSales.filter(s => s.payment.method === 'cash').map(s => s.totalCents));
  const moves = input.cashMovements.filter(m => m.shiftId === shift.id);
  // Same formula the shift-close reconciliation uses, so the drawer figure matches it.
  const cashIn = sum(
    moves.filter(m => m.type === 'cash_in' && m.reason !== 'Shift Opening Cash Float').map(m => m.amountCents)
  );
  const cashOut = sum(moves.filter(m => m.type === 'cash_out' || m.type === 'drop').map(m => m.amountCents));
  const expenses = sum(input.expenses.filter(e => e.shiftId === shift.id).map(e => e.amountCents));

  return {
    ...base,
    hasShift: true,
    shiftSalesCents: sum(shiftSales.map(s => s.totalCents)),
    shiftTransactions: shiftSales.length,
    cashInDrawerCents: shift.openingCashCents + cashSales + cashIn - cashOut - expenses
  };
}

export interface BusinessMetrics {
  monthSalesCents: number;
  yearSalesCents: number;
  overallSalesCents: number;
  monthExpensesCents: number;
  monthPurchasesCents: number;
  /** Cash-basis estimate: month sales - month expenses - month received purchases. */
  monthEstProfitCents: number;
}

export function computeBusinessMetrics(input: {
  sales: Sale[];
  expenses: Expense[];
  purchases: Purchase[];
  now?: Date;
}): BusinessMetrics {
  const key = manilaDateKey(input.now ?? new Date());
  const ym = key.slice(0, 7);
  const y = key.slice(0, 4);
  const paid = input.sales.filter(isCountableSale);

  const monthSales = sum(paid.filter(s => manilaDateKey(s.createdAt).startsWith(ym)).map(s => s.totalCents));
  const yearSales = sum(paid.filter(s => manilaDateKey(s.createdAt).startsWith(y)).map(s => s.totalCents));
  const overall = sum(paid.map(s => s.totalCents));
  const monthExpenses = sum(
    input.expenses.filter(e => manilaDateKey(e.spentAt).startsWith(ym)).map(e => e.amountCents)
  );
  const monthPurchases = sum(
    input.purchases
      .filter(p => p.status === 'received' && manilaDateKey(p.receivedAt || p.purchasedAt).startsWith(ym))
      .map(p => p.totalAmountCents)
  );

  return {
    monthSalesCents: monthSales,
    yearSalesCents: yearSales,
    overallSalesCents: overall,
    monthExpensesCents: monthExpenses,
    monthPurchasesCents: monthPurchases,
    monthEstProfitCents: monthSales - monthExpenses - monthPurchases
  };
}
