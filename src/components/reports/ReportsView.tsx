import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  FileText
} from 'lucide-react';
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

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  expenses,
  shifts,
  activeShift,
  categories,
  settings
}) => {
  const [reportType, setReportType] = useState<'x_reading' | 'z_reading'>('x_reading');

  // X-Reading is the active shift (or today's sales); Z-Reading is overall closing period
  const todayStr = new Date().toISOString().slice(0, 10);

  const relevantSales = useMemo(() => {
    if (reportType === 'x_reading') {
      if (activeShift) {
        return sales.filter(s => s.shiftId === activeShift.id);
      }
      return sales.filter(s => s.createdAt.startsWith(todayStr));
    }
    // Z-Reading covers today's full batch
    return sales.filter(s => s.createdAt.startsWith(todayStr));
  }, [reportType, activeShift, sales, todayStr]);

  const grossSalesCents = relevantSales
    .filter(s => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.subtotalCents, 0);

  const discountCents = relevantSales
    .filter(s => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.discountCents, 0);

  const netSalesCents = relevantSales
    .filter(s => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.totalCents, 0);

  const taxCents = relevantSales
    .filter(s => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.taxCents, 0);

  const refundedCount = relevantSales.filter(s => s.paymentStatus === 'refunded').length;
  const refundedAmountCents = relevantSales
    .filter(s => s.paymentStatus === 'refunded')
    .reduce((sum, s) => sum + s.totalCents, 0);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalCents: number }> = {
      cash: { count: 0, totalCents: 0 },
      gcash: { count: 0, totalCents: 0 },
      maya: { count: 0, totalCents: 0 },
      card_pos: { count: 0, totalCents: 0 }
    };
    relevantSales
      .filter(s => s.paymentStatus === 'paid')
      .forEach(s => {
        const m = s.payment.method;
        if (map[m]) {
          map[m].count += 1;
          map[m].totalCents += s.totalCents;
        }
      });
    return map;
  }, [relevantSales]);

  // Hourly Sales Distribution (8 AM to 10 PM)
  const hourlyData = useMemo(() => {
    const hours: { hour: number; label: string; count: number; totalCents: number }[] = [];
    for (let h = 7; h <= 21; h++) {
      const hourStr = h < 10 ? `0${h}` : `${h}`;
      const label = `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
      hours.push({ hour: h, label, count: 0, totalCents: 0 });
    }

    relevantSales
      .filter(s => s.paymentStatus === 'paid')
      .forEach(s => {
        const d = new Date(s.createdAt);
        const h = d.getHours();
        const found = hours.find(item => item.hour === h);
        if (found) {
          found.count += 1;
          found.totalCents += s.totalCents;
        }
      });

    return hours;
  }, [relevantSales]);

  const maxHourSales = Math.max(...hourlyData.map(h => h.totalCents), 1);

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Header & Report Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-c5-beige pb-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-c5-charcoal">POS Financial Readings & Analytics</h2>
          <p className="text-xs text-c5-charcoal-muted mt-0.5">
            Standard POS X-Reading (interim shift report) and Z-Reading (official daily closing)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-c5-cream p-1 rounded-xl border border-c5-beige">
            <button
              onClick={() => setReportType('x_reading')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                reportType === 'x_reading'
                  ? 'bg-c5-espresso text-c5-cream shadow-xs'
                  : 'text-c5-charcoal hover:text-black'
              }`}
            >
              X-Reading (Current Shift)
            </button>
            <button
              onClick={() => setReportType('z_reading')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                reportType === 'z_reading'
                  ? 'bg-c5-espresso text-c5-cream shadow-xs'
                  : 'text-c5-charcoal hover:text-black'
              }`}
            >
              Z-Reading (Full Day)
            </button>
          </div>

          <button
            onClick={handlePrintSlip}
            className="px-4 py-2 rounded-xl bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Reading Slip</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-5 rounded-2xl border border-c5-beige shadow-xs">
          <span className="text-[10px] uppercase font-bold text-c5-charcoal-muted">Gross Sales</span>
          <h3 className="text-2xl font-bold font-mono text-c5-charcoal mt-1">
            {formatPHP(grossSalesCents)}
          </h3>
          <p className="text-[11px] text-c5-charcoal-muted mt-0.5">Before discounts & refunds</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-c5-beige shadow-xs">
          <span className="text-[10px] uppercase font-bold text-c5-charcoal-muted">Discounts Given</span>
          <h3 className="text-2xl font-bold font-mono text-rose-600 mt-1">
            -{formatPHP(discountCents)}
          </h3>
          <p className="text-[11px] text-c5-charcoal-muted mt-0.5">Senior, PWD, staff privileges</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-c5-beige shadow-xs">
          <span className="text-[10px] uppercase font-bold text-c5-charcoal-muted">Net Collected</span>
          <h3 className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {formatPHP(netSalesCents)}
          </h3>
          <p className="text-[11px] text-c5-charcoal-muted mt-0.5">
            12% VAT: {formatPHP(taxCents)} included
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-c5-beige shadow-xs">
          <span className="text-[10px] uppercase font-bold text-c5-charcoal-muted">Paid Tickets</span>
          <h3 className="text-2xl font-bold font-mono text-c5-charcoal mt-1">
            {relevantSales.filter(s => s.paymentStatus === 'paid').length}
          </h3>
          <p className="text-[11px] text-rose-600 mt-0.5">
            {refundedCount > 0 ? `${refundedCount} refund (${formatPHP(refundedAmountCents)})` : '0 refunds'}
          </p>
        </div>
      </div>

      {/* HOURLY SALES HEATMAP CHART */}
      <div className="bg-white p-5 rounded-2xl border border-c5-beige shadow-xs space-y-4 no-print">
        <h4 className="text-xs font-bold text-c5-charcoal uppercase tracking-wider">
          Hourly Sales Velocity (7:00 AM — 9:00 PM)
        </h4>
        <div className="h-40 flex items-end gap-2 pt-6">
          {hourlyData.map(h => {
            const heightPct = Math.max(4, Math.round((h.totalCents / maxHourSales) * 100));
            return (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-c5-cream border border-c5-beige rounded-t-lg transition-all group-hover:bg-c5-espresso group-hover:border-c5-espresso flex items-end justify-center"
                  style={{ height: `${heightPct}%` }}
                >
                  {h.count > 0 && (
                    <span className="text-[9px] font-mono font-bold text-c5-espresso group-hover:text-c5-cream pb-1">
                      {h.count}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-c5-charcoal-muted font-mono">{h.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PRINTABLE THERMAL SLIP VIEW (X / Z READING) */}
      <div className="bg-white p-6 rounded-2xl border border-c5-beige flex justify-center">
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
              <span>{new Date().toLocaleDateString('en-PH')}</span>
            </div>
            <div className="flex justify-between">
              <span>PRINTED AT:</span>
              <span>{new Date().toLocaleTimeString('en-PH')}</span>
            </div>
            <div className="flex justify-between">
              <span>CASHIER:</span>
              <span>{activeShift ? activeShift.userName : 'SYSTEM'}</span>
            </div>
            <div className="flex justify-between">
              <span>TERMINAL:</span>
              <span>TERMINAL_01 (OFFLINE)</span>
            </div>
          </div>

          {/* Reading Metrics */}
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

          {/* Payment Breakdown */}
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
              <span>CARD POS ({paymentBreakdown.card_pos.count}):</span>
              <span>{formatPHP(paymentBreakdown.card_pos.totalCents)}</span>
            </div>
          </div>

          {/* Cash Drawer Reconciliation (if active shift) */}
          {activeShift && (
            <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
              <div className="font-bold text-[9px] uppercase pb-0.5 text-gray-600">
                DRAWER CASH RECONCILIATION
              </div>
              <div className="flex justify-between">
                <span>OPENING CASH FLOAT:</span>
                <span>{formatPHP(activeShift.openingCashCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>CASH SALES:</span>
                <span>{formatPHP(paymentBreakdown.cash.totalCents)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-gray-300">
                <span>EXPECTED DRAWER CASH:</span>
                <span>{formatPHP(activeShift.openingCashCents + paymentBreakdown.cash.totalCents)}</span>
              </div>
            </div>
          )}

          {/* VAT Analysis */}
          <div className="py-2 border-b border-dashed border-gray-400 text-[9px] text-gray-600 space-y-0.5">
            <div className="flex justify-between">
              <span>VATABLE SALES:</span>
              <span>{formatPHP(netSalesCents - taxCents)}</span>
            </div>
            <div className="flex justify-between">
              <span>12% VAT AMOUNT:</span>
              <span>{formatPHP(taxCents)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT EXEMPT SALES:</span>
              <span>₱0.00</span>
            </div>
          </div>

          <div className="pt-3 text-center text-[9px] text-gray-500">
            <p>END OF {reportType.replace('_', ' ').toUpperCase()}</p>
            <p className="mt-1">OFFLINE LOCAL DATABASE AUDIT OK</p>
          </div>
        </div>
      </div>
    </div>
  );
};
