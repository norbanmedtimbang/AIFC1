import React, { useState, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { Sale, Expense, CashierShift, ShopSettings, Category } from '../../types';
import { formatPHP } from '../../services/storage';

interface ReportsViewProps {
  sales: Sale[];
  expenses: Expense[];
  shifts: CashierShift[];
  activeShift: CashierShift | null;
  categories: Category[];
  settings: ShopSettings;
}

type MainTab = 'sales_report' | 'readings';
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
  sales,
  activeShift,
  settings
}) => {
  const [mainTab, setMainTab] = useState<MainTab>('sales_report');
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('monthly');
  const [reportType, setReportType] = useState<'x_reading' | 'z_reading'>('x_reading');

  const now = new Date();
  const manilaNow = manilaDateKey(now);
  const currentYear = Number(manilaNow.slice(0, 4));
  const currentMonth = Number(manilaNow.slice(5, 7)); // 1-12

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const paidSales = useMemo(() => sales.filter(isPaid), [sales]);

  // ── Sales Report data ──────────────────────────────────────────
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

  // ── X / Z Reading (existing logic, Manila-aware day filter) ──
  const todayStr = manilaNow;

  const relevantSales = useMemo(() => {
    if (reportType === 'x_reading') {
      if (activeShift) {
        return sales.filter(s => s.shiftId === activeShift.id);
      }
      return sales.filter(s => manilaDateKey(s.createdAt) === todayStr);
    }
    return sales.filter(s => manilaDateKey(s.createdAt) === todayStr);
  }, [reportType, activeShift, sales, todayStr]);

  const grossSalesCents = relevantSales
    .filter(isPaid)
    .reduce((sum, s) => sum + s.subtotalCents, 0);
  const discountCents = relevantSales
    .filter(isPaid)
    .reduce((sum, s) => sum + s.discountCents, 0);
  const netSalesCents = relevantSales
    .filter(isPaid)
    .reduce((sum, s) => sum + s.totalCents, 0);
  const taxCents = relevantSales
    .filter(isPaid)
    .reduce((sum, s) => sum + s.taxCents, 0);
  const refundedCount = relevantSales.filter(s => s.paymentStatus === 'refunded').length;
  const refundedAmountCents = relevantSales
    .filter(s => s.paymentStatus === 'refunded')
    .reduce((sum, s) => sum + s.totalCents, 0);

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalCents: number }> = {
      cash: { count: 0, totalCents: 0 },
      gcash: { count: 0, totalCents: 0 },
      maya: { count: 0, totalCents: 0 },
      card_pos: { count: 0, totalCents: 0 }
    };
    relevantSales.filter(isPaid).forEach(s => {
      const m = s.payment.method;
      if (map[m]) {
        map[m].count += 1;
        map[m].totalCents += s.totalCents;
      }
    });
    return map;
  }, [relevantSales]);

  const hourlyData = useMemo(() => {
    const hours: { hour: number; label: string; count: number; totalCents: number }[] = [];
    for (let h = 7; h <= 21; h++) {
      const label = `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
      hours.push({ hour: h, label, count: 0, totalCents: 0 });
    }
    relevantSales.filter(isPaid).forEach(s => {
      const h = Number(
        new Date(s.createdAt).toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
          hour: 'numeric',
          hour12: false
        })
      );
      const found = hours.find(item => item.hour === h);
      if (found) {
        found.count += 1;
        found.totalCents += s.totalCents;
      }
    });
    return hours;
  }, [relevantSales]);

  const maxHourSales = Math.max(...hourlyData.map(h => h.totalCents), 1);

  const handlePrintSlip = () => window.print();

  const maxBar = Math.max(
    ...(salesPeriod === 'monthly'
      ? dailyBreakdown.map(d => d.totalCents)
      : salesPeriod === 'yearly'
        ? monthlyBreakdown.map(d => d.totalCents)
        : yearlyBreakdown.map(d => d.totalCents)),
    1
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Main tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-[#292929]">Reports</h2>
          <p className="text-xs text-[#7A736C] mt-0.5">
            Sales analytics and POS X/Z readings · Asia/Manila · paid sales only
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#F7F3EB] p-1 rounded-xl border border-[#E8E2D9]">
          <button
            onClick={() => setMainTab('sales_report')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              mainTab === 'sales_report'
                ? 'bg-[#3B2925] text-white'
                : 'text-[#6E6862] hover:text-[#292929]'
            }`}
          >
            Sales Report
          </button>
          <button
            onClick={() => setMainTab('readings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              mainTab === 'readings'
                ? 'bg-[#3B2925] text-white'
                : 'text-[#6E6862] hover:text-[#292929]'
            }`}
          >
            X / Z Readings
          </button>
        </div>
      </div>

      {/* ═══════════ SALES REPORT ═══════════ */}
      {mainTab === 'sales_report' && (
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
          {(() => {
            const s =
              salesPeriod === 'monthly'
                ? monthlySummary
                : salesPeriod === 'yearly'
                  ? yearlySummary
                  : overallSummary;
            const scope =
              salesPeriod === 'monthly'
                ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`
                : salesPeriod === 'yearly'
                  ? `Year ${selectedYear}`
                  : 'All time';
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9]">
                  <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                    Total sales
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#292929] mt-2 tabular-nums tracking-tight">
                    {formatPHP(s.totalCents)}
                  </div>
                  <div className="text-[11px] text-[#C4B9AA] mt-1.5">{scope}</div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9]">
                  <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                    Transactions
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#292929] mt-2 tabular-nums tracking-tight">
                    {s.count}
                  </div>
                  <div className="text-[11px] text-[#C4B9AA] mt-1.5">Paid only · voids excluded</div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9]">
                  <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                    Average transaction
                  </div>
                  <div className="text-2xl font-bold font-mono text-[#292929] mt-2 tabular-nums tracking-tight">
                    {formatPHP(s.avgCents)}
                  </div>
                  <div className="text-[11px] text-[#C4B9AA] mt-1.5">Ticket average</div>
                </div>
              </div>
            );
          })()}

          {/* Breakdown table + simple bar */}
          <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F0EAE1] flex items-center justify-between">
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
                    <div key={row.date} className="px-5 py-3 flex items-center gap-4">
                      <span className="text-xs font-mono text-[#6E6862] w-24 shrink-0 tabular-nums">
                        {row.date}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[#F7F3EB] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#3B2925] transition-all"
                          style={{ width: `${Math.max(4, (row.totalCents / maxBar) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[#9B948C] w-12 text-right tabular-nums">
                        {row.count} tx
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#292929] w-24 text-right tabular-nums">
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
                    <div key={row.month} className="px-5 py-3 flex items-center gap-4">
                      <span className="text-xs font-medium text-[#292929] w-24 shrink-0">
                        {row.label}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[#F7F3EB] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#3B2925] transition-all"
                          style={{
                            width: row.totalCents
                              ? `${Math.max(4, (row.totalCents / maxBar) * 100)}%`
                              : '0%'
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-[#9B948C] w-12 text-right tabular-nums">
                        {row.count} tx
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#292929] w-24 text-right tabular-nums">
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
                    <div key={row.year} className="px-5 py-3 flex items-center gap-4">
                      <span className="text-xs font-mono font-medium text-[#292929] w-16 shrink-0 tabular-nums">
                        {row.year}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-[#F7F3EB] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#3B2925] transition-all"
                          style={{ width: `${Math.max(4, (row.totalCents / maxBar) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-[#9B948C] w-12 text-right tabular-nums">
                        {row.count} tx
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#292929] w-24 text-right tabular-nums">
                        {formatPHP(row.totalCents)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ═══════════ X / Z READINGS ═══════════ */}
      {mainTab === 'readings' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-1 bg-[#F7F3EB] p-1 rounded-xl border border-[#E8E2D9]">
              <button
                onClick={() => setReportType('x_reading')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  reportType === 'x_reading'
                    ? 'bg-[#3B2925] text-white'
                    : 'text-[#6E6862] hover:text-[#292929]'
                }`}
              >
                X-Reading (Current Shift)
              </button>
              <button
                onClick={() => setReportType('z_reading')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  reportType === 'z_reading'
                    ? 'bg-[#3B2925] text-white'
                    : 'text-[#6E6862] hover:text-[#292929]'
                }`}
              >
                Z-Reading (Full Day)
              </button>
            </div>

            <button
              onClick={handlePrintSlip}
              className="px-4 py-2 rounded-xl bg-[#3B2925] text-white hover:bg-[#2C1E1A] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Reading Slip</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E2D9]">
              <span className="text-[10px] uppercase font-bold text-[#9B948C]">Gross Sales</span>
              <h3 className="text-2xl font-bold font-mono text-[#292929] mt-1 tabular-nums">
                {formatPHP(grossSalesCents)}
              </h3>
              <p className="text-[11px] text-[#C4B9AA] mt-0.5">Before discounts & refunds</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E8E2D9]">
              <span className="text-[10px] uppercase font-bold text-[#9B948C]">Discounts</span>
              <h3 className="text-2xl font-bold font-mono text-[#A25035] mt-1 tabular-nums">
                −{formatPHP(discountCents)}
              </h3>
              <p className="text-[11px] text-[#C4B9AA] mt-0.5">Senior, PWD, staff</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E8E2D9]">
              <span className="text-[10px] uppercase font-bold text-[#9B948C]">Net Collected</span>
              <h3 className="text-2xl font-bold font-mono text-[#292929] mt-1 tabular-nums">
                {formatPHP(netSalesCents)}
              </h3>
              <p className="text-[11px] text-[#C4B9AA] mt-0.5">VAT portion: {formatPHP(taxCents)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E8E2D9]">
              <span className="text-[10px] uppercase font-bold text-[#9B948C]">Paid Tickets</span>
              <h3 className="text-2xl font-bold font-mono text-[#292929] mt-1 tabular-nums">
                {relevantSales.filter(isPaid).length}
              </h3>
              <p className="text-[11px] text-[#A25035] mt-0.5">
                {refundedCount > 0
                  ? `${refundedCount} refund (${formatPHP(refundedAmountCents)})`
                  : '0 refunds'}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#E8E2D9] space-y-4 no-print">
            <h4 className="text-xs font-bold text-[#292929] uppercase tracking-wider">
              Hourly Sales Velocity (7:00 AM — 9:00 PM)
            </h4>
            <div className="h-40 flex items-end gap-2 pt-6">
              {hourlyData.map(h => {
                const heightPct = Math.max(4, Math.round((h.totalCents / maxHourSales) * 100));
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className="w-full bg-[#F7F3EB] border border-[#E8E2D9] rounded-t-lg transition-all group-hover:bg-[#3B2925] group-hover:border-[#3B2925] flex items-end justify-center"
                      style={{ height: `${heightPct}%` }}
                    >
                      {h.count > 0 && (
                        <span className="text-[9px] font-mono font-bold text-[#3B2925] group-hover:text-white pb-1">
                          {h.count}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-[#9B948C] font-mono">{h.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Printable slip */}
          <div className="bg-white p-6 rounded-2xl border border-[#E8E2D9] flex justify-center">
            <div
              id="printable-receipt"
              className="w-[320px] bg-[#faf9f6] p-6 rounded-lg border border-dashed border-gray-400 font-mono text-[11px] leading-tight text-gray-900 select-text"
            >
              <div className="text-center pb-3 border-b border-dashed border-gray-400">
                <h3 className="font-extrabold text-sm tracking-wider">{settings.storeName}</h3>
                <p className="text-[10px] text-gray-600 uppercase mt-0.5">{settings.tagline}</p>
                <p className="text-[10px] text-gray-600 mt-1">{settings.branchName}</p>
                <p className="text-[9px] text-gray-500">{settings.tinNumber}</p>
                <div className="mt-2 py-1 bg-gray-200 font-bold text-xs uppercase tracking-widest text-center">
                  *** {reportType.replace('_', ' ').toUpperCase()} ***
                </div>
              </div>

              <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>REPORT DATE:</span>
                  <span>
                    {new Date().toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>PRINTED AT:</span>
                  <span>
                    {new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span>{activeShift ? activeShift.userName : 'SYSTEM'}</span>
                </div>
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span>GROSS SALES:</span>
                  <span className="font-bold">{formatPHP(grossSalesCents)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>LESS DISCOUNTS:</span>
                  <span>-{formatPHP(discountCents)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>LESS REFUNDS:</span>
                  <span>-{formatPHP(refundedAmountCents)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-300">
                  <span>NET SALES:</span>
                  <span>{formatPHP(netSalesCents)}</span>
                </div>
              </div>

              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
                <div className="font-bold text-[9px] uppercase pb-0.5 text-gray-600">
                  PAYMENT BREAKDOWN
                </div>
                <div className="flex justify-between">
                  <span>CASH ({paymentBreakdown.cash.count}):</span>
                  <span>{formatPHP(paymentBreakdown.cash.totalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GCASH ({paymentBreakdown.gcash.count}):</span>
                  <span>{formatPHP(paymentBreakdown.gcash.totalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>MAYA ({paymentBreakdown.maya.count}):</span>
                  <span>{formatPHP(paymentBreakdown.maya.totalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CARD ({paymentBreakdown.card_pos.count}):</span>
                  <span>{formatPHP(paymentBreakdown.card_pos.totalCents)}</span>
                </div>
              </div>

              <div className="text-center pt-3 text-[9px] text-gray-500">
                C5ISR POS · Asia/Manila · Paid sales only
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
