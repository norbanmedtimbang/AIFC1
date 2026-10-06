import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Sale, ShopSettings } from '../../types';
import { formatPHP } from '../../services/storage';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings: ShopSettings;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings
}) => {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(sale.createdAt).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-backdrop">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6 animate-in">
        {/* Modal Toolbar */}
        <div className="bg-[#F7F3EB] border-b border-[#E8E2D9] px-5 py-3.5 flex items-center justify-between no-print">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4.5 h-4.5 text-[#A8B5A0]" />
            <span className="text-sm font-semibold text-[#292929]">
              Receipt — {sale.orderNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-medium rounded-lg transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#9B948C] hover:text-[#292929] hover:bg-[#E8E2D9] rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal Paper Container */}
        <div className="p-6 bg-[#F5F2EB] flex justify-center">
          <div
            id="printable-receipt"
            className="w-[300px] bg-white p-6 rounded-xl shadow-md border border-dashed border-stone-300 text-stone-900 font-mono text-[11px] leading-tight select-text"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-stone-400">
              <h2 className="text-base font-black tracking-wider text-black">{settings.storeName}</h2>
              <p className="text-[10px] text-stone-700 font-bold uppercase mt-0.5">{settings.tagline}</p>
              <p className="text-[10px] text-stone-700 mt-1 font-semibold">{settings.branchName}</p>
              <p className="text-[9px] text-stone-600 mt-0.5">{settings.address}</p>
              <p className="text-[9px] text-stone-600">{settings.phone}</p>
              <p className="text-[9px] text-stone-800 font-black mt-0.5">{settings.tinNumber}</p>
              {settings.receiptHeader && (
                <p className="text-[9px] text-stone-700 mt-1.5 whitespace-pre-line font-medium italic">
                  {settings.receiptHeader}
                </p>
              )}
            </div>

            {/* Transaction Info */}
            <div className="py-2.5 border-b border-dashed border-stone-400 text-[10px] space-y-1">
              <div className="flex justify-between font-bold">
                <span>ORDER #:</span>
                <span className="text-black font-black">{sale.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span className="font-semibold">{sale.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>ORDER TYPE:</span>
                <span className="font-black uppercase tracking-wider">
                  {sale.orderType.replace('_', ' ')}
                </span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between font-semibold">
                  <span>CUSTOMER:</span>
                  <span>{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="py-2.5 border-b border-dashed border-stone-400">
              <div className="flex justify-between font-black pb-1 text-[10px] border-b border-stone-200 text-black">
                <span className="w-1/2">ITEM</span>
                <span className="w-1/6 text-center">QTY</span>
                <span className="w-1/3 text-right">TOTAL</span>
              </div>
              <div className="space-y-1.5 pt-1.5">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="text-[10px]">
                    <div className="flex justify-between font-bold">
                      <span className="w-1/2 truncate pr-1 text-black">
                        {item.productNameSnapshot}
                      </span>
                      <span className="w-1/6 text-center">{item.quantity}</span>
                      <span className="w-1/3 text-right font-black">
                        {formatPHP(item.subtotalCents)}
                      </span>
                    </div>
                    <div className="text-[9px] text-stone-600 pl-2 font-medium">
                      <span>• {item.variantNameSnapshot}</span>
                      {item.modifiers.map((m, mIdx) => (
                        <span key={mIdx} className="block pl-1">
                          + {m.modifierNameSnapshot}{' '}
                          {m.priceCents > 0 ? `(${formatPHP(m.priceCents)})` : ''}
                        </span>
                      ))}
                      {item.notes && <span className="block italic pl-1 text-amber-900">Note: {item.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[10px]">
              <div className="flex justify-between font-semibold">
                <span>SUBTOTAL:</span>
                <span>{formatPHP(sale.subtotalCents)}</span>
              </div>
              {sale.discountCents > 0 && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>DISCOUNT ({sale.discountLabel || 'PROMO'}):</span>
                  <span>-{formatPHP(sale.discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black pt-1.5 border-t border-stone-300 text-black">
                <span>TOTAL AMOUNT:</span>
                <span className="text-sm font-black">{formatPHP(sale.totalCents)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[10px]">
              <div className="flex justify-between font-bold">
                <span>PAYMENT METHOD:</span>
                <span className="uppercase text-black">{sale.payment.method.replace('_', ' ')}</span>
              </div>
              {sale.payment.method === 'cash' ? (
                <>
                  <div className="flex justify-between">
                    <span>TENDERED CASH:</span>
                    <span>{formatPHP(sale.payment.tenderedCents)}</span>
                  </div>
                  <div className="flex justify-between font-black text-xs text-black">
                    <span>CHANGE:</span>
                    <span>{formatPHP(sale.payment.changeCents)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>REF / AUTH CODE:</span>
                  <span className="font-black text-black">{sale.payment.referenceNumber || 'CONFIRMED'}</span>
                </div>
              )}
            </div>

            {/* Tax Breakdown */}
            <div className="py-2 border-b border-dashed border-stone-400 text-[9px] text-stone-600 space-y-0.5 font-medium">
              <div className="flex justify-between">
                <span>VATABLE SALES:</span>
                <span>{formatPHP(sale.totalCents - sale.taxCents)}</span>
              </div>
              <div className="flex justify-between">
                <span>12% VAT:</span>
                <span>{formatPHP(sale.taxCents)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[9px] text-stone-600 space-y-1">
              {settings.receiptFooter ? (
                <p className="whitespace-pre-line font-medium">{settings.receiptFooter}</p>
              ) : (
                <p className="font-bold">THANK YOU FOR SUPPORTING SPECIALTY COFFEE!</p>
              )}
              <div className="font-black tracking-widest pt-2 text-stone-800 text-[11px]">||| | | ||||| | ||| ||||</div>
              <p className="text-[8px] text-stone-500 font-mono font-bold">C5ISR SYSTEM — OFFLINE TERMINAL 1</p>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-white p-4 border-t border-[#E8E2D9] flex justify-end gap-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#F7F3EB] transition border border-[#E8E2D9] cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-[#3B2925] hover:bg-[#2C1E1A] transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
