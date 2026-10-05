import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import { Sale, ShopSettings, User } from '../../types';
import { db, formatPHP } from '../../services/storage';
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
  const [restockInventory, setRestockInventory] = useState(true);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);

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
    setSaleToRefund(sale);
    setIsPinDialogOpen(true);
  };

  const handleAuthorizedRefund = (manager: User) => {
    setIsPinDialogOpen(false);
    if (!saleToRefund) return;

    db.refundSale(
      saleToRefund.id,
      refundReason,
      manager.pinHash,
      restockInventory
    );

    setSaleToRefund(null);
    setInspectedSale(null);
    onRefreshData();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-c5-beige pb-4">
        <div>
          <h2 className="text-xl font-bold text-c5-charcoal">Transactions & Order Journal</h2>
          <p className="text-xs text-c5-charcoal-muted mt-0.5">
            Immutable offline ledger of all completed sales, payment references, and refunds
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-c5-charcoal-muted">All-Time Recorded Sales:</span>
          <p className="text-lg font-black font-mono text-c5-charcoal">
            {formatPHP(
              sales
                .filter(s => s.paymentStatus === 'paid')
                .reduce((sum, s) => sum + s.totalCents, 0)
            )}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-c5-charcoal-muted" />
          <input
            type="text"
            placeholder="Search Order #, customer, ref code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-c5-beige rounded-xl pl-10 pr-3.5 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Payment filter */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="bg-white border border-c5-beige text-xs text-c5-charcoal rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
          >
            <option value="all">All Payment Types</option>
            <option value="cash">Cash (PHP)</option>
            <option value="gcash">GCash</option>
            <option value="maya">Maya</option>
            <option value="card_pos">Card POS</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-c5-beige text-xs text-c5-charcoal rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid & Completed</option>
            <option value="refunded">Refunded / Voided</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-c5-beige overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-c5-cream/60 border-b border-c5-beige text-c5-charcoal-muted uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Customer & Type</th>
              <th className="py-3 px-4">Items Summary</th>
              <th className="py-3 px-4">Payment / Ref</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-c5-beige/60">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-c5-charcoal-muted">
                  No transaction records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredSales.map(sale => {
                const isPaid = sale.paymentStatus === 'paid';
                return (
                  <tr key={sale.id} className="hover:bg-c5-cream/20 transition">
                    <td className="py-3 px-4 font-mono font-bold text-c5-charcoal">
                      {sale.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-c5-charcoal-muted">
                      {new Date(sale.createdAt).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-c5-charcoal">
                        {sale.customerName || 'Walk-in'}
                      </div>
                      <span className="text-[10px] text-c5-charcoal-muted uppercase">
                        {sale.orderType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-c5-charcoal">
                      <span className="font-medium">
                        {sale.items
                          .map(i => `${i.quantity}x ${i.productNameSnapshot}`)
                          .join(', ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-c5-cream border border-c5-beige text-c5-charcoal">
                        {sale.payment.method}
                      </span>
                      {sale.payment.referenceNumber && (
                        <span className="block text-[10px] font-mono text-c5-charcoal-muted mt-0.5">
                          Ref: {sale.payment.referenceNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-c5-charcoal">
                      {formatPHP(sale.totalCents)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectedSale(sale)}
                          className="p-1.5 hover:bg-c5-cream rounded-lg text-c5-charcoal transition"
                          title="Inspect Order"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedSaleForReprint(sale)}
                          className="p-1.5 hover:bg-c5-cream rounded-lg text-c5-charcoal transition"
                          title="Reprint Thermal Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {isPaid && (
                          <button
                            onClick={() => handleStartRefund(sale)}
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                            title="Refund / Void Transaction"
                          >
                            <RotateCcw className="w-4 h-4" />
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

      {/* INSPECT ORDER DRAWER / MODAL */}
      {inspectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Order Details — {inspectedSale.orderNumber}</h3>
                <p className="text-xs text-c5-beige/80 mt-0.5">
                  Rung up by {inspectedSale.cashierName} •{' '}
                  {new Date(inspectedSale.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectedSale(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-c5-cream border border-c5-beige">
                <div>
                  <span className="text-[10px] uppercase font-bold text-c5-charcoal-muted">
                    Transaction Status
                  </span>
                  <p className="font-bold text-sm uppercase text-c5-charcoal">
                    {inspectedSale.paymentStatus}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-c5-charcoal-muted">
                    Total Amount
                  </span>
                  <p className="font-mono font-black text-base text-c5-charcoal">
                    {formatPHP(inspectedSale.totalCents)}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-c5-charcoal-muted">
                  Itemized Line Items
                </label>
                <div className="divide-y divide-c5-beige/60 border border-c5-beige rounded-xl p-3 bg-white">
                  {inspectedSale.items.map((item, idx) => (
                    <div key={idx} className="py-2 first:pt-0 last:pb-0 flex justify-between">
                      <div>
                        <span className="font-bold text-c5-charcoal">
                          {item.quantity}x {item.productNameSnapshot}
                        </span>
                        <p className="text-[11px] text-c5-charcoal-muted">
                          {item.variantNameSnapshot}
                        </p>
                        {item.modifiers.map((m, mIdx) => (
                          <span key={mIdx} className="block text-[10px] text-c5-charcoal-light">
                            + {m.modifierNameSnapshot}{' '}
                            {m.priceCents > 0 && `(${formatPHP(m.priceCents)})`}
                          </span>
                        ))}
                      </div>
                      <span className="font-mono font-bold text-c5-charcoal">
                        {formatPHP(item.subtotalCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details */}
              <div className="p-3 rounded-xl bg-c5-cream/40 border border-c5-beige space-y-1">
                <div className="flex justify-between">
                  <span className="text-c5-charcoal-muted">Subtotal:</span>
                  <span className="font-mono">{formatPHP(inspectedSale.subtotalCents)}</span>
                </div>
                {inspectedSale.discountCents > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span className="font-mono">-{formatPHP(inspectedSale.discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-c5-charcoal-muted">Payment Tendered:</span>
                  <span className="font-mono">
                    {formatPHP(inspectedSale.payment.tenderedCents)} ({inspectedSale.payment.method.toUpperCase()})
                  </span>
                </div>
                {inspectedSale.payment.changeCents > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Change:</span>
                    <span className="font-mono">{formatPHP(inspectedSale.payment.changeCents)}</span>
                  </div>
                )}
                {inspectedSale.payment.referenceNumber && (
                  <div className="flex justify-between pt-1 border-t border-c5-beige/60">
                    <span className="text-c5-charcoal-muted">Reference / Approval Code:</span>
                    <span className="font-mono font-bold">
                      {inspectedSale.payment.referenceNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-between gap-3">
              {inspectedSale.paymentStatus === 'paid' && (
                <button
                  type="button"
                  onClick={() => handleStartRefund(inspectedSale)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Void / Refund Order</span>
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setInspectedSale(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSaleForReprint(inspectedSale);
                    setInspectedSale(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Reprint Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPRINT THERMAL RECEIPT MODAL */}
      <ThermalReceiptModal
        isOpen={Boolean(selectedSaleForReprint)}
        onClose={() => setSelectedSaleForReprint(null)}
        sale={selectedSaleForReprint}
        settings={settings}
      />

      {/* MANAGER PIN DIALOG FOR REFUNDS */}
      <PinDialog
        isOpen={isPinDialogOpen}
        onClose={() => {
          setIsPinDialogOpen(false);
          setSaleToRefund(null);
        }}
        onSuccess={handleAuthorizedRefund}
        title="Manager Authorization Required"
        description="Enter Manager or Admin 4-digit PIN to authorize refund"
        allowedRoles={['admin', 'manager']}
      />
    </div>
  );
};
