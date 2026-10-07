import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';
import { Supplier, Purchase, InventoryItem, PurchaseItem } from '../../types';
import { formatPHP, parsePHPAmountToCents } from '../../services/storage';
import { dataService } from '../../services/dataService';

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
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [poStatus, setPoStatus] = useState<'received' | 'pending'>('received');
  const [poItems, setPoItems] = useState<PurchaseItem[]>([]);

  // Modal Error & Submitting State
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSupplier = async () => {
    setModalError(null);
    if (!supplierName.trim()) {
      setModalError('Please enter supplier company name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.saveSupplier({
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
      setSupplierEmail('');
      setSupplierAddress('');
      onRefreshData();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPoItem = (inventoryItemId: string) => {
    const inv = inventoryItems.find(i => i.id === inventoryItemId);
    if (!inv) return;
    if (poItems.some(i => i.inventoryItemId === inventoryItemId)) return;

    const newItem: PurchaseItem = {
      id: 'poi-' + Date.now() + '-' + Math.random().toString(36).substr(2, 3),
      inventoryItemId: inv.id,
      itemName: inv.name,
      unit: inv.unit,
      quantity: inv.unit === 'grams' ? 1000 : 10,
      unitCostCents: inv.costPerUnitCents || 50,
      totalCostCents: (inv.unit === 'grams' ? 1000 : 10) * (inv.costPerUnitCents || 50)
    };
    setPoItems(prev => [...prev, newItem]);
  };

  const handleUpdatePoItemQty = (id: string, qty: number) => {
    setPoItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          // Allow typing intermediate values, but clamp negatives; zero rejected on save
          const safeQty = Number.isFinite(qty) ? Math.max(0, qty) : 0;
          return {
            ...item,
            quantity: safeQty,
            totalCostCents: Math.round(safeQty * item.unitCostCents)
          };
        }
        return item;
      })
    );
  };

  const handleUpdatePoItemCost = (id: string, costPHP: number) => {
    const costCents = parsePHPAmountToCents(Math.max(0, costPHP));
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

  const effectiveSupplierId = selectedSupplierId || (suppliers[0]?.id ?? '');

  const handleSavePurchaseOrder = async () => {
    setModalError(null);
    if (isSubmitting) return;

    const supplier = suppliers.find(s => s.id === effectiveSupplierId) || suppliers[0];
    if (!supplier) {
      setModalError('Please register and choose a vendor supplier.');
      return;
    }
    if (poItems.length === 0) {
      setModalError('Please add at least one material/ingredient to the purchase order.');
      return;
    }
    const badQty = poItems.find(i => !i.quantity || i.quantity <= 0);
    if (badQty) {
      setModalError(`Quantity for "${badQty.itemName}" must be greater than zero.`);
      return;
    }
    const badCost = poItems.find(i => i.unitCostCents < 0);
    if (badCost) {
      setModalError(`Unit cost for "${badCost.itemName}" cannot be negative.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.recordPurchase({
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
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 max-w-6xl mx-auto overflow-y-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#292929]">Purchases & Vendors</h1>
          <p className="text-xs text-[#7A736C] mt-0.5">
            Vendor deliveries, coffee bean restocks, and purchase orders
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F7F3EB] p-1 rounded-xl border border-[#E8E2D9]">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'purchases'
                  ? 'bg-[#3B2925] text-white shadow-xs'
                  : 'text-[#6E6862] hover:text-[#292929]'
              }`}
            >
              Purchases ({purchases.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-[#3B2925] text-white shadow-xs'
                  : 'text-[#6E6862] hover:text-[#292929]'
              }`}
            >
              Vendors ({suppliers.length})
            </button>
          </div>

          <button
            onClick={() => {
              if (activeTab === 'suppliers') {
                setIsSupplierModalOpen(true);
              } else {
                setSelectedSupplierId(suppliers[0]?.id || '');
                setIsPurchaseModalOpen(true);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeTab === 'suppliers' ? 'Add Vendor' : 'Log Delivery'}</span>
          </button>
        </div>
      </div>

      {/* PURCHASES LIST TAB */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-[#FBF9F5] border-b border-[#E8E2D9] text-[#7A736C]">
              <tr>
                <th className="py-2.5 px-4 font-medium">Date</th>
                <th className="py-2.5 px-4 font-medium">Vendor</th>
                <th className="py-2.5 px-4 font-medium">Invoice #</th>
                <th className="py-2.5 px-4 font-medium">Delivered Items</th>
                <th className="py-2.5 px-4 font-medium text-center">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F7F3EB]">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#9B948C]">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map(po => {
                  const isReceived = po.status === 'received';
                  return (
                    <tr key={po.id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4 text-[#7A736C]">
                        {new Date(po.purchasedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#292929]">
                        {po.supplierName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#7A736C]">
                        {po.invoiceNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-[#6E6862]">
                        {po.items.map(i => `${i.quantity} ${i.unit} ${i.itemName}`).join(', ')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isReceived ? 'bg-[#A8B5A0]' : 'bg-[#DDD4C7]'
                            }`}
                          />
                          <span className="text-[#6E6862] capitalize">{po.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-[#292929]">
                        {formatPHP(po.totalAmountCents)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-[#E8E2D9] overflow-hidden shadow-xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-[#FBF9F5] border-b border-[#E8E2D9] text-[#7A736C]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Company Name</th>
                  <th className="py-2.5 px-4 font-medium">Contact Person</th>
                  <th className="py-2.5 px-4 font-medium">Phone</th>
                  <th className="py-2.5 px-4 font-medium">Email</th>
                  <th className="py-2.5 px-4 font-medium">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F3EB]">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-[#9B948C]">
                      No vendors listed yet. Click "Add Vendor" to register roasters and suppliers.
                    </td>
                  </tr>
                ) : (
                  suppliers.map(sup => (
                    <tr key={sup.id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4 font-medium text-[#292929]">
                        {sup.companyName}
                      </td>
                      <td className="py-3 px-4 text-[#6E6862]">{sup.contactPerson || '—'}</td>
                      <td className="py-3 px-4 text-[#7A736C] font-mono whitespace-nowrap">{sup.phone || '—'}</td>
                      <td className="py-3 px-4 text-[#7A736C]">{sup.email || '—'}</td>
                      <td className="py-3 px-4 text-[#7A736C] truncate max-w-xs">{sup.address || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW VENDOR MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#292929]">Add Vendor</h3>
                <p className="text-xs text-[#7A736C] mt-0.5">Register roastery or supplier</p>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Benguet Arabica Growers"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Juan Santos"
                  value={supplierContact}
                  onChange={e => setSupplierContact(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+63 9..."
                    value={supplierPhone}
                    onChange={e => setSupplierPhone(e.target.value)}
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs font-mono text-[#292929] outline-hidden focus:border-[#3B2925]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="orders@..."
                    value={supplierEmail}
                    onChange={e => setSupplierEmail(e.target.value)}
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Warehouse location"
                  value={supplierAddress}
                  onChange={e => setSupplierAddress(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>
            </div>

            <div className="p-4 bg-[#FBF9F5] border-t border-[#E8E2D9] flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsSupplierModalOpen(false);
                  setModalError(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSupplier}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PURCHASE ORDER MODAL */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden my-6">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#292929]">Receive Delivery / PO</h3>
                <p className="text-xs text-[#7A736C] mt-0.5">Record received beans or dairy</p>
              </div>
              <button
                onClick={() => {
                  setIsPurchaseModalOpen(false);
                  setModalError(null);
                }}
                className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Select Vendor *
                  </label>
                  {suppliers.length === 0 ? (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      No vendors listed. Please add a vendor first under the Vendors tab.
                    </div>
                  ) : (
                    <select
                      value={effectiveSupplierId}
                      onChange={e => setSelectedSupplierId(e.target.value)}
                      className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925] cursor-pointer"
                    >
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.companyName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Delivery Status
                  </label>
                  <select
                    value={poStatus}
                    onChange={e => setPoStatus(e.target.value as any)}
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                  >
                    <option value="received">Received & Restocked</option>
                    <option value="pending">Pending Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Invoice / Receipt # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-904"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs font-mono text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              {/* Items Section */}
              <div className="pt-2 border-t border-[#E8E2D9]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[#292929]">Delivered Materials</span>
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        handleAddPoItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs bg-white border border-[#E8E2D9] rounded-lg px-2 py-1 text-[#292929]"
                    defaultValue=""
                  >
                    <option value="" disabled>+ Add Material</option>
                    {inventoryItems.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.unit})
                      </option>
                    ))}
                  </select>
                </div>

                {poItems.length === 0 ? (
                  <p className="py-4 text-center text-[#9B948C] italic">
                    No items selected yet. Choose from the dropdown above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {poItems.map(item => (
                      <div
                        key={item.id}
                        className="p-3 bg-[#FBF9F5] rounded-xl border border-[#E8E2D9] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#292929] truncate">{item.itemName}</p>
                          <p className="text-[10px] text-[#7A736C]">Unit: {item.unit}</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#7A736C]">Qty:</span>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={e => handleUpdatePoItemQty(item.id, parseFloat(e.target.value) || 0)}
                              className="w-16 bg-white border border-[#E8E2D9] rounded-lg px-2 py-1 text-right font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#7A736C]">₱:</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitCostCents / 100}
                              onChange={e => handleUpdatePoItemCost(item.id, parseFloat(e.target.value) || 0)}
                              className="w-20 bg-white border border-[#E8E2D9] rounded-lg px-2 py-1 text-right font-mono"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePoItem(item.id)}
                            className="text-[#9B948C] hover:text-[#A25035] p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {poItems.length > 0 && (
                <div className="pt-2 border-t border-[#E8E2D9] flex justify-between font-bold text-sm">
                  <span>Total Amount</span>
                  <span className="font-mono text-[#3B2925]">{formatPHP(poTotalCents)}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#FBF9F5] border-t border-[#E8E2D9] flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsPurchaseModalOpen(false);
                  setModalError(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePurchaseOrder}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
