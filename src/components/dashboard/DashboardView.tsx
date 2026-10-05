import React, { useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Coffee,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  HardDrive,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
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

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  inventoryItems,
  activeShift,
  onNavigateToPOS,
  onNavigateToInventory,
  onNavigateToStaff,
  onNavigateToMenu
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Sales for today
  const todaySales = useMemo(() => {
    return sales.filter(s => s.createdAt.startsWith(todayStr));
  }, [sales, todayStr]);

  const grossSalesCents = useMemo(() => {
    return todaySales
      .filter(s => s.paymentStatus === 'paid')
      .reduce((sum, s) => sum + s.totalCents, 0);
  }, [todaySales]);

  const paidSalesCount = useMemo(() => {
    return todaySales.filter(s => s.paymentStatus === 'paid').length;
  }, [todaySales]);

  const averageOrderCents = useMemo(() => {
    return paidSalesCount > 0 ? Math.round(grossSalesCents / paidSalesCount) : 0;
  }, [grossSalesCents, paidSalesCount]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalCents: number }> = {
      cash: { count: 0, totalCents: 0 },
      gcash: { count: 0, totalCents: 0 },
      maya: { count: 0, totalCents: 0 },
      card_pos: { count: 0, totalCents: 0 }
    };

    todaySales
      .filter(s => s.paymentStatus === 'paid')
      .forEach(s => {
        const method = s.payment.method;
        if (map[method]) {
          map[method].count += 1;
          map[method].totalCents += s.totalCents;
        }
      });

    return map;
  }, [todaySales]);

  // Low Stock Items
  const lowStockItems = useMemo(() => {
    return inventoryItems.filter(item => item.currentStock <= item.minThreshold);
  }, [inventoryItems]);

  // Top Selling Items today
  const topSellingItems = useMemo(() => {
    const itemMap: Record<string, { name: string; qty: number; totalCents: number }> = {};
    todaySales
      .filter(s => s.paymentStatus === 'paid')
      .forEach(s => {
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
  }, [todaySales]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* GEN Z EDITORIAL HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-stone-800 bg-[#14100E] shadow-2xl p-6 md:p-8 text-white">
        {/* Glow backdrop & subtle mesh gradient */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#B4EE10]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Gen Z Tagline Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B4EE10] text-[#14100E] font-black uppercase tracking-wider text-[11px] shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#14100E] animate-pulse" />
                OFFLINE SQLITE ENGINE
              </span>
              <span className="px-3 py-1 rounded-full bg-stone-800/90 border border-stone-700 text-stone-200 font-semibold text-[11px]">
                TERMINAL 01 ACTIVE
              </span>
              <span className="px-3 py-1 rounded-full bg-stone-800/90 border border-stone-700 text-[#B4EE10] font-semibold text-[11px]">
                0ms LATENCY
              </span>
            </div>

            <h1 className="font-display font-black text-2xl md:text-4xl tracking-tight text-white uppercase leading-none">
              C5ISR Coffee POS
            </h1>
            <p className="text-sm text-stone-300 font-medium leading-relaxed max-w-xl">
              High-velocity offline cashier station with sub-millisecond atomic SQLite transactions, recipe inventory deductions, and instant cash tender.
            </p>
          </div>

          {/* ULTRA-PROMINENT AESTHETIC LAUNCH POS REGISTER CTA BUTTON */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
            <button
              onClick={onNavigateToPOS}
              className="group relative flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-[#B4EE10] hover:bg-[#CCFF00] active:scale-95 text-[#14100E] font-black text-sm tracking-wide uppercase transition-all duration-200 shadow-[0_0_25px_rgba(180,238,16,0.35)] hover:shadow-[0_0_35px_rgba(180,238,16,0.55)] border-2 border-[#B4EE10] hover:border-[#CCFF00] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-[#14100E] text-[#B4EE10] flex items-center justify-center shrink-0 shadow-inner group-hover:rotate-6 transition-transform">
                <Coffee className="w-4 h-4 fill-current" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-mono font-bold tracking-widest text-[#14100E]/70 uppercase">
                  Fast Cashier
                </span>
                <span className="block text-base font-extrabold text-[#14100E] leading-none">
                  Launch POS Register
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-[#14100E] group-hover:translate-x-1 transition-transform ml-1" />
            </button>

            {/* Quick Shift Button */}
            <button
              onClick={onNavigateToStaff}
              className="flex items-center justify-center gap-2 px-5 py-5 rounded-2xl bg-stone-900/90 hover:bg-stone-800 active:scale-95 text-stone-200 hover:text-white font-bold text-xs uppercase tracking-wider border border-stone-700 transition shadow-md"
            >
              <ShieldCheck className="w-4 h-4 text-[#B4EE10]" />
              <span>{activeShift ? 'Shift Active' : 'Open Shift'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* METRIC CARDS - HIGH VISIBILITY & CLEAN TYPOGRAPHY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
              Today's Gross Sales
            </span>
            <div className="p-2.5 rounded-2xl bg-[#FAF7F2] text-[#14100E] border border-stone-200">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-mono tabular-nums text-stone-900 tracking-tight">
              {formatPHP(grossSalesCents)}
            </h3>
            <p className="text-xs text-stone-600 mt-1 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {paidSalesCount} completed tickets today
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
              Paid Transactions
            </span>
            <div className="p-2.5 rounded-2xl bg-[#FAF7F2] text-[#14100E] border border-stone-200">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-mono tabular-nums text-stone-900 tracking-tight">
              {paidSalesCount}
            </h3>
            <p className="text-xs text-stone-600 mt-1 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Recorded locally on Terminal 1
            </p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
              Average Ticket (AOV)
            </span>
            <div className="p-2.5 rounded-2xl bg-[#FAF7F2] text-[#14100E] border border-stone-200">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-mono tabular-nums text-stone-900 tracking-tight">
              {formatPHP(averageOrderCents)}
            </h3>
            <p className="text-xs text-stone-600 mt-1 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Per paying customer
            </p>
          </div>
        </div>

        {/* Active Shift Float */}
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
              Shift Cash Float
            </span>
            <button
              onClick={onNavigateToStaff}
              className="p-2 rounded-2xl bg-[#FAF7F2] hover:bg-stone-200 text-[#14100E] border border-stone-200 transition"
              title="Manage Cashier Shifts"
            >
              <ShieldCheck className="w-4 h-4 text-[#14100E]" />
            </button>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-mono tabular-nums text-stone-900 tracking-tight">
              {activeShift ? formatPHP(activeShift.openingCashCents) : '₱0.00'}
            </h3>
            <p className="text-xs text-stone-600 mt-1 font-semibold flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeShift ? 'bg-[#B4EE10] animate-pulse' : 'bg-amber-500'
                }`}
              />
              {activeShift ? `Active Barista: ${activeShift.userName}` : 'No active shift open'}
            </p>
          </div>
        </div>
      </div>

      {/* TWO COLUMN CONTENT: PAYMENT BREAKDOWN & TOP ITEMS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Methods Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h4 className="text-xs font-extrabold font-display uppercase tracking-wider text-stone-900">
              Payment Method Mix (Today)
            </h4>
            <span className="text-[11px] font-mono font-bold text-stone-500">REALTIME</span>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Cash Tender (PHP)', data: paymentBreakdown.cash, color: 'bg-[#14100E]' },
              { label: 'GCash (Recorded)', data: paymentBreakdown.gcash, color: 'bg-blue-600' },
              { label: 'Maya (Recorded)', data: paymentBreakdown.maya, color: 'bg-teal-600' },
              { label: 'Card POS Terminal', data: paymentBreakdown.card_pos, color: 'bg-purple-600' }
            ].map(item => {
              const pct =
                grossSalesCents > 0
                  ? Math.round((item.data.totalCents / grossSalesCents) * 100)
                  : 0;
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-stone-800">
                    <span>
                      {item.label} <span className="text-stone-500 font-normal">({item.data.count})</span>
                    </span>
                    <span className="font-mono tabular-nums text-stone-900">{formatPHP(item.data.totalCents)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500 font-mono">
                    <span>{pct}% share</span>
                    <span>{item.data.count} txns</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Best-Selling Coffee & Pastries */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h4 className="text-xs font-extrabold font-display uppercase tracking-wider text-stone-900">
                Top Selling Items Today
              </h4>
              <p className="text-[11px] text-stone-500 font-medium">Ranked by volume ordered</p>
            </div>
            {onNavigateToMenu && (
              <button
                onClick={onNavigateToMenu}
                className="text-xs font-bold text-[#14100E] hover:underline flex items-center gap-1"
              >
                <span>View Menu</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {topSellingItems.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#FAF7F2] border border-stone-200">
              <Coffee className="w-10 h-10 text-stone-400 mb-2 stroke-[1.5]" />
              <p className="text-sm font-bold text-stone-800">No sales recorded yet today</p>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                As baristas ring up coffees and pastries on the POS, top sellers will rank here in real time.
              </p>
              <button
                onClick={onNavigateToPOS}
                className="mt-3 px-4 py-2 rounded-xl bg-[#14100E] text-white text-xs font-bold hover:bg-stone-800 transition"
              >
                Go to POS Register
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {topSellingItems.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3.5">
                    <span className="w-7 h-7 rounded-xl bg-stone-900 text-[#B4EE10] text-xs font-black flex items-center justify-center font-mono shadow-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-stone-900">{item.name}</p>
                      <p className="text-[11px] text-stone-500 font-semibold">{item.qty} units sold today</p>
                    </div>
                  </div>
                  <span className="text-xs font-black font-mono tabular-nums text-stone-900">
                    {formatPHP(item.totalCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: LOW STOCK INVENTORY ALERTS & RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Watchlist */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-extrabold font-display uppercase tracking-wider text-stone-900">
                Low Stock Thresholds ({lowStockItems.length})
              </h4>
            </div>
            <button
              onClick={onNavigateToInventory}
              className="text-xs font-bold text-stone-800 hover:text-black hover:underline"
            >
              Inventory Ledger →
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Stock health is in good standing. All espresso beans, milks, and syrups are above reorder thresholds.
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowStockItems.slice(0, 4).map(item => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-stone-900">{item.name}</p>
                    <p className="text-[11px] text-stone-600 font-mono mt-0.5">
                      Min Threshold: {item.minThreshold} {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black font-mono tabular-nums text-rose-700">
                      {item.currentStock.toFixed(1)} {item.unit}
                    </span>
                    <span className="block text-[10px] text-rose-600 font-bold uppercase tracking-wider">
                      Needs Restock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions Feed */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h4 className="text-xs font-extrabold font-display uppercase tracking-wider text-stone-900">
              Recent Sales Feed
            </h4>
            <span className="text-[11px] font-mono font-bold text-stone-500">TERMINAL 01</span>
          </div>

          {todaySales.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-[#FAF7F2] border border-stone-200">
              <ShoppingBag className="w-10 h-10 text-stone-400 mb-2 stroke-[1.5]" />
              <p className="text-sm font-bold text-stone-800">No transactions yet today</p>
              <p className="text-xs text-stone-500 mt-1 max-w-sm">
                Receipts generated from the POS will automatically display in this audit stream.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todaySales.slice(0, 4).map(sale => (
                <div
                  key={sale.id}
                  className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs hover:border-stone-400 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900">{sale.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-800 text-[10px] font-black uppercase">
                        {sale.payment.method}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                      {sale.customerName || 'Walk-in Customer'} • {sale.items.length} items •{' '}
                      {new Date(sale.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className="font-mono font-black tabular-nums text-stone-900 text-sm">
                    {formatPHP(sale.totalCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
