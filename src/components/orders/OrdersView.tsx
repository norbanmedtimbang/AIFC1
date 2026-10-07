import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Eye,
  X
} from 'lucide-react';
import { Sale, ShopSettings, User } from '../../types';
import { formatPHP } from '../../services/storage';
import { dataService } from '../../services/dataService';
import { ThermalReceiptModal } from '../shared/ThermalReceiptModal';
import { PinDialog } from '../shared/PinDialog';

interface OrdersViewProps {
  sales: Sale[];
  settings: ShopSettings;
  currentUser: User;
  onRefreshData: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  sales,
  settings,
  onRefreshData
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected Order for Inspector / Thermal Reprint
  const [selectedSaleForReprint, setSelectedSaleForReprint] = useState<Sale | null>(null);
  const [inspectedSale, setInspectedSale] = useState<Sale | null>(null);

  // Refund Flow State
  const [saleToRefund, setSaleToRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Customer changed mind / incorrect drink');
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchesSearch =
        s.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.payment.referenceNumber &&
          s.payment.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPayment = paymentFilter === 'all' || s.payment.method === paymentFilter;
      const matchesStatus = statusFilter === 'all' || s.paymentStatus === statusFilter;

      return matchesSearch && matchesPayment && matchesStatus;
    });
  }, [sales, searchQuery, paymentFilter, statusFilter]);

  const handleStartRefund = (sale: Sale) => {
    setRefundError(null);
    setSaleToRefund(sale);
    setIsPinDialogOpen(true);
  };

  const handleAuthorizedRefund = async (manager: User) => {
    setIsPinDialogOpen(false);
    if (!saleToRefund || isRefunding) return;

    setIsRefunding(true);
    setRefundError(null);
    try {
      await dataService.refundSale(
        saleToRefund.id,
        refundReason
      );

      setSaleToRefund(null);
      setInspectedSale(null);
      onRefreshData();
    } catch (err) {
      setRefundError('Refund failed: ' + (err as Error).message);
    } finally {
      setIsRefunding(false);
    }
  };

  const totalSalesCents = useMemo(() => {
    return sales
      .filter(s => s.paymentStatus === 'paid')
      .reduce((sum, s) => sum + s.totalCents, 0);
  }, [sales]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto w-full">
      {/* Refund Error Banner */}
      {refundError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{refundError}</span>
          </div>
          <button
            onClick={() => setRefundError(null)}
            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E8E2D9] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#292929]">Transactions</h1>
          <p className="text-xs text-[#7A736C] mt-0.5">
            Journal of all completed sales, payment references, and refunds
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#7A736C]">Total Sales: </span>
          <span className="text-sm font-bold font-mono text-[#292929]">
            {formatPHP(totalSalesCents)}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9B948C]" />
          <input
            type="text"
            placeholder="Search Order # or customer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E8E2D9] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="bg-white border border-[#E8E2D9] text-xs text-[#292929] rounded-xl px-2.5 py-1.5 outline-hidden focus:border-[#3B2925]"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
            <option value="maya">Maya</option>
            <option value="card_pos">Card POS</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-[#E8E2D9] text-xs text-[#292929] rounded-xl px-2.5 py-1.5 outline-hidden focus:border-[#3B2925]"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Clean Table with horizontal scroll container */}
      <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="bg-[#FBF9F5] border-b border-[#E8E2D9] text-[#7A736C]">
            <tr>
              <th className="py-2.5 px-4 font-medium">Order #</th>
              <th className="py-2.5 px-4 font-medium">Date & Time</th>
              <th className="py-2.5 px-4 font-medium">Customer</th>
              <th className="py-2.5 px-4 font-medium">Items</th>
              <th className="py-2.5 px-4 font-medium">Payment</th>
              <th className="py-2.5 px-4 font-medium">Total</th>
              <th className="py-2.5 px-4 font-medium text-center">Status</th>
              <th className="py-2.5 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F7F3EB]">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-[#9B948C]">
                  No transaction records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredSales.map(sale => {
                const isPaid = sale.paymentStatus === 'paid';
                return (
                  <tr key={sale.id} className="hover:bg-[#FAF7F2] transition">
                    <td className="py-2.5 px-4 font-mono text-[#292929]">
                      {sale.orderNumber}
                    </td>
                    <td className="py-2.5 px-4 text-[#7A736C]">
                      {new Date(sale.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: '2-digit'
                      })}{' '}
                      {new Date(sale.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 px-4 text-[#292929]">
                      {sale.customerName || 'Walk-in'}{sale.tableNumber ? ` · Table ${sale.tableNumber}` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-[#6E6862] truncate max-w-xs">
                      {sale.items
                        .map(i => `${i.quantity}x ${i.productNameSnapshot}`)
                        .join(', ')}
                    </td>
                    <td className="py-2.5 px-4 capitalize text-[#292929]">
                      {sale.payment.method.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-[#292929]">
                      {formatPHP(sale.totalCents)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isPaid ? 'bg-[#A8B5A0]' : 'bg-[#DDD4C7]'
                          }`}
                        />
                        <span className="text-[#6E6862] capitalize">
                          {sale.paymentStatus}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setInspectedSale(sale)}
                          title="View Order Details"
                          className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] hover:bg-[#F7F3EB] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedSaleForReprint(sale)}
                          title="Print Receipt"
                          className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] hover:bg-[#F7F3EB] cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {isPaid && (
                          <button
                            onClick={() => handleStartRefund(sale)}
                            title="Refund Sale"
                            className="p-1 rounded-lg text-[#9B948C] hover:text-[#A25035] hover:bg-red-50 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* INSPECTOR MODAL */}
      {inspectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#292929]">
                  Order {inspectedSale.orderNumber}
                </h3>
                <p className="text-xs text-[#7A736C] mt-0.5">
                  {new Date(inspectedSale.createdAt).toLocaleString()} · Cashier: {inspectedSale.cashierName}
                </p>
              </div>
              <button
                onClick={() => setInspectedSale(null)}
                className="p-1 text-[#7A736C] hover:text-[#292929] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto text-xs">
              <div className="space-y-2">
                <span className="font-medium text-[#7A736C] uppercase text-[10px]">
                  Order Items
                </span>
                <div className="divide-y divide-[#F7F3EB]">
                  {inspectedSale.items.map(item => (
                    <div key={item.id} className="py-2 flex justify-between">
                      <div>
                        <div className="font-medium text-[#292929]">
                          {item.quantity}x {item.productNameSnapshot} ({item.variantNameSnapshot})
                        </div>
                        {item.notes && (
                          <div className="text-[#7A736C] text-[11px] mt-0.5">{item.notes}</div>
                        )}
                      </div>
                      <span className="font-mono text-[#292929]">{formatPHP(item.subtotalCents)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E8E2D9] space-y-1">
                <div className="flex justify-between text-[#7A736C]">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatPHP(inspectedSale.subtotalCents)}</span>
                </div>
                {inspectedSale.discountCents > 0 && (
                  <div className="flex justify-between text-[#A25035]">
                    <span>Discount</span>
                    <span className="font-mono">-{formatPHP(inspectedSale.discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-[#292929] pt-1">
                  <span>Total</span>
                  <span className="font-mono">{formatPHP(inspectedSale.totalCents)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#FBF9F5] border-t border-[#E8E2D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSaleForReprint(inspectedSale);
                  setInspectedSale(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      <ThermalReceiptModal
        isOpen={Boolean(selectedSaleForReprint)}
        onClose={() => setSelectedSaleForReprint(null)}
        sale={selectedSaleForReprint}
        settings={settings}
      />

      {/* PIN DIALOG FOR REFUND */}
      <PinDialog
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        onSuccess={handleAuthorizedRefund}
        title="Manager PIN Authorization"
        description="Enter manager PIN to approve customer refund"
        allowedRoles={['admin', 'manager']}
      />
    </div>
  );
};
