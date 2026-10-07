import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, Coffee, RefreshCw } from 'lucide-react';
import {
  CashMovement,
  CashierShift,
  Expense,
  InventoryItem,
  Purchase,
  Sale,
  User
} from '../../types';
import { formatPHP } from '../../services/storage';
import { canPerformCapability, hasModuleAccess } from '../../services/rbac';
import {
  computeBusinessMetrics,
  computeCashierMetrics,
  findMyOpenShift,
  isCountableSale,
  manilaDateKey
} from '../../services/dashboardMetrics';

type SyncState = 'loading' | 'ready' | 'error';

interface DashboardViewProps {
  currentUser: User;
  sales: Sale[];
  inventoryItems: InventoryItem[];
  shifts: CashierShift[];
  cashMovements: CashMovement[];
  expenses: Expense[];
  purchases: Purchase[];
  syncState: SyncState;
  syncError: string | null;
  onRetry: () => void;
  onNavigateToPOS: () => void;
  onNavigateToInventory: () => void;
  onNavigateToStaff: () => void;
  onNavigateToReports: () => void;
}

interface MetricCardProps {
  label: string;
  caption: string;
  state: SyncState;
  /** null = no value available for a legitimate reason (e.g. no open shift) */
  value: string | null;
  emptyText?: string;
  tone?: 'default' | 'warn' | 'ok';
  onClick?: () => void;
  actionLabel?: string;
}

const cardBase =
  'bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E2D9] shadow-[0_1px_3px_rgba(59,41,37,0.03)] text-left min-w-0';

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  caption,
  state,
  value,
  emptyText = '—',
  tone = 'default',
  onClick,
  actionLabel
}) => {
  const valueColor =
    tone === 'warn' ? 'text-[#A25035]' : tone === 'ok' ? 'text-[#5E6F57]' : 'text-[#292929]';

  const body = (
    <>
      <div className="text-[11px] text-[#9B948C] font-medium uppercase tracking-wide">{label}</div>
      <div className="mt-2.5 min-h-[1.9rem] flex items-end">
        {state === 'loading' ? (
          <div className="h-7 w-28 rounded-lg bg-[#F0EAE1] animate-pulse" aria-label="Loading" />
        ) : state === 'error' ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#A25035]">
            <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span>Unavailable</span>
          </div>
        ) : value === null ? (
          <div className="text-[1.5rem] font-bold text-[#C4B9AA] font-mono leading-none">{emptyText}</div>
        ) : (
          <div
            className={`text-[1.35rem] sm:text-[1.5rem] font-bold ${valueColor} font-mono tracking-tight tabular-nums leading-none truncate`}
          >
            {value}
          </div>
        )}
      </div>
      <div className="text-[11px] text-[#C4B9AA] mt-2 flex items-center justify-between gap-2">
        <span className="truncate">{caption}</span>
        {onClick && actionLabel && state === 'ready' && (
          <span className="text-[#3B2925] font-medium shrink-0">{actionLabel} →</span>
        )}
      </div>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className={`${cardBase} hover:border-[#D8CEBF] transition cursor-pointer`}>
      {body}
    </button>
  ) : (
    <div className={cardBase}>{body}</div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  sales,
  inventoryItems,
  shifts,
  cashMovements,
  expenses,
  purchases,
  syncState,
  syncError,
  onRetry,
  onNavigateToPOS,
  onNavigateToInventory,
  onNavigateToStaff,
  onNavigateToReports
}) => {
  const now = new Date();
  const currentHour = Number(
    now.toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false })
  );
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const todayKey = manilaDateKey(now);

  const canSeeBusinessKpis = canPerformCapability(currentUser.role, 'canViewReports');
  const canOpenInventory = hasModuleAccess(currentUser.role, 'inventory');
  const canOpenReports = hasModuleAccess(currentUser.role, 'reports');

  const myShift = useMemo(() => findMyOpenShift(shifts, currentUser.id), [shifts, currentUser.id]);

  const m = useMemo(
    () => computeCashierMetrics({ sales, shift: myShift, cashMovements, expenses, inventoryItems }),
    [sales, myShift, cashMovements, expenses, inventoryItems]
  );

  const biz = useMemo(
    () => (canSeeBusinessKpis ? computeBusinessMetrics({ sales, expenses, purchases }) : null),
    [canSeeBusinessKpis, sales, expenses, purchases]
  );

  const paidToday = useMemo(
    () => sales.filter(s => isCountableSale(s) && manilaDateKey(s.createdAt) === todayKey),
    [sales, todayKey]
  );

  const topSellingItems = useMemo(() => {
    const itemMap: Record<string, { name: string; qty: number; totalCents: number }> = {};
    paidToday.forEach(s =>
      s.items.forEach(it => {
        const e = (itemMap[it.productNameSnapshot] ||= { name: it.productNameSnapshot, qty: 0, totalCents: 0 });
        e.qty += it.quantity;
        e.totalCents += it.subtotalCents;
      })
    );
    return Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [paidToday]);

  const recentSales = useMemo(() => sales.slice(0, 6), [sales]);

  const monthLabel = now.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'long', year: 'numeric' });
  const state = syncState;
  const shiftCaption = myShift ? 'Your open shift' : 'No open shift';
  const lowStockTone = m.lowStockCount > 0 ? 'warn' : 'ok';

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 max-w-6xl mx-auto overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.4rem] sm:text-[1.65rem] font-bold tracking-tight text-[#292929] leading-tight">
            {greeting}
          </h1>
          <p className="text-xs text-[#9B948C] font-normal mt-1.5">
            {currentUser.fullName} · {todayKey}
          </p>
        </div>
        <button
          onClick={onNavigateToPOS}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-semibold transition cursor-pointer shadow-[0_2px_8px_rgba(59,41,37,0.18)] active:scale-[0.98]"
        >
          <Coffee className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>Open Register</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-white/60" />
        </button>
      </div>

      {state === 'error' && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#FDF6F4] border border-[#EBCFC6]"
        >
          <div className="flex items-start gap-2.5 text-xs text-[#A25035]">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" strokeWidth={1.8} />
            <div>
              <p className="font-semibold">Dashboard figures could not be loaded</p>
              <p className="mt-0.5 text-[#A25035]/80">
                {syncError || 'Unable to reach the database.'} Numbers are hidden rather than showing
                outdated values.
              </p>
            </div>
          </div>
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EBCFC6] text-xs font-medium text-[#A25035] hover:bg-[#FDF6F4] transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
            Retry
          </button>
        </div>
      )}

      {state === 'ready' && !m.hasShift && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white border border-[#E8E2D9]">
          <p className="text-xs text-[#6E6862]">
            You have no open shift. Open one to track shift sales and the cash drawer.
          </p>
          {hasModuleAccess(currentUser.role, 'staff') && (
            <button
              onClick={onNavigateToStaff}
              className="text-xs font-medium text-[#3B2925] hover:underline cursor-pointer text-left sm:text-right"
            >
              Go to Shifts →
            </button>
          )}
        </div>
      )}

      {/* Primary cards */}
      <section aria-label="Today and current shift" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <MetricCard
          label="Today’s Sales"
          caption="Completed sales today"
          state={state}
          value={formatPHP(m.todaySalesCents)}
        />
        <MetricCard
          label="Today’s Transactions"
          caption="Completed transactions today"
          state={state}
          value={String(m.todayTransactions)}
        />
        <MetricCard
          label="Current Shift Sales"
          caption={shiftCaption}
          state={state}
          value={m.shiftSalesCents === null ? null : formatPHP(m.shiftSalesCents)}
          emptyText="No shift"
        />
        <MetricCard
          label="Current Shift Transactions"
          caption={shiftCaption}
          state={state}
          value={m.shiftTransactions === null ? null : String(m.shiftTransactions)}
          emptyText="No shift"
        />
      </section>

      {/* Secondary cards */}
      <section aria-label="Drawer and stock" className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <MetricCard
          label="Cash in Drawer"
          caption={myShift ? 'Expected, from this shift’s cash activity' : 'No open shift'}
          state={state}
          value={m.cashInDrawerCents === null ? null : formatPHP(m.cashInDrawerCents)}
          emptyText="No shift"
        />
        <MetricCard
          label="Low Stock Items"
          caption={
            m.lowStockCount === 0
              ? 'All items above threshold'
              : 'At or below configured threshold'
          }
          state={state}
          value={String(m.lowStockCount)}
          tone={state === 'ready' ? lowStockTone : 'default'}
          onClick={canOpenInventory && m.lowStockCount > 0 ? onNavigateToInventory : undefined}
          actionLabel="Review"
        />
      </section>

      {/* Manager / Admin business KPIs */}
      {canSeeBusinessKpis && (
        <section aria-label="Business overview" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide">
              Business overview
            </h2>
            {canOpenReports && (
              <button
                onClick={onNavigateToReports}
                className="text-xs font-medium text-[#3B2925] hover:underline cursor-pointer"
              >
                Full breakdown in Reports →
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <MetricCard
              label="This Month’s Sales"
              caption={monthLabel}
              state={state}
              value={biz ? formatPHP(biz.monthSalesCents) : null}
            />
            <MetricCard
              label="This Year’s Sales"
              caption={`Year ${todayKey.slice(0, 4)}`}
              state={state}
              value={biz ? formatPHP(biz.yearSalesCents) : null}
            />
            <MetricCard
              label="Overall Sales"
              caption="All completed sales"
              state={state}
              value={biz ? formatPHP(biz.overallSalesCents) : null}
            />
            <MetricCard
              label="Expenses (Month)"
              caption={monthLabel}
              state={state}
              value={biz ? formatPHP(biz.monthExpensesCents) : null}
            />
            <MetricCard
              label="Purchases (Month)"
              caption="Received deliveries"
              state={state}
              value={biz ? formatPHP(biz.monthPurchasesCents) : null}
            />
            <MetricCard
              label="Est. Profit (Month)"
              caption="Sales − expenses − purchases"
              state={state}
              value={biz ? formatPHP(biz.monthEstProfitCents) : null}
              tone={state === 'ready' && biz ? (biz.monthEstProfitCents < 0 ? 'warn' : 'ok') : 'default'}
            />
          </div>
        </section>
      )}

      <div className="h-px bg-[#E8E2D9]/80" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E8E2D9] p-5 shadow-[0_1px_3px_rgba(59,41,37,0.03)]">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F0EAE1]">
            <h2 className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide">Top drinks</h2>
            <span className="text-[10px] font-medium text-[#C4B9AA] uppercase tracking-wide">Today</span>
          </div>
          <div className="divide-y divide-[#F7F3EB] mt-0.5">
            {state !== 'ready' ? (
              <div className="py-10 text-center text-xs text-[#C4B9AA]">
                {state === 'loading' ? 'Loading…' : 'Unavailable'}
              </div>
            ) : topSellingItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#C4B9AA]">No drinks sold yet today</div>
            ) : (
              topSellingItems.map((item, idx) => (
                <div key={item.name} className="py-3 flex items-center justify-between gap-3">
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
                    <span className="text-[11px] text-[#9B948C]">{item.qty} sold</span>
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
            {state !== 'ready' ? (
              <div className="py-10 text-center text-xs text-[#C4B9AA]">
                {state === 'loading' ? 'Loading…' : 'Unavailable'}
              </div>
            ) : recentSales.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#C4B9AA]">No completed transactions yet</div>
            ) : (
              recentSales.map(sale => {
                const saleTime = new Date(sale.createdAt).toLocaleTimeString('en-PH', {
                  timeZone: 'Asia/Manila',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div key={sale.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                      <span className="font-mono font-medium text-[#292929] tabular-nums">{sale.orderNumber}</span>
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
