import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  Plus,
  RefreshCw,
  History,
  TrendingDown,
  TrendingUp,
  FileText,
  Check,
  X
} from 'lucide-react';
import { InventoryItem, InventoryMovement, InventoryMovementType } from '../../types';
import { db, formatPHP, parsePHPAmountToCents } from '../../services/storage';

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
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Adjustment Modal
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<InventoryMovementType>('waste');
  const [adjustQuantity, setAdjustQuantity] = useState<string>('0');
  const [adjustNotes, setAdjustNotes] = useState<string>('');

  // New Item Modal
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemUnit, setNewItemUnit] = useState<InventoryItem['unit']>('grams');
  const [newItemStock, setNewItemStock] = useState('0');
  const [newItemThreshold, setNewItemThreshold] = useState('100');
  const [newItemCostCents, setNewItemCostCents] = useState('100');

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
  const handleCommitAdjustment = () => {
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

    // Negative for waste / spill
    const delta = adjustType === 'waste' || adjustType === 'spill' ? -Math.abs(qty) : qty;

    db.adjustInventoryStock(
      selectedItemForAdjust.id,
      adjustType as any,
      delta,
      adjustNotes.trim()
    );

    setSelectedItemForAdjust(null);
    setAdjustQuantity('0');
    setAdjustNotes('');
    onRefreshData();
  };

  // Add Item
  const handleAddNewItem = () => {
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

    db.saveInventoryItem(item);
    setIsNewItemModalOpen(false);
    setNewItemName('');
    setNewItemSku('');
    setNewItemStock('0');
    onRefreshData();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header & Valuation Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-c5-beige pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-c5-charcoal">Raw Materials & Inventory</h2>
            {lowStockCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                {lowStockCount} items low
              </span>
            )}
          </div>
          <p className="text-xs text-c5-charcoal-muted mt-0.5">
            Total Inventory Valuation: <strong className="text-c5-espresso font-mono">{formatPHP(totalInventoryValuationCents)}</strong>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-c5-cream p-1 rounded-xl border border-c5-beige">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'stock'
                  ? 'bg-c5-espresso text-c5-cream shadow-xs'
                  : 'text-c5-charcoal hover:text-black'
              }`}
            >
              Stock Table ({inventoryItems.length})
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                activeTab === 'movements'
                  ? 'bg-c5-espresso text-c5-cream shadow-xs'
                  : 'text-c5-charcoal hover:text-black'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Ledger ({inventoryMovements.length})</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewItemModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* STOCK TABLE TAB */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Search by ingredient, packaging or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-80 bg-white border border-c5-beige rounded-xl px-3.5 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
            />

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filterMode === 'all'
                    ? 'bg-c5-espresso text-c5-cream'
                    : 'bg-white border border-c5-beige text-c5-charcoal hover:bg-c5-cream'
                }`}
              >
                All Items ({inventoryItems.length})
              </button>
              <button
                onClick={() => setFilterMode('low')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  filterMode === 'low'
                    ? 'bg-rose-700 text-white'
                    : 'bg-white border border-c5-beige text-rose-700 hover:bg-rose-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock ({lowStockCount})</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-c5-beige overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-c5-cream/60 border-b border-c5-beige text-c5-charcoal-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Raw Item / SKU</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Min. Threshold</th>
                  <th className="py-3 px-4">Unit Cost (Est.)</th>
                  <th className="py-3 px-4 text-center">Health Status</th>
                  <th className="py-3 px-4 text-right">Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-c5-beige/60">
                {filteredItems.map(item => {
                  const isLow = item.currentStock <= item.minThreshold;
                  return (
                    <tr key={item.id} className="hover:bg-c5-cream/20 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-c5-charcoal">{item.name}</div>
                        <div className="text-[10px] font-mono text-c5-charcoal-light">
                          {item.sku || 'RAW-MAT'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono text-sm font-black ${
                            isLow ? 'text-rose-700' : 'text-c5-charcoal'
                          }`}
                        >
                          {item.currentStock.toLocaleString('en-US', {
                            maximumFractionDigits: 1
                          })}
                        </span>{' '}
                        <span className="text-[11px] text-c5-charcoal-muted uppercase font-semibold">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-c5-charcoal-muted">
                          {item.minThreshold} {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-c5-charcoal">
                          {formatPHP(item.costPerUnitCents)} / {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isLow
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isLow ? 'Low Stock' : 'Optimal'}
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
                          className="px-3 py-1.5 rounded-lg bg-c5-cream border border-c5-beige hover:bg-c5-beige text-c5-charcoal font-semibold text-xs transition"
                        >
                          Adjust / Spill
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
        <div className="bg-white rounded-2xl border border-c5-beige overflow-hidden shadow-xs">
          <div className="p-4 bg-c5-cream/40 border-b border-c5-beige flex items-center justify-between">
            <h4 className="font-bold text-xs text-c5-charcoal uppercase tracking-wider">
              Automated Inventory Movement Audit Trail
            </h4>
            <span className="text-[11px] text-c5-charcoal-muted">
              Auto-deducted from sales recipes, purchases, and manual spills
            </span>
          </div>

          <div className="divide-y divide-c5-beige/60 max-h-[600px] overflow-y-auto">
            {inventoryMovements.length === 0 ? (
              <p className="p-8 text-center text-xs text-c5-charcoal-muted">
                No inventory deductions logged yet. Complete sales in the POS to see automatic recipe deductions.
              </p>
            ) : (
              inventoryMovements.map(m => (
                <div key={m.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-c5-cream/20">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        m.quantityDelta < 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {m.quantityDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-c5-charcoal">{m.itemName}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold bg-c5-beige/60 text-c5-charcoal">
                          {m.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[10px] text-c5-charcoal-muted mt-0.5">
                        {m.notes || 'Routine transaction'} • By {m.createdBy} •{' '}
                        {new Date(m.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-sm ${
                        m.quantityDelta < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {m.quantityDelta > 0 ? '+' : ''}
                      {m.quantityDelta.toFixed(1)}
                    </span>
                    <span className="block text-[10px] text-c5-charcoal-muted font-mono">
                      Balance: {m.balanceAfter.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADJUST / SPILL MODAL */}
      {selectedItemForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Adjust Stock: {selectedItemForAdjust.name}</h3>
                <p className="text-xs text-c5-beige mt-0.5">
                  Current Stock: {selectedItemForAdjust.currentStock} {selectedItemForAdjust.unit}
                </p>
              </div>
              <button
                onClick={() => setSelectedItemForAdjust(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'waste', label: 'Waste / Expired' },
                    { id: 'spill', label: 'Spill / Dial-in Shot' },
                    { id: 'count_adjustment', label: 'Audit Adjustment' },
                    { id: 'purchase', label: 'Manual Restock' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAdjustType(t.id as any)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition ${
                        adjustType === t.id
                          ? 'bg-c5-espresso text-c5-cream border-c5-espresso'
                          : 'border-c5-beige hover:bg-c5-cream text-c5-charcoal'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                  Quantity ({selectedItemForAdjust.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={adjustQuantity}
                  onChange={e => setAdjustQuantity(e.target.value)}
                  placeholder="e.g. 50 or 500"
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-sm font-bold font-mono text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                  Reason / Notes *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grinder calibration dial-in waste, milk spilled on counter"
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                onClick={() => setSelectedItemForAdjust(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitAdjustment}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark transition shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Adjustment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ITEM MODAL */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Add New Inventory Material</h3>
                <p className="text-xs text-c5-beige mt-0.5">
                  Register beans, dairy, syrups, or packaging cups
                </p>
              </div>
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Colombian Supremo Beans, 8oz Hot Cups"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="RAW-MAT-01"
                    value={newItemSku}
                    onChange={e => setNewItemSku(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs font-mono text-c5-charcoal outline-hidden focus:border-c5-espresso"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                    Unit of Measure
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={e => setNewItemUnit(e.target.value as any)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
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
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    value={newItemStock}
                    onChange={e => setNewItemStock(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs font-mono text-c5-charcoal"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                    Min Reorder Point
                  </label>
                  <input
                    type="number"
                    value={newItemThreshold}
                    onChange={e => setNewItemThreshold(e.target.value)}
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs font-mono text-c5-charcoal"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                onClick={() => setIsNewItemModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewItem}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Create Material</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
