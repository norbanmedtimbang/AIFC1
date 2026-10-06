import React, { useMemo } from 'react';
import { ArrowRight, Coffee } from 'lucide-react';
import { Sale, InventoryItem, CashierShift } from '../../types';
import { formatPHP } from '../../services/storage';

interface DashboardViewProps {
  sales: Sale[];
  inventoryItems: InventoryItem[];
  activeShift: CashierShift | null;
  onNavigateToPOS: () => void;
  onNavigateToInventory: () => void;
  onNavigateToStaff: () => void;
  onNavigateToMenu?: () => void;
}

/** YYYY-MM-DD in Asia/Manila */
function manilaDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/** YYYY-MM in Asia/Manila */
function manilaYearMonth(isoOrDate: string | Date): string {
  return manilaDateKey(isoOrDate).slice(0, 7);
}

/** YYYY in Asia/Manila */
function manilaYear(isoOrDate: string | Date): string {
  return manilaDateKey(isoOrDate).slice(0, 4);
}

function isCountableSale(s: Sale): boolean {
  // Exclude voided, refunded, partially_refunded — only completed paid sales
  return s.paymentStatus === 'paid';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  inventoryItems,
  onNavigateToPOS,
  onNavigateToInventory
}) => {
  const now = new Date();
  const currentHour = Number(
    now.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false })
  );
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const todayKey = manilaDateKey(now);
  const monthKey = manilaYearMonth(now);
  const yearKey = manilaYear(now);

  const paidSales = useMemo(() => sales.filter(isCountableSale), [sales]);

  const todayPaid = useMemo(
    () => paidSales.filter(s => manilaDateKey(s.createdAt) === todayKey),
    [paidSales, todayKey]
  );

  const monthPaid = useMemo(
    () => paidSales.filter(s => manilaYearMonth(s.createdAt) === monthKey),
    [paidSales, monthKey]
  );

  const yearPaid = useMemo(
    () => paidSales.filter(s => manilaYear(s.createdAt) === yearKey),
    [paidSales, yearKey]
  );

  const todaySalesCents = useMemo(
    () => todayPaid.reduce((sum, s) => sum + s.totalCents, 0),
    [todayPaid]
  );
  const todayTxCount = todayPaid.length;

  const monthSalesCents = useMemo(
    () => monthPaid.reduce((sum, s) => sum + s.totalCents, 0),
    [monthPaid]
  );

  const yearSalesCents = useMemo(
    () => yearPaid.reduce((sum, s) => sum + s.totalCents, 0),
    [yearPaid]
  );

  const overallSalesCents = useMemo(
    () => paidSales.reduce((sum, s) => sum + s.totalCents, 0),
    [paidSales]
  );

  const lowStockItems = useMemo(
    () => inventoryItems.filter(item => item.currentStock <= item.minThreshold),
    [inventoryItems]
  );

  const topSellingItems = useMemo(() => {
    const itemMap: Record<string, { name: string; qty: number; totalCents: number }> = {};
    todayPaid.forEach(s => {
      s.items.forEach(it => {
        if (!itemMap[it.productNameSnapshot]) {
          itemMap[it.productNameSnapshot] = {
            name: it.productNameSnapshot,
            qty: 0,
            totalCents: 0
          };
        }
        itemMap[it.productNameSnapshot].qty += it.quantity;
        itemMap[it.productNameSnapshot].totalCents += it.subtotalCents;
      });
    });
    return Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [todayPaid]);

  const recentSales = useMemo(() => sales.slice(0, 6), [sales]);

  const monthLabel = now.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.65rem] font-bold tracking-tight text-[#292929] leading-tight">
            {greeting}
          </h1>
          <p className="text-xs text-[#9B948C] font-normal mt-1.5">
            Here’s what’s happening at the shop today.
          </p>
        </div>

        <button
          onClick={onNavigateToPOS}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-semibold transition cursor-pointer shadow-[0_2px_8px_rgba(59,41,37,0.18)] active:scale-[0.98]"
        >
          <Coffee className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>Open Register</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-white/60" />
        </button>
      </div>

      {/* Sales KPIs — from live sales state (Supabase-backed) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
          <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
            Today’s Sales
          </div>
          <div className="text-[1.5rem] font-bold text-[#292929] mt-2.5 font-mono tracking-tight tabular-nums leading-none">
            {formatPHP(todaySalesCents)}
          </div>
          <div className="text-[11px] text-[#C4B9AA] mt-2">Asia/Manila · {todayKey}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
          <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
            Today’s Transactions
          </div>
          <div className="text-[1.5rem] font-bold text-[#292929] mt-2.5 font-mono tracking-tight tabular-nums leading-none">
            {todayTxCount}
          </div>
          <div className="text-[11px] text-[#C4B9AA] mt-2">Paid checkouts only</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
          <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
            This Month’s Sales
          </div>
          <div className="text-[1.5rem] font-bold text-[#292929] mt-2.5 font-mono tracking-tight tabular-nums leading-none">
            {formatPHP(monthSalesCents)}
          </div>
          <div className="text-[11px] text-[#C4B9AA] mt-2">{monthLabel}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
          <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
            This Year’s Sales
          </div>
          <div className="text-[1.5rem] font-bold text-[#292929] mt-2.5 font-mono tracking-tight tabular-nums leading-none">
            {formatPHP(yearSalesCents)}
          </div>
          <div className="text-[11px] text-[#C4B9AA] mt-2">Year {yearKey}</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] col-span-2 lg:col-span-1">
          <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
            Overall Sales
          </div>
          <div className="text-[1.5rem] font-bold text-[#292929] mt-2.5 font-mono tracking-tight tabular-nums leading-none">
            {formatPHP(overallSalesCents)}
          </div>
          <div className="text-[11px] text-[#C4B9AA] mt-2">
            {paidSales.length} lifetime paid · void/refund excluded
          </div>
        </div>
      </div>

      {/* Inventory status strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white border border-[#E8E2D9]">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#9B948C] font-medium uppercase tracking-wide">Inventory</span>
          {lowStockItems.length > 0 ? (
            <span className="font-semibold text-[#A25035]">{lowStockItems.length} low stock</span>
          ) : (
            <span className="font-semibold text-[#A8B5A0]">Healthy</span>
          )}
        </div>
        {lowStockItems.length > 0 && (
          <button
            onClick={onNavigateToInventory}
            className="text-xs font-medium text-[#3B2925] hover:underline cursor-pointer"
          >
            Review materials →
          </button>
        )}
      </div>

      <div className="h-px bg-[#E8E2D9]/80" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8E2D9] p-5 shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EAE1]">
            <h2 className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide">
              Top drinks
            </h2>
            <span className="text-[10px] font-medium text-[#C4B9AA] uppercase tracking-wide">Today</span>
          </div>

          <div className="divide-y divide-[#F7F3EB] mt-0.5">
            {topSellingItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#C4B9AA]">No drinks sold yet today</div>
            ) : (
              topSellingItems.map((item, idx) => (
                <div key={item.name} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-[11px] font-mono w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                        idx === 0 ? 'bg-[#3B2925] text-white' : 'bg-[#F7F3EB] text-[#9B948C]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-[13px] font-medium text-[#292929] tracking-tight truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[11px] text-[#9B948C]">{item.qty} cups</span>
                    <span className="text-[13px] font-semibold text-[#292929] font-mono tabular-nums w-16 text-right">
                      {formatPHP(item.totalCents)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8E2D9] p-5 shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EAE1]">
            <h2 className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide">
              Recent transactions
            </h2>
            <span className="text-[10px] font-medium text-[#C4B9AA] uppercase tracking-wide">Live</span>
          </div>

          <div className="divide-y divide-[#F7F3EB] mt-0.5">
            {recentSales.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#C4B9AA]">
                No completed transactions yet
              </div>
            ) : (
              recentSales.map(sale => {
                const saleTime = new Date(sale.createdAt).toLocaleTimeString('en-PH', {
                  timeZone: 'Asia/Manila',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div
                    key={sale.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      <span className="font-mono font-medium text-[#292929] tabular-nums">
                        {sale.orderNumber}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#F7F3EB] text-[10px] font-medium text-[#6E6862] capitalize">
                        {sale.payment.method.replace('_', ' ')}
                      </span>
                      {sale.paymentStatus !== 'paid' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#FDF6F4] text-[10px] font-medium text-[#A25035] capitalize">
                          {sale.paymentStatus.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0">
                      <span className="text-[11px] text-[#9B948C] tabular-nums">{saleTime}</span>
                      <span className="font-semibold text-[#292929] font-mono tabular-nums">
                        {formatPHP(sale.totalCents)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
