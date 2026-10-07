import React, { useState, useMemo } from 'react';
import { Sale, Expense, CashierShift, ShopSettings, Category } from '../../types';
import { formatPHP } from '../../services/storage';

interface ReportsViewProps {
  sales: Sale[];
  expenses?: Expense[];
  shifts?: CashierShift[];
  activeShift?: CashierShift | null;
  categories?: Category[];
  settings?: ShopSettings;
}

type SalesPeriod = 'monthly' | 'yearly' | 'overall';

function manilaDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function isPaid(s: Sale): boolean {
  return s.paymentStatus === 'paid';
}

function summarize(list: Sale[]) {
  const totalCents = list.reduce((sum, s) => sum + s.totalCents, 0);
  const count = list.length;
  const avgCents = count > 0 ? Math.round(totalCents / count) : 0;
  return { totalCents, count, avgCents };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales
}) => {
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('monthly');

  const now = new Date();
  const manilaNow = manilaDateKey(now);
  const currentYear = Number(manilaNow.slice(0, 4));
  const currentMonth = Number(manilaNow.slice(5, 7)); // 1-12

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const paidSales = useMemo(() => sales.filter(isPaid), [sales]);

  // ── Monthly Breakdown & Summary ──────────────────────────────────────────
  const monthlySales = useMemo(() => {
    const ym = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return paidSales.filter(s => manilaDateKey(s.createdAt).startsWith(ym));
  }, [paidSales, selectedYear, selectedMonth]);

  const monthlySummary = useMemo(() => summarize(monthlySales), [monthlySales]);

  const dailyBreakdown = useMemo(() => {
    const map: Record<string, { date: string; count: number; totalCents: number }> = {};
    monthlySales.forEach(s => {
      const key = manilaDateKey(s.createdAt);
      if (!map[key]) map[key] = { date: key, count: 0, totalCents: 0 };
      map[key].count += 1;
      map[key].totalCents += s.totalCents;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlySales]);

  // ── Yearly Breakdown & Summary ───────────────────────────────────────────
  const yearlySales = useMemo(() => {
    return paidSales.filter(s => manilaDateKey(s.createdAt).startsWith(String(selectedYear)));
  }, [paidSales, selectedYear]);

  const yearlySummary = useMemo(() => summarize(yearlySales), [yearlySales]);

  const monthlyBreakdown = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: MONTH_NAMES[i],
      count: 0,
      totalCents: 0
    }));
    yearlySales.forEach(s => {
      const m = Number(manilaDateKey(s.createdAt).slice(5, 7));
      const b = buckets[m - 1];
      if (b) {
        b.count += 1;
        b.totalCents += s.totalCents;
      }
    });
    return buckets;
  }, [yearlySales]);

  // ── Overall Breakdown & Summary ──────────────────────────────────────────
  const overallSummary = useMemo(() => summarize(paidSales), [paidSales]);

  const yearlyBreakdown = useMemo(() => {
    const map: Record<number, { year: number; count: number; totalCents: number }> = {};
    paidSales.forEach(s => {
      const y = Number(manilaDateKey(s.createdAt).slice(0, 4));
      if (!map[y]) map[y] = { year: y, count: 0, totalCents: 0 };
      map[y].count += 1;
      map[y].totalCents += s.totalCents;
    });
    return Object.values(map).sort((a, b) => b.year - a.year);
  }, [paidSales]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentYear]);
    paidSales.forEach(s => years.add(Number(manilaDateKey(s.createdAt).slice(0, 4))));
    return Array.from(years).sort((a, b) => b - a);
  }, [paidSales, currentYear]);

  const maxBar = Math.max(
    ...(salesPeriod === 'monthly'
      ? dailyBreakdown.map(d => d.totalCents)
      : salesPeriod === 'yearly'
        ? monthlyBreakdown.map(d => d.totalCents)
        : yearlyBreakdown.map(d => d.totalCents)),
    1
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4 no-print">
        <div>
          <h1 className="text-xl font-bold text-[#292929]">Sales Reports</h1>
          <p className="text-xs text-[#7A736C] mt-0.5">
            Sales analytics, revenue trends, and period breakdowns · Asia/Manila · paid sales only
          </p>
        </div>
      </div>

      {/* ═══════════ SALES REPORT ═══════════ */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 no-print">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E8E2D9]">
            {(['monthly', 'yearly', 'overall'] as SalesPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setSalesPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                  salesPeriod === p
                    ? 'bg-[#3B2925] text-white'
                    : 'text-[#6E6862] hover:text-[#292929]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {salesPeriod === 'monthly' && (
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-white border border-[#E8E2D9] rounded-lg px-2.5 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925] cursor-pointer"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-[#E8E2D9] rounded-lg px-2.5 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925] cursor-pointer"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {salesPeriod === 'yearly' && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-[#E8E2D9] rounded-lg px-2.5 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925] cursor-pointer"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
            <span className="text-[10px] uppercase font-bold text-[#9B948C] tracking-wide">
              {salesPeriod === 'monthly'
                ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} Revenue`
                : salesPeriod === 'yearly'
                  ? `${selectedYear} Total Revenue`
                  : 'All-Time Total Revenue'}
            </span>
            <h3 className="text-2xl font-bold font-mono text-[#292929] mt-1 tabular-nums">
              {formatPHP(
                salesPeriod === 'monthly'
                  ? monthlySummary.totalCents
                  : salesPeriod === 'yearly'
                    ? yearlySummary.totalCents
                    : overallSummary.totalCents
              )}
            </h3>
            <p className="text-[11px] text-[#C4B9AA] mt-0.5">Paid transactions only</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
            <span className="text-[10px] uppercase font-bold text-[#9B948C] tracking-wide">
              Transactions
            </span>
            <h3 className="text-2xl font-bold font-mono text-[#292929] mt-1 tabular-nums">
              {salesPeriod === 'monthly'
                ? monthlySummary.count
                : salesPeriod === 'yearly'
                  ? yearlySummary.count
                  : overallSummary.count}
            </h3>
            <p className="text-[11px] text-[#C4B9AA] mt-0.5">Completed tickets</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
            <span className="text-[10px] uppercase font-bold text-[#9B948C] tracking-wide">
              Average Ticket
            </span>
            <h3 className="text-2xl font-bold font-mono text-[#292929] mt-1 tabular-nums">
              {formatPHP(
                salesPeriod === 'monthly'
                  ? monthlySummary.avgCents
                  : salesPeriod === 'yearly'
                    ? yearlySummary.avgCents
                    : overallSummary.avgCents
              )}
            </h3>
            <p className="text-[11px] text-[#C4B9AA] mt-0.5">Per paid customer order</p>
          </div>
        </div>

        {/* Breakdown chart / list */}
        <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
          <div className="px-5 py-4 border-b border-[#E8E2D9] flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide">
              {salesPeriod === 'monthly'
                ? 'Daily breakdown'
                : salesPeriod === 'yearly'
                  ? 'Monthly breakdown'
                  : 'Yearly breakdown'}
            </h3>
            <span className="text-[10px] text-[#C4B9AA]">Asia/Manila</span>
          </div>

          {salesPeriod === 'monthly' && (
            dailyBreakdown.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#C4B9AA]">
                No paid sales in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </div>
            ) : (
              <div className="divide-y divide-[#F7F3EB]">
                {dailyBreakdown.map(row => (
                  <div key={row.date} className="px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-4 overflow-hidden">
                    <span className="text-xs font-mono text-[#6E6862] w-20 sm:w-24 shrink-0 tabular-nums">
                      {row.date}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[#F7F3EB] overflow-hidden min-w-[2rem]">
                      <div
                        className="h-full rounded-full bg-[#3B2925] transition-all"
                        style={{ width: `${Math.max(4, (row.totalCents / maxBar) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#9B948C] w-10 sm:w-12 text-right tabular-nums shrink-0">
                      {row.count} tx
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#292929] w-20 sm:w-24 text-right tabular-nums shrink-0">
                      {formatPHP(row.totalCents)}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}

          {salesPeriod === 'yearly' && (
            <div className="divide-y divide-[#F7F3EB]">
              {monthlyBreakdown.every(m => m.count === 0) ? (
                <div className="py-12 text-center text-xs text-[#C4B9AA]">
                  No paid sales in {selectedYear}
                </div>
              ) : (
                monthlyBreakdown.map(row => (
                  <div key={row.month} className="px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-4 overflow-hidden">
                    <span className="text-xs font-medium text-[#292929] w-20 sm:w-24 shrink-0 truncate">
                      {row.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[#F7F3EB] overflow-hidden min-w-[2rem]">
                      <div
                        className="h-full rounded-full bg-[#3B2925] transition-all"
                        style={{
                          width: row.totalCents
                            ? `${Math.max(4, (row.totalCents / maxBar) * 100)}%`
                            : '0%'
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-[#9B948C] w-10 sm:w-12 text-right tabular-nums shrink-0">
                      {row.count} tx
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#292929] w-20 sm:w-24 text-right tabular-nums shrink-0">
                      {formatPHP(row.totalCents)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {salesPeriod === 'overall' && (
            yearlyBreakdown.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#C4B9AA]">
                No paid sales recorded yet
              </div>
            ) : (
              <div className="divide-y divide-[#F7F3EB]">
                {yearlyBreakdown.map(row => (
                  <div key={row.year} className="px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-4 overflow-hidden">
                    <span className="text-xs font-mono font-medium text-[#292929] w-16 sm:w-20 shrink-0 tabular-nums">
                      {row.year}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-[#F7F3EB] overflow-hidden min-w-[2rem]">
                      <div
                        className="h-full rounded-full bg-[#3B2925] transition-all"
                        style={{ width: `${Math.max(4, (row.totalCents / maxBar) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#9B948C] w-10 sm:w-12 text-right tabular-nums shrink-0">
                      {row.count} tx
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#292929] w-20 sm:w-24 text-right tabular-nums shrink-0">
                      {formatPHP(row.totalCents)}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
