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

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  inventoryItems,
  onNavigateToPOS,
  onNavigateToInventory
}) => {
  const now = new Date();
  const currentHour = now.getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const todayStr = now.toISOString().slice(0, 10);

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

  // Recent 6 transactions
  const recentSales = useMemo(() => {
    return sales.slice(0, 6);
  }, [sales]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto overflow-y-auto">
      {/* Welcome */}
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

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] hover:shadow-[0_4px_12px_rgba(59,41,37,0.05)] transition-shadow">
          <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
            Today’s Sales
          </div>
          <div className="text-[1.65rem] font-bold text-[#292929] mt-2.5 font-mono tracking-tight tabular-nums leading-none">
            {formatPHP(grossSalesCents)}
          </div>
          <div className="text-[11px] text-[#C4B9AA] mt-2">
            {todaySales.length} orders recorded
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] hover:shadow-[0_4px_12px_rgba(59,41,37,0.05)] transition-shadow">
          <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
            Transactions
          </div>
          <div className="text-[1.65rem] font-bold text-[#292929] mt-2.5 font-mono tracking-tight tabular-nums leading-none">
            {paidSalesCount}
          </div>
          <div className="text-[11px] text-[#C4B9AA] mt-2">Completed checkouts</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] hover:shadow-[0_4px_12px_rgba(59,41,37,0.05)] transition-shadow">
          <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
            Average Order
          </div>
          <div className="text-[1.65rem] font-bold text-[#292929] mt-2.5 font-mono tracking-tight tabular-nums leading-none">
            {formatPHP(averageOrderCents)}
          </div>
          <div className="text-[11px] text-[#C4B9AA] mt-2">Ticket average today</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] hover:shadow-[0_4px_12px_rgba(59,41,37,0.05)] transition-shadow">
          <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">
            Inventory
          </div>
          <div className="text-[1.65rem] font-bold mt-2.5 font-mono tracking-tight tabular-nums leading-none">
            {lowStockItems.length > 0 ? (
              <span className="text-[#A25035]">{lowStockItems.length} low</span>
            ) : (
              <span className="text-[#A8B5A0]">Healthy</span>
            )}
          </div>
          <div className="text-[11px] text-[#C4B9AA] mt-2">
            {lowStockItems.length > 0 ? (
              <button
                onClick={onNavigateToInventory}
                className="text-[#3B2925] font-medium hover:underline cursor-pointer"
              >
                Review materials →
              </button>
            ) : (
              'All ingredients in stock'
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#E8E2D9]/80" />

      {/* Top items + recent */}
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
              <div className="py-10 text-center text-xs text-[#C4B9AA]">
                No drinks sold yet today
              </div>
            ) : (
              topSellingItems.map((item, idx) => (
                <div key={item.name} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-[11px] font-mono w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                        idx === 0
                          ? 'bg-[#3B2925] text-white'
                          : 'bg-[#F7F3EB] text-[#9B948C]'
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
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div key={sale.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      <span className="font-mono font-medium text-[#292929] tabular-nums">
                        {sale.orderNumber}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#F7F3EB] text-[10px] font-medium text-[#6E6862] capitalize">
                        {sale.payment.method.replace('_', ' ')}
                      </span>
                      <span className="text-[#C4B9AA]">
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                      </span>
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
