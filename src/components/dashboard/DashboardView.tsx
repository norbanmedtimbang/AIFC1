import React, { useMemo } from 'react';
import { ArrowRight, Coffee, AlertTriangle, Wallet, Receipt, TrendingUp, Calendar, Clock } from 'lucide-react';
import { Sale, InventoryItem, CashierShift, User } from '../../types';
import { formatPHP } from '../../services/storage';

interface DashboardViewProps {
  sales: Sale[];
  inventoryItems: InventoryItem[];
  activeShift: CashierShift | null;
  currentUser?: User;
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
  activeShift,
  currentUser,
  onNavigateToPOS,
  onNavigateToInventory,
  onNavigateToStaff
}) => {
  const isManagerOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager';

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

  // Today's paid sales
  const todayPaid = useMemo(
    () => paidSales.filter(s => manilaDateKey(s.createdAt) === todayKey),
    [paidSales, todayKey]
  );
  const todaySalesCents = useMemo(
    () => todayPaid.reduce((sum, s) => sum + s.totalCents, 0),
    [todayPaid]
  );
  const todayTxCount = todayPaid.length;

  // Current shift's paid sales
  const currentShiftSales = useMemo(() => {
    if (!activeShift) return [];
    return paidSales.filter(s => s.shiftId === activeShift.id);
  }, [paidSales, activeShift]);

  const currentShiftSalesCents = useMemo(
    () => currentShiftSales.reduce((sum, s) => sum + s.totalCents, 0),
    [currentShiftSales]
  );
  const currentShiftTxCount = currentShiftSales.length;

  // Expected Cash in Drawer (opening cash float + cash sales during active shift)
  const currentShiftCashSalesCents = useMemo(
    () =>
      currentShiftSales
        .filter(s => s.payment.method === 'cash')
        .reduce((sum, s) => sum + s.totalCents, 0),
    [currentShiftSales]
  );

  const cashInDrawerCents = useMemo(() => {
    if (!activeShift) return 0;
    return activeShift.openingCashCents + currentShiftCashSalesCents;
  }, [activeShift, currentShiftCashSalesCents]);

  // Manager/Admin wider period KPIs
  const monthPaid = useMemo(
    () => paidSales.filter(s => manilaYearMonth(s.createdAt) === monthKey),
    [paidSales, monthKey]
  );
  const monthSalesCents = useMemo(
    () => monthPaid.reduce((sum, s) => sum + s.totalCents, 0),
    [monthPaid]
  );

  const yearPaid = useMemo(
    () => paidSales.filter(s => manilaYear(s.createdAt) === yearKey),
    [paidSales, yearKey]
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
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-6xl mx-auto w-full">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-[1.65rem] font-bold tracking-tight text-[#292929] leading-tight">
              {greeting}{currentUser?.fullName ? `, ${currentUser.fullName.split(' ')[0]}` : ''}
            </h1>
          </div>
          <p className="text-xs text-[#9B948C] font-normal mt-1">
            {currentUser?.role === 'cashier'
              ? 'Shift operations, register activity, and live order journal'
              : 'Management overview, sales metrics, and store operations'}
          </p>
        </div>

        <button
          onClick={onNavigateToPOS}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-semibold transition cursor-pointer shadow-[0_2px_8px_rgba(59,41,37,0.18)] active:scale-[0.98] w-full sm:w-auto"
        >
          <Coffee className="w-4 h-4" strokeWidth={1.8} />
          <span>Open POS Register</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-white/60" />
        </button>
      </div>

      {/* CASHIER OPERATIONAL KPI CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold text-[#6E6862] uppercase tracking-wider">
            Daily Operations & Shift Status
          </span>
          <span className="text-[10px] text-[#9B948C] font-mono">
            {todayKey} · Asia/Manila
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Card 1: Today's Sales */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                  Today's Sales
                </span>
                <TrendingUp className="w-4 h-4 text-[#A8B5A0]" />
              </div>
              <div className="text-2xl sm:text-[1.5rem] font-bold text-[#292929] mt-2 font-mono tracking-tight tabular-nums">
                {formatPHP(todaySalesCents)}
              </div>
            </div>
            <div className="text-[11px] text-[#9B948C] mt-2 font-mono">
              Completed paid sales today
            </div>
          </div>

          {/* Card 2: Today's Transactions */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                  Today's Transactions
                </span>
                <Receipt className="w-4 h-4 text-[#9B948C]" />
              </div>
              <div className="text-2xl sm:text-[1.5rem] font-bold text-[#292929] mt-2 font-mono tracking-tight tabular-nums">
                {todayTxCount}
              </div>
            </div>
            <div className="text-[11px] text-[#9B948C] mt-2">
              Paid customer orders
            </div>
          </div>

          {/* Card 3: Current Shift Sales */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                  Current Shift Sales
                </span>
                <Clock className="w-4 h-4 text-[#3B2925]" />
              </div>
              <div className="text-2xl sm:text-[1.5rem] font-bold text-[#3B2925] mt-2 font-mono tracking-tight tabular-nums">
                {activeShift ? formatPHP(currentShiftSalesCents) : '—'}
              </div>
            </div>
            <div className="text-[11px] text-[#9B948C] mt-2 truncate">
              {activeShift ? `Shift of ${activeShift.userName}` : 'No active shift open'}
            </div>
          </div>

          {/* Card 4: Current Shift Transactions */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                  Current Shift Txns
                </span>
                <Receipt className="w-4 h-4 text-[#3B2925]" />
              </div>
              <div className="text-2xl sm:text-[1.5rem] font-bold text-[#292929] mt-2 font-mono tracking-tight tabular-nums">
                {activeShift ? currentShiftTxCount : '—'}
              </div>
            </div>
            <div className="text-[11px] text-[#9B948C] mt-2">
              {activeShift ? `${currentShiftTxCount} checkouts this shift` : 'Open shift to track'}
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY OPERATIONAL CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
        {/* Secondary Card 1: Cash in Drawer */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#3B2925]" />
              <span className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                Cash in Drawer (Expected)
              </span>
            </div>
            <div className="text-2xl font-bold text-[#292929] mt-2 font-mono tracking-tight tabular-nums">
              {activeShift ? formatPHP(cashInDrawerCents) : 'No Open Shift'}
            </div>
            <p className="text-[11px] text-[#9B948C] mt-1 truncate">
              {activeShift
                ? `Float: ${formatPHP(activeShift.openingCashCents)} + Cash Sales: ${formatPHP(currentShiftCashSalesCents)}`
                : 'Expected cash calculated upon opening shift'}
            </p>
          </div>
          {onNavigateToStaff && (
            <button
              onClick={onNavigateToStaff}
              className="text-xs font-medium text-[#3B2925] hover:underline cursor-pointer shrink-0 ml-3"
            >
              Reconcile →
            </button>
          )}
        </div>

        {/* Secondary Card 2: Low Stock Items */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${lowStockItems.length > 0 ? 'text-[#A25035]' : 'text-[#A8B5A0]'}`} />
              <span className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                Low Stock Threshold Items
              </span>
            </div>
            <div className={`text-2xl font-bold mt-2 font-mono tracking-tight tabular-nums ${lowStockItems.length > 0 ? 'text-[#A25035]' : 'text-[#292929]'}`}>
              {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'}
            </div>
            <p className="text-[11px] text-[#9B948C] mt-1">
              {lowStockItems.length > 0 ? 'Ingredients currently below minimum reorder point' : 'All inventory levels healthy'}
            </p>
          </div>
          <button
            onClick={onNavigateToInventory}
            className="text-xs font-medium text-[#3B2925] hover:underline cursor-pointer shrink-0 ml-3"
          >
            Review Stock →
          </button>
        </div>
      </div>

      {/* MANAGER / ADMIN BUSINESS-LEVEL KPIS (HIDDEN FOR CASHIERS) */}
      {isManagerOrAdmin && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6E6862] uppercase tracking-wider">
              Management Financial Trends
            </span>
            <span className="text-[10px] text-[#9B948C]">
              Detailed metrics also available in Reports module
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                  This Month's Sales
                </span>
                <Calendar className="w-4 h-4 text-[#9B948C]" />
              </div>
              <div className="text-[1.4rem] font-bold text-[#292929] mt-2 font-mono tracking-tight tabular-nums">
                {formatPHP(monthSalesCents)}
              </div>
              <div className="text-[11px] text-[#C4B9AA] mt-1.5">{monthLabel}</div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                  This Year's Sales
                </span>
                <Calendar className="w-4 h-4 text-[#9B948C]" />
              </div>
              <div className="text-[1.4rem] font-bold text-[#292929] mt-2 font-mono tracking-tight tabular-nums">
                {formatPHP(yearSalesCents)}
              </div>
              <div className="text-[11px] text-[#C4B9AA] mt-1.5">Calendar Year {yearKey}</div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
                  Overall Sales
                </span>
                <TrendingUp className="w-4 h-4 text-[#3B2925]" />
              </div>
              <div className="text-[1.4rem] font-bold text-[#292929] mt-2 font-mono tracking-tight tabular-nums">
                {formatPHP(overallSalesCents)}
              </div>
              <div className="text-[11px] text-[#C4B9AA] mt-1.5">
                {paidSales.length} lifetime paid orders
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-px bg-[#E8E2D9]/80" />

      {/* TOP DRINKS & RECENT TRANSACTIONS (FULLY RESPONSIVE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-4">
        {/* Top drinks */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8E2D9] p-4 sm:p-5 shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
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
                <div key={item.name} className="py-3 flex items-center justify-between gap-2">
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
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-[#9B948C]">{item.qty} cups</span>
                    <span className="text-[13px] font-semibold text-[#292929] font-mono tabular-nums text-right">
                      {formatPHP(item.totalCents)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8E2D9] p-4 sm:p-5 shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EAE1]">
            <h2 className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide">
              Recent transactions
            </h2>
            <span className="text-[10px] font-medium text-[#C4B9AA] uppercase tracking-wide">Live Journal</span>
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
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
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

                    <div className="flex items-center gap-3 shrink-0">
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
