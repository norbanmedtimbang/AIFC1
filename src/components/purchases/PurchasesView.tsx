import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Building2,
  FileCheck,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  Check
} from 'lucide-react';
import { Supplier, Purchase, InventoryItem, PurchaseItem } from '../../types';
import { db, formatPHP, parsePHPAmountToCents } from '../../services/storage';

interface PurchasesViewProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  inventoryItems: InventoryItem[];
  onRefreshData: () => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  suppliers,
  purchases,
  inventoryItems,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');

  // New Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  // New Purchase Order Modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [poStatus, setPoStatus] = useState<'received' | 'pending'>('received');
  const [poItems, setPoItems] = useState<PurchaseItem[]>([]);

  const handleAddSupplier = () => {
    if (!supplierName.trim()) {
      alert('Please enter supplier company name.');
      return;
    }
    db.addSupplier({
      companyName: supplierName.trim(),
      contactPerson: supplierContact.trim() || undefined,
      phone: supplierPhone.trim() || undefined,
      email: supplierEmail.trim() || undefined,
      address: supplierAddress.trim() || undefined
    });
    setIsSupplierModalOpen(false);
    setSupplierName('');
    setSupplierContact('');
    setSupplierPhone('');
    onRefreshData();
  };

  const handleAddPoItem = (itemId: string) => {
    const inv = inventoryItems.find(i => i.id === itemId);
    if (!inv) return;
    const newItem: PurchaseItem = {
      id: 'poitem-' + Date.now(),
      inventoryItemId: inv.id,
      itemName: inv.name,
      unit: inv.unit,
      quantity: inv.unit === 'grams' ? 5000 : inv.unit === 'ml' ? 10000 : 100,
      unitCostCents: inv.costPerUnitCents || 100,
      totalCostCents: (inv.costPerUnitCents || 100) * (inv.unit === 'grams' ? 5000 : 100)
    };
    setPoItems(prev => [...prev, newItem]);
  };

  const handleUpdatePoItemQty = (id: string, qty: number) => {
    setPoItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const validQty = Math.max(0, qty);
          return {
            ...item,
            quantity: validQty,
            totalCostCents: Math.round(validQty * item.unitCostCents)
          };
        }
        return item;
      })
    );
  };

  const handleUpdatePoItemCost = (id: string, costPHP: number) => {
    const costCents = parsePHPAmountToCents(costPHP);
    setPoItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            unitCostCents: costCents,
            totalCostCents: Math.round(item.quantity * costCents)
          };
        }
        return item;
      })
    );
  };

  const handleRemovePoItem = (id: string) => {
    setPoItems(prev => prev.filter(i => i.id !== id));
  };

  const poTotalCents = poItems.reduce((sum, item) => sum + item.totalCostCents, 0);

  const handleSavePurchaseOrder = () => {
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) {
      alert('Please choose a supplier.');
      return;
    }
    if (poItems.length === 0) {
      alert('Please add at least one stock item to receive.');
      return;
    }

    db.recordPurchase({
      supplierId: supplier.id,
      supplierName: supplier.companyName,
      invoiceNumber: invoiceNumber.trim() || undefined,
      status: poStatus,
      totalAmountCents: poTotalCents,
      items: poItems
    });

    setIsPurchaseModalOpen(false);
    setPoItems([]);
    setInvoiceNumber('');
    onRefreshData();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-c5-beige pb-4">
        <div>
          <h2 className="text-xl font-bold text-c5-charcoal">Purchases & Vendor Logistics</h2>
          <p className="text-xs text-c5-charcoal-muted mt-0.5">
            Log bean roaster deliveries, dairy restocks, and packaging purchase orders
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-c5-cream p-1 rounded-xl border border-c5-beige">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'purchases'
                  ? 'bg-c5-espresso text-c5-cream shadow-xs'
                  : 'text-c5-charcoal hover:text-black'
              }`}
            >
              Purchase Orders ({purchases.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'suppliers'
                  ? 'bg-c5-espresso text-c5-cream shadow-xs'
                  : 'text-c5-charcoal hover:text-black'
              }`}
            >
              Suppliers Directory ({suppliers.length})
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === 'suppliers') {
                setIsSupplierModalOpen(true);
              } else {
                setIsPurchaseModalOpen(true);
              }
            }}
            className="px-4 py-2 rounded-xl bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'suppliers' ? 'Add Supplier' : 'Receive Delivery'}</span>
          </button>
        </div>
      </div>

      {/* PURCHASES LIST TAB */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-c5-beige overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-c5-cream/60 border-b border-c5-beige text-c5-charcoal-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">PO / Invoice #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Items Received</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-c5-beige/60">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-c5-charcoal-muted">
                      No purchase orders recorded yet. Click "Receive Delivery" to log incoming stock.
                    </td>
                  </tr>
                ) : (
                  purchases.map(po => (
                    <tr key={po.id} className="hover:bg-c5-cream/20 transition">
                      <td className="py-3 px-4 font-mono font-bold text-c5-charcoal">
                        {po.invoiceNumber || po.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-c5-charcoal">
                        {po.supplierName}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-c5-charcoal-muted">
                        {po.items.map(i => `${i.quantity} ${i.unit} ${i.itemName}`).join(', ')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-c5-espresso">
                        {formatPHP(po.totalAmountCents)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            po.status === 'received'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-c5-charcoal-muted">
                        {new Date(po.purchasedAt).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map(sup => (
            <div
              key={sup.id}
              className="bg-white p-5 rounded-2xl border border-c5-beige shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-c5-charcoal">{sup.companyName}</h4>
                  {sup.contactPerson && (
                    <p className="text-xs text-c5-charcoal-muted mt-0.5">
                      Rep: {sup.contactPerson}
                    </p>
                  )}
                </div>
                <div className="p-2 bg-c5-cream rounded-xl text-c5-espresso">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1 text-xs text-c5-charcoal pt-2 border-t border-c5-beige/60">
                {sup.phone && <div>📞 {sup.phone}</div>}
                {sup.email && <div>✉️ {sup.email}</div>}
                {sup.address && <div className="text-[11px] text-c5-charcoal-muted mt-1">📍 {sup.address}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RECEIVE DELIVERY / PURCHASE MODAL */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden my-6">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Receive Stock Delivery & Restock</h3>
                <p className="text-xs text-c5-beige/80 mt-0.5">
                  Incoming quantities will automatically increment raw inventory levels
                </p>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                    Select Supplier *
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                    Delivery Receipt / Invoice #
                  </label>
                  <input
                    type="text"
                    placeholder="DR-89210 or INV-1092"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="pt-2 border-t border-c5-beige space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal">
                    Delivered Items & Pricing
                  </label>
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        handleAddPoItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs bg-c5-cream border border-c5-beige rounded-lg px-2.5 py-1 text-c5-charcoal"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      + Add Raw Material...
                    </option>
                    {inventoryItems.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  {poItems.length === 0 ? (
                    <p className="p-4 text-center text-xs text-c5-charcoal-muted bg-c5-cream/40 rounded-xl">
                      Select items above to record delivery quantities.
                    </p>
                  ) : (
                    poItems.map(item => (
                      <div
                        key={item.id}
                        className="p-3 bg-c5-cream/40 rounded-xl border border-c5-beige grid grid-cols-4 items-center gap-2 text-xs"
                      >
                        <div className="col-span-1">
                          <p className="font-bold text-c5-charcoal leading-snug">{item.itemName}</p>
                          <span className="text-[10px] text-c5-charcoal-muted font-semibold">
                            {item.unit}
                          </span>
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold text-c5-charcoal-muted block">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e =>
                              handleUpdatePoItemQty(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-white border border-c5-beige rounded-md px-2 py-1 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-bold text-c5-charcoal-muted block">
                            Cost (₱ / unit)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitCostCents / 100}
                            onChange={e =>
                              handleUpdatePoItemCost(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-white border border-c5-beige rounded-md px-2 py-1 font-mono"
                          />
                        </div>
                        <div className="flex items-center justify-between pl-2">
                          <span className="font-mono font-bold text-c5-espresso">
                            {formatPHP(item.totalCostCents)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePoItem(item.id)}
                            className="text-c5-charcoal-light hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total & Auto-restock Check */}
              <div className="p-3 rounded-xl bg-c5-cream flex items-center justify-between border border-c5-beige">
                <span className="text-xs font-bold text-c5-charcoal">Total PO Payable:</span>
                <span className="text-lg font-black font-mono text-c5-charcoal">
                  {formatPHP(poTotalCents)}
                </span>
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePurchaseOrder}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark transition shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Restock Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <h3 className="font-bold text-base">Register Vendor / Supplier</h3>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Benguet Specialty Coffee Cooperative"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
                />
              </div>
              <div>
                <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="Account Rep Name"
                  value={supplierContact}
                  onChange={e => setSupplierContact(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+63 9XX XXX XXXX"
                    value={supplierPhone}
                    onChange={e => setSupplierPhone(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
                  />
                </div>
                <div>
                  <label className="font-bold text-c5-charcoal block mb-1 uppercase text-[10px]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="sales@vendor.ph"
                    value={supplierEmail}
                    onChange={e => setSupplierEmail(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 outline-hidden focus:border-c5-espresso"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSupplier}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark"
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
