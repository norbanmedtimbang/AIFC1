import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  X
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
    setSupplierEmail('');
    setSupplierAddress('');
    onRefreshData();
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
          return {
            ...item,
            quantity: qty,
            totalCostCents: Math.round(qty * item.unitCostCents)
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
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#292929]">Purchases & Vendors</h1>
          <p className="text-xs text-[#7A736C] mt-0.5">
            Vendor deliveries, coffee bean restocks, and purchase orders
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2">
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
        <div className="bg-white rounded-xl border border-[#E8E2D9] overflow-hidden">
          <table className="w-full text-left text-xs">
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
      )}

      {/* SUPPLIERS TAB */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-[#E8E2D9] overflow-hidden">
          <table className="w-full text-left text-xs">
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
                    <td className="py-3 px-4 text-[#7A736C] font-mono">{sup.phone || '—'}</td>
                    <td className="py-3 px-4 text-[#7A736C]">{sup.email || '—'}</td>
                    <td className="py-3 px-4 text-[#7A736C] truncate max-w-xs">{sup.address || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                onClick={() => setIsSupplierModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSupplier}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer shadow-xs"
              >
                Save Vendor
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
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Select Vendor *
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
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
                        className="p-2.5 bg-[#FBF9F5] rounded-xl border border-[#E8E2D9] flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 truncate">
                          <p className="font-medium text-[#292929] truncate">{item.itemName}</p>
                          <p className="text-[10px] text-[#7A736C]">Unit: {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => handleUpdatePoItemQty(item.id, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-white border border-[#E8E2D9] rounded px-1.5 py-0.5 text-right font-mono"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitCostCents / 100}
                            onChange={e => handleUpdatePoItemCost(item.id, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-white border border-[#E8E2D9] rounded px-1.5 py-0.5 text-right font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePoItem(item.id)}
                            className="text-[#9B948C] hover:text-[#A25035] p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                onClick={() => setIsPurchaseModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePurchaseOrder}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer shadow-xs"
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
