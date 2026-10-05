import React, { useState } from 'react';
import {
  Package,
  Plus,
  History,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';
import { InventoryItem, InventoryMovement, InventoryMovementType } from '../../types';
import { formatPHP, parsePHPAmountToCents } from '../../services/storage';
import { dataService } from '../../services/dataService';

interface InventoryViewProps {
  inventoryItems: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  onRefreshData: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventoryItems,
  inventoryMovements,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');

  // Adjustment Modal State
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<InventoryMovementType>('waste');
  const [adjustQuantity, setAdjustQuantity] = useState('0');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Add Item Modal State
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemUnit, setNewItemUnit] = useState<InventoryItem['unit']>('grams');
  const [newItemStock, setNewItemStock] = useState('1000');
  const [newItemThreshold, setNewItemThreshold] = useState('200');
  const [newItemCostCents, setNewItemCostCents] = useState('50');

  // Filtered Items
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLow = filterMode === 'low' ? item.currentStock <= item.minThreshold : true;
    return matchesSearch && matchesLow;
  });

  const lowStockCount = inventoryItems.filter(i => i.currentStock <= i.minThreshold).length;

  const totalInventoryValuationCents = inventoryItems.reduce(
    (sum, item) => sum + Math.round(item.currentStock * item.costPerUnitCents),
    0
  );

  // Commit Adjustment
  const handleCommitAdjustment = async () => {
    if (!selectedItemForAdjust) return;
    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty) || qty === 0) {
      alert('Please enter a valid non-zero adjustment quantity.');
      return;
    }
    if (!adjustNotes.trim()) {
      alert('A reason/note is required for inventory audit integrity.');
      return;
    }

    const delta = adjustType === 'waste' || adjustType === 'spill' ? -Math.abs(qty) : qty;

    try {
      await dataService.adjustInventoryStock(
        selectedItemForAdjust.id,
        adjustType as any,
        delta,
        adjustNotes.trim()
      );

      setSelectedItemForAdjust(null);
      setAdjustQuantity('0');
      setAdjustNotes('');
      onRefreshData();
    } catch (err) {
      alert('Inventory adjustment failed: ' + (err as Error).message);
    }
  };

  // Add Item
  const handleAddNewItem = async () => {
    if (!newItemName.trim()) {
      alert('Please enter an item name.');
      return;
    }
    const item: InventoryItem = {
      id: 'inv-' + Date.now(),
      sku: newItemSku.trim() || undefined,
      name: newItemName.trim(),
      unit: newItemUnit,
      currentStock: parseFloat(newItemStock) || 0,
      minThreshold: parseFloat(newItemThreshold) || 10,
      costPerUnitCents: parsePHPAmountToCents(parseFloat(newItemCostCents) || 0),
      updatedAt: new Date().toISOString()
    };

    try {
      await dataService.saveInventoryItem(item);
      setIsNewItemModalOpen(false);
      setNewItemName('');
      setNewItemSku('');
      setNewItemStock('0');
      onRefreshData();
    } catch (err) {
      alert('Failed to save inventory item: ' + (err as Error).message);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto">
      {/* Top Header & Valuation */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#292929]">Inventory & Materials</h1>
          <p className="text-xs text-[#7A736C] mt-0.5">
            Total Valuation: <span className="font-mono font-medium text-[#292929]">{formatPHP(totalInventoryValuationCents)}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F7F3EB] p-1 rounded-xl border border-[#E8E2D9]">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === 'stock'
                  ? 'bg-[#3B2925] text-white shadow-xs'
                  : 'text-[#6E6862] hover:text-[#292929]'
              }`}
            >
              Stock Items ({inventoryItems.length})
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                activeTab === 'movements'
                  ? 'bg-[#3B2925] text-white shadow-xs'
                  : 'text-[#6E6862] hover:text-[#292929]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Ledger</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* STOCK TABLE TAB */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search ingredient or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
            />

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#3B2925] text-white shadow-xs'
                    : 'bg-white border border-[#E8E2D9] text-[#6E6862] hover:bg-[#F7F3EB]'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setFilterMode('low')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterMode === 'low'
                    ? 'bg-[#3B2925] text-white shadow-xs'
                    : 'bg-white border border-[#E8E2D9] text-[#6E6862] hover:bg-[#F7F3EB]'
                }`}
              >
                Low Stock ({lowStockCount})
              </button>
            </div>
          </div>

          {/* Clean Table */}
          <div className="bg-white rounded-xl border border-[#E8E2D9] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBF9F5] border-b border-[#E8E2D9] text-[#7A736C]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Material Name</th>
                  <th className="py-2.5 px-4 font-medium">Current Stock</th>
                  <th className="py-2.5 px-4 font-medium">Reorder Level</th>
                  <th className="py-2.5 px-4 font-medium">Unit Cost</th>
                  <th className="py-2.5 px-4 font-medium text-center">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F3EB]">
                {filteredItems.map(item => {
                  const isLow = item.currentStock <= item.minThreshold;
                  return (
                    <tr key={item.id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#292929]">{item.name}</div>
                        {item.sku && (
                          <div className="text-[10px] font-mono text-[#9B948C]">
                            {item.sku}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-mono font-medium ${isLow ? 'text-[#A25035]' : 'text-[#292929]'}`}>
                          {item.currentStock.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                        </span>{' '}
                        <span className="text-[11px] text-[#7A736C]">{item.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-[#7A736C] font-mono">
                        {item.minThreshold} {item.unit}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#292929]">
                        {formatPHP(item.costPerUnitCents)} / {item.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLow ? 'bg-[#A25035]' : 'bg-[#A8B5A0]'
                            }`}
                          />
                          <span className="text-[#6E6862]">
                            {isLow ? 'Low Stock' : 'Optimal'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedItemForAdjust(item);
                            setAdjustType('waste');
                            setAdjustQuantity('0');
                            setAdjustNotes('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#E8E2D9] hover:bg-[#F7F3EB] text-[#292929] text-xs font-medium transition cursor-pointer"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MOVEMENTS AUDIT LEDGER TAB */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-[#E8E2D9] overflow-hidden">
          <div className="p-3.5 bg-[#FBF9F5] border-b border-[#E8E2D9] flex items-center justify-between">
            <h4 className="text-xs font-medium text-[#292929]">
              Inventory Movement Audit Trail
            </h4>
            <span className="text-[11px] text-[#7A736C]">
              Auto-logged from sales, recipes, and manual adjustments
            </span>
          </div>

          <div className="divide-y divide-[#F7F3EB] max-h-[550px] overflow-y-auto">
            {inventoryMovements.length === 0 ? (
              <p className="p-8 text-center text-xs text-[#9B948C]">
                No inventory deductions logged yet.
              </p>
            ) : (
              inventoryMovements.map(m => (
                <div key={m.id} className="p-3 flex items-center justify-between text-xs hover:bg-[#FAF7F2]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        m.quantityDelta < 0
                          ? 'bg-stone-100 text-[#7A736C]'
                          : 'bg-[#F7F3EB] text-[#3B2925]'
                      }`}
                    >
                      {m.quantityDelta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#292929]">{m.itemName}</span>
                        <span className="text-[10px] text-[#7A736C] capitalize">
                          ({m.type.replace('_', ' ')})
                        </span>
                      </div>
                      <p className="text-[10px] text-[#7A736C] mt-0.5">
                        {m.notes || 'Routine deduction'} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-medium ${
                        m.quantityDelta < 0 ? 'text-[#A25035]' : 'text-[#6B8E5F]'
                      }`}
                    >
                      {m.quantityDelta > 0 ? '+' : ''}
                      {m.quantityDelta.toFixed(1)}
                    </span>
                    <span className="block text-[10px] text-[#9B948C] font-mono">
                      Bal: {m.balanceAfter.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {selectedItemForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#292929]">
                  Adjust Stock: {selectedItemForAdjust.name}
                </h3>
                <p className="text-xs text-[#7A736C] mt-0.5">
                  Current Balance: {selectedItemForAdjust.currentStock} {selectedItemForAdjust.unit}
                </p>
              </div>
              <button
                onClick={() => setSelectedItemForAdjust(null)}
                className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1.5">
                  Reason for Adjustment
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'waste', label: 'Waste / Expired' },
                    { id: 'spill', label: 'Spill / Dial-in' },
                    { id: 'count_adjustment', label: 'Count Audit' },
                    { id: 'purchase', label: 'Manual Restock' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAdjustType(t.id as any)}
                      className={`p-2 rounded-lg border text-xs font-medium text-center transition cursor-pointer ${
                        adjustType === t.id
                          ? 'bg-[#3B2925] text-white border-[#3B2925] shadow-xs'
                          : 'border-[#E8E2D9] hover:bg-[#FAF7F2] text-[#6E6862]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Quantity to adjust ({selectedItemForAdjust.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={adjustQuantity}
                  onChange={e => setAdjustQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 font-mono text-sm text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Reason / Notes *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grinder calibration dial-in"
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>
            </div>

            <div className="p-4 bg-[#FBF9F5] border-t border-[#E8E2D9] flex justify-end gap-2">
              <button
                onClick={() => setSelectedItemForAdjust(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitAdjustment}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer shadow-xs"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ITEM MODAL */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#292929]">Add New Material</h3>
                <p className="text-xs text-[#7A736C] mt-0.5">
                  Register coffee beans, milk, syrups, or cups
                </p>
              </div>
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. House Espresso Beans"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="RAW-01"
                    value={newItemSku}
                    onChange={e => setNewItemSku(e.target.value)}
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs font-mono text-[#292929] outline-hidden focus:border-[#3B2925]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Unit of Measure
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={e => setNewItemUnit(e.target.value as any)}
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                  >
                    <option value="grams">grams (g)</option>
                    <option value="ml">milliliters (ml)</option>
                    <option value="pcs">pieces (pcs)</option>
                    <option value="kg">kilograms (kg)</option>
                    <option value="liters">liters (L)</option>
                    <option value="shots">shots</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    value={newItemStock}
                    onChange={e => setNewItemStock(e.target.value)}
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs font-mono text-[#292929]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    value={newItemThreshold}
                    onChange={e => setNewItemThreshold(e.target.value)}
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs font-mono text-[#292929]"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#FBF9F5] border-t border-[#E8E2D9] flex justify-end gap-2">
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewItem}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer shadow-xs"
              >
                Save Material
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
