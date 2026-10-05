import React, { useMemo } from 'react';
import { ArrowRight, Coffee, Package, ArrowUpRight } from 'lucide-react';
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
      {/* Top Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#292929]">
            {greeting}
          </h1>
          <p className="text-xs text-[#7A736C] font-normal mt-1">
            Here's what's happening at the shop today.
          </p>
        </div>

        <button
          onClick={onNavigateToPOS}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-medium transition cursor-pointer shadow-xs"
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>Open Register (POS)</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-white/70" />
        </button>
      </div>

      {/* 4 Concise Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9]">
          <div className="text-xs text-[#7A736C] font-medium">Today's Sales</div>
          <div className="text-2xl font-bold text-[#292929] mt-2 font-mono tracking-tight">
            {formatPHP(grossSalesCents)}
          </div>
          <div className="text-[11px] text-[#9B948C] mt-1">
            {todaySales.length} total orders recorded
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9]">
          <div className="text-xs text-[#7A736C] font-medium">Transactions</div>
          <div className="text-2xl font-bold text-[#292929] mt-2 font-mono tracking-tight">
            {paidSalesCount}
          </div>
          <div className="text-[11px] text-[#9B948C] mt-1">
            Completed checkouts
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9]">
          <div className="text-xs text-[#7A736C] font-medium">Average Order</div>
          <div className="text-2xl font-bold text-[#292929] mt-2 font-mono tracking-tight">
            {formatPHP(averageOrderCents)}
          </div>
          <div className="text-[11px] text-[#9B948C] mt-1">
            Ticket average today
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#E8E2D9]">
          <div className="text-xs text-[#7A736C] font-medium">Inventory Status</div>
          <div className="text-2xl font-bold text-[#292929] mt-2 font-mono tracking-tight">
            {lowStockItems.length > 0 ? (
              <span className="text-[#A25035]">{lowStockItems.length} low</span>
            ) : (
              <span className="text-[#6B8E5F]">Healthy</span>
            )}
          </div>
          <div className="text-[11px] text-[#9B948C] mt-1">
            {lowStockItems.length > 0 ? (
              <button
                onClick={onNavigateToInventory}
                className="text-[#3B2925] underline hover:no-underline font-medium cursor-pointer"
              >
                Review materials
              </button>
            ) : (
              'All ingredients in stock'
            )}
          </div>
        </div>
      </div>

      {/* Subtle Divider */}
      <div className="h-px bg-[#E8E2D9]" />

      {/* Lower Two Sections: Top Items & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Top Drinks Today */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8E2D9] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE1]">
            <h2 className="text-xs font-semibold text-[#292929] uppercase tracking-wider">
              Top Selling Drinks
            </h2>
            <span className="text-[11px] text-[#7A736C]">Today</span>
          </div>

          <div className="divide-y divide-[#F7F3EB] mt-1">
            {topSellingItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9B948C]">
                No drinks sold yet today
              </div>
            ) : (
              topSellingItems.map((item, idx) => (
                <div key={item.name} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#9B948C] w-4">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-medium text-[#292929]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[#7A736C]">
                      {item.qty} cups
                    </span>
                    <span className="text-xs font-medium text-[#292929] font-mono w-16 text-right">
                      {formatPHP(item.totalCents)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Recent Transactions */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E8E2D9] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE1]">
            <h2 className="text-xs font-semibold text-[#292929] uppercase tracking-wider">
              Recent Transactions
            </h2>
            <span className="text-[11px] text-[#7A736C]">Live Journal</span>
          </div>

          <div className="divide-y divide-[#F7F3EB] mt-1">
            {recentSales.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9B948C]">
                No completed transactions yet
              </div>
            ) : (
              recentSales.map(sale => {
                const saleTime = new Date(sale.createdAt).toLocaleTimeString('en-PH', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#6E6862]">
                        {sale.orderNumber}
                      </span>
                      <span className="text-[#9B948C]">·</span>
                      <span className="text-[#292929] capitalize">
                        {sale.payment.method.replace('_', ' ')}
                      </span>
                      <span className="text-[#9B948C]">·</span>
                      <span className="text-[#7A736C]">
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[11px] text-[#9B948C]">
                        {saleTime}
                      </span>
                      <span className="font-medium text-[#292929] font-mono">
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
