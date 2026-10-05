import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
  Tag,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Coffee,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import {
  Product,
  ProductVariant,
  Modifier,
  ModifierGroup,
  CartItem,
  PaymentMethod,
  OrderType,
  Sale,
  ShopSettings,
  CashierShift,
  User
} from '../../types';
import { db, formatPHP } from '../../services/storage';
import { ThermalReceiptModal } from '../shared/ThermalReceiptModal';

interface POSViewProps {
  products: Product[];
  categories: { id: string; name: string }[];
  modifierGroups: ModifierGroup[];
  settings: ShopSettings;
  currentUser?: User;
  activeShift: CashierShift | null;
  onRefreshData: () => void;
  onOpenShiftModal: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  categories,
  modifierGroups,
  settings,
  activeShift,
  onRefreshData,
  onOpenShiftModal
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [customerName, setCustomerName] = useState<string>('');
  const [discountType, setDiscountType] = useState<'none' | 'senior' | 'pwd' | 'staff' | 'custom'>('none');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(10);

  // Customizer Modal State
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [customizerNotes, setCustomizerNotes] = useState<string>('');

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [isConfirmedOnlineRef, setIsConfirmedOnlineRef] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Completed Receipt Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [inventoryWarnings, setInventoryWarnings] = useState<string[]>([]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.isActive) return false;
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Totals
  const subtotalCents = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPriceCents, 0);
  }, [cart]);

  const discountDetails = useMemo(() => {
    if (subtotalCents === 0 || discountType === 'none') {
      return { cents: 0, label: '' };
    }
    if (discountType === 'senior') {
      return { cents: Math.round(subtotalCents * 0.20), label: 'Senior Citizen (20%)' };
    }
    if (discountType === 'pwd') {
      return { cents: Math.round(subtotalCents * 0.20), label: 'PWD Discount (20%)' };
    }
    if (discountType === 'staff') {
      return { cents: Math.round(subtotalCents * 0.10), label: 'Barista / Staff (10%)' };
    }
    if (discountType === 'custom') {
      const pct = Math.min(100, Math.max(0, customDiscountPercent));
      return { cents: Math.round(subtotalCents * (pct / 100)), label: `Custom (${pct}%)` };
    }
    return { cents: 0, label: '' };
  }, [subtotalCents, discountType, customDiscountPercent]);

  const totalCents = Math.max(0, subtotalCents - discountDetails.cents);

  // Open Customizer for a product
  const handleSelectProduct = (product: Product) => {
    setCustomizingProduct(product);
    setSelectedVariant(product.variants[0] || null);
    setSelectedModifiers([]);
    setCustomizerNotes('');
  };

  // Modifier toggle
  const toggleModifier = (mod: Modifier, maxSelection: number) => {
    setSelectedModifiers(prev => {
      const alreadySelected = prev.some(m => m.id === mod.id);
      if (alreadySelected) {
        return prev.filter(m => m.id !== mod.id);
      }
      if (maxSelection === 1) {
        const withoutGroup = prev.filter(m => m.groupId !== mod.groupId);
        return [...withoutGroup, mod];
      }
      return [...prev, mod];
    });
  };

  // Add customized product to Cart
  const handleAddToCart = () => {
    if (!customizingProduct || !selectedVariant) return;

    const modifiersCost = selectedModifiers.reduce((sum, m) => sum + m.priceCents, 0);
    const unitPriceCents = selectedVariant.priceCents + modifiersCost;

    const newItem: CartItem = {
      tempId: 'cart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      product: customizingProduct,
      variant: selectedVariant,
      selectedModifiers: [...selectedModifiers],
      quantity: 1,
      notes: customizerNotes.trim() || undefined,
      unitPriceCents,
      totalPriceCents: unitPriceCents
    };

    setCart(prev => [...prev, newItem]);
    setCustomizingProduct(null);
  };

  // Cart item modifications
  const handleUpdateQuantity = (tempId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.tempId === tempId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPriceCents: item.unitPriceCents * newQty
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (tempId: string) => {
    setCart(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleClearCart = () => {
    if (cart.length > 0 && window.confirm('Clear all items from current ticket?')) {
      setCart([]);
      setCustomerName('');
      setDiscountType('none');
    }
  };

  // Checkout Actions
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setCashTenderedInput((totalCents / 100).toString());
    setReferenceNumber('');
    setIsConfirmedOnlineRef(false);
    setCheckoutError(null);
    setIsCheckoutOpen(true);
  };

  const tenderedAmount = parseFloat(cashTenderedInput) || 0;
  const tenderedCents = Math.round(tenderedAmount * 100);
  const changeCents = Math.max(0, tenderedCents - totalCents);

  const handleCompleteSale = () => {
    setCheckoutError(null);

    // Validation
    if (paymentMethod === 'cash') {
      if (tenderedCents < totalCents) {
        setCheckoutError(`Tendered cash (₱${tenderedAmount.toFixed(2)}) is less than total amount due (${formatPHP(totalCents)})`);
        return;
      }
    } else {
      if (!referenceNumber.trim()) {
        setCheckoutError(`Please enter customer ${paymentMethod.toUpperCase()} reference / approval code`);
        return;
      }
      if (!isConfirmedOnlineRef) {
        setCheckoutError(`Please verify customer transaction screenshot or receipt on mobile`);
        return;
      }
    }

    try {
      const result = db.checkoutSale({
        items: cart,
        orderType,
        customerName: customerName.trim() || undefined,
        discountCents: discountDetails.cents,
        discountLabel: discountDetails.label || undefined,
        paymentMethod,
        tenderedCents: paymentMethod === 'cash' ? tenderedCents : totalCents,
        referenceNumber: referenceNumber.trim() || undefined
      });

      setCart([]);
      setCustomerName('');
      setDiscountType('none');
      setIsCheckoutOpen(false);
      setCompletedSale(result.sale);
      setInventoryWarnings(result.inventoryWarnings);
      onRefreshData();
    } catch (e) {
      setCheckoutError('Transaction failed: ' + (e as Error).message);
    }
  };

  // Load Preset Coffee Items (with Generated Photography)
  const handleLoadSpecialtyPresets = () => {
    db.loadSpecialtyCoffeeSampleMenu();
    onRefreshData();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#FAF7F2]">
      {/* LEFT SECTION: PRODUCT CATALOG & FILTERING */}
      <div className="flex-1 flex flex-col overflow-hidden p-5 border-r border-stone-200">
        {/* Search & Category Filter */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Search drinks, SKU, pastries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200 text-xs text-stone-900 font-medium placeholder:text-stone-400 outline-hidden focus:border-stone-900 shadow-2xs transition"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3.5 py-2 text-xs font-bold text-stone-800 bg-white rounded-2xl border border-stone-200 hover:bg-stone-100 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Clean Segmented Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-3">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#14100E] text-[#B4EE10] shadow-md'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => {
            const count = products.filter(p => p.categoryId === cat.id && p.isActive).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#14100E] text-[#B4EE10] shadow-md'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>{cat.name}</span>
                {count > 0 && (
                  <span className="text-[10px] font-mono opacity-80">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {products.length === 0 ? (
            /* Clean Empty State with Gen Z Fast Action */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-white border border-stone-200 flex items-center justify-center text-[#14100E] mb-4 shadow-sm">
                <Coffee className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-display font-black text-xl text-stone-900 uppercase tracking-tight">
                Menu is Currently Clean
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                You are running on a clean slate. You can add your custom drinks and coffee beans in Menu Management, or load specialty sample presets anytime.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full">
                <button
                  onClick={handleLoadSpecialtyPresets}
                  className="flex-1 px-5 py-3 rounded-2xl bg-[#14100E] hover:bg-stone-900 text-[#B4EE10] text-xs font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#B4EE10]" />
                  <span>Load Sample Coffee Menu</span>
                </button>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-stone-500">
              <Search className="w-8 h-8 text-stone-300 mb-2" />
              <p className="text-sm font-bold text-stone-800">No items match your search filter</p>
              <p className="text-xs text-stone-500 mt-0.5">Try searching another drink name or code</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredProducts.map(product => {
                const lowestPrice = Math.min(...product.variants.map(v => v.priceCents));
                const highestPrice = Math.max(...product.variants.map(v => v.priceCents));
                const priceDisplay =
                  lowestPrice === highestPrice
                    ? formatPHP(lowestPrice)
                    : `${formatPHP(lowestPrice)} - ${formatPHP(highestPrice)}`;

                return (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="group bg-white rounded-3xl overflow-hidden text-left border border-stone-200 hover:border-stone-900 hover:shadow-lg transition-all active:scale-[0.98] flex flex-col justify-between cursor-pointer"
                  >
                    {/* Visual Asset if present */}
                    {product.imageUrl && (
                      <div className="w-full aspect-[4/3] bg-stone-100 overflow-hidden relative">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                    )}

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Unboxed Metadata Line */}
                        <div className="text-[10px] font-mono text-stone-500 font-bold uppercase mb-1">
                          <span>{product.sku || 'ITEM'}</span>
                          {product.variants.length > 1 && (
                            <>
                              <span aria-hidden="true" className="mx-1">·</span>
                              <span>{product.variants.length} Sizes</span>
                            </>
                          )}
                        </div>
                        <h4 className="font-display font-black text-sm text-stone-900 leading-snug group-hover:text-amber-900 transition line-clamp-2">
                          {product.name}
                        </h4>
                        {product.description && (
                          <p className="text-[11px] text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-xs font-black font-mono tabular-nums text-stone-900">
                          {priceDisplay}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#14100E] group-hover:text-[#B4EE10] text-stone-800 flex items-center justify-center transition">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: CURRENT ORDER TICKET */}
      <div className="w-96 bg-white flex flex-col justify-between border-l border-stone-200 shrink-0 shadow-lg">
        {/* Ticket Header */}
        <div className="p-4 border-b border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-sm uppercase text-stone-900">
                Order Ticket
              </span>
              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-mono font-bold">
                {cart.length} items
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Dine In / Take Out Segmented Toggle */}
          <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200">
            {(['dine_in', 'take_out', 'delivery_pickup'] as OrderType[]).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                  orderType === type
                    ? 'bg-[#14100E] text-white shadow-xs font-black'
                    : 'text-stone-700 hover:text-black'
                }`}
              >
                {type === 'dine_in' ? 'Dine In' : type === 'take_out' ? 'Take Out' : 'Delivery'}
              </button>
            ))}
          </div>

          {/* Customer Name Field */}
          <input
            type="text"
            placeholder="Customer name (Optional)"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-full bg-stone-50 px-3.5 py-2 rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 outline-hidden focus:border-stone-900"
          />
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-stone-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-500">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 mb-2">
                <Tag className="w-5 h-5 stroke-[1.5]" />
              </div>
              <p className="text-xs font-bold text-stone-800">Ticket is empty</p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Select coffee or food from the catalog on the left
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.tempId} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="font-bold text-xs text-stone-900 leading-snug">
                      {item.product.name}
                    </h5>
                    <p className="text-[11px] text-stone-600 font-semibold mt-0.5">
                      {item.variant.name}
                    </p>
                    {item.selectedModifiers.length > 0 && (
                      <div className="text-[10px] text-stone-600 mt-1 space-y-0.5 pl-2 border-l-2 border-[#B4EE10]">
                        {item.selectedModifiers.map(m => (
                          <div key={m.id} className="flex justify-between">
                            <span>+ {m.name}</span>
                            {m.priceCents > 0 && (
                              <span className="font-mono tabular-nums">{formatPHP(m.priceCents)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.notes && (
                      <p className="text-[10px] italic text-amber-900 bg-amber-50 px-2 py-0.5 rounded mt-1">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="font-black text-xs font-mono tabular-nums text-stone-900 shrink-0">
                    {formatPHP(item.totalPriceCents)}
                  </span>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between mt-2.5">
                  <button
                    onClick={() => handleRemoveFromCart(item.tempId)}
                    className="p-1 text-stone-400 hover:text-rose-600 rounded transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-2 bg-stone-100 rounded-xl p-1 border border-stone-200">
                    <button
                      onClick={() => handleUpdateQuantity(item.tempId, -1)}
                      className="w-6 h-6 rounded-lg bg-white text-stone-900 hover:bg-stone-200 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-mono font-black tabular-nums text-stone-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.tempId, 1)}
                      className="w-6 h-6 rounded-lg bg-white text-stone-900 hover:bg-stone-200 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary & Tender Action */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/70 space-y-3">
          {/* Discounts Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-700 font-bold">Discount / Privilege:</span>
              <select
                value={discountType}
                onChange={e => setDiscountType(e.target.value as any)}
                className="bg-white border border-stone-200 text-xs text-stone-900 rounded-xl px-2.5 py-1 outline-hidden focus:border-stone-900 font-bold cursor-pointer"
              >
                <option value="none">No Discount</option>
                <option value="senior">Senior Citizen (20%)</option>
                <option value="pwd">PWD (20%)</option>
                <option value="staff">Barista Staff (10%)</option>
                <option value="custom">Custom %</option>
              </select>
            </div>
            {discountType === 'custom' && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customDiscountPercent}
                  onChange={e => setCustomDiscountPercent(parseInt(e.target.value) || 0)}
                  className="w-20 bg-white border border-stone-200 px-2 py-1 rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-xs text-stone-600">% off ticket total</span>
              </div>
            )}
          </div>

          {/* Subtotal and Discount Rows */}
          <div className="space-y-1 text-xs text-stone-700 font-semibold pt-1 border-t border-stone-200">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums text-stone-900">{formatPHP(subtotalCents)}</span>
            </div>
            {discountDetails.cents > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>{discountDetails.label}</span>
                <span className="font-mono tabular-nums">-{formatPHP(discountDetails.cents)}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px] text-stone-500">
              <span>12% VAT (Included)</span>
              <span className="font-mono tabular-nums">{formatPHP(Math.round(totalCents * 0.12 / 1.12))}</span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex items-baseline justify-between pt-2 border-t border-stone-200">
            <span className="font-display font-black text-sm uppercase text-stone-900">Total Due</span>
            <span className="text-3xl font-black font-mono tabular-nums text-stone-900">
              {formatPHP(totalCents)}
            </span>
          </div>

          {/* Primary Charge Button with Gen Z Lime Accent */}
          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              cart.length === 0
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                : 'bg-[#B4EE10] hover:bg-[#CCFF00] active:scale-[0.98] text-[#14100E] shadow-[0_4px_20px_rgba(180,238,16,0.35)]'
            }`}
          >
            <Banknote className="w-5 h-5" />
            <span>CHARGE {formatPHP(totalCents)}</span>
          </button>
        </div>
      </div>

      {/* PRODUCT CUSTOMIZER MODAL */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
            {/* Customizer Header */}
            <div className="bg-[#14100E] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-base uppercase tracking-tight text-white">
                  {customizingProduct.name}
                </h3>
                <p className="text-xs text-stone-300 mt-0.5">{customizingProduct.description}</p>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-stone-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Sizes & Variants */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-stone-900 block mb-2 font-display">
                  Select Size / Variant
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {customizingProduct.variants.map(variant => {
                    const isSelected = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-stone-100 border-[#14100E] ring-2 ring-[#14100E]'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-stone-900">{variant.name}</p>
                          <p className="text-xs font-mono font-black tabular-nums text-stone-900 mt-0.5">
                            {formatPHP(variant.priceCents)}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-stone-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modifier Groups */}
              {customizingProduct.modifierGroupIds.map(grpId => {
                const group = modifierGroups.find(g => g.id === grpId);
                if (!group) return null;

                return (
                  <div key={group.id} className="pt-2 border-t border-stone-200">
                    <label className="text-xs font-black uppercase tracking-wider text-stone-900 block mb-2 font-display">
                      {group.name}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {group.modifiers.map(mod => {
                        const isSelected = selectedModifiers.some(m => m.id === mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => toggleModifier(mod, group.maxSelection)}
                            className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-stone-100 border-[#14100E] ring-2 ring-[#14100E]'
                                : 'border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <span className="text-xs font-bold text-stone-900">{mod.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-stone-900" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Notes */}
              <div className="pt-2 border-t border-stone-200">
                <label className="text-xs font-black uppercase tracking-wider text-stone-900 block mb-1.5 font-display">
                  Barista Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra hot, personal tumbler, oat milk foam..."
                  value={customizerNotes}
                  onChange={e => setCustomizerNotes(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-2xl px-3.5 py-2 text-xs text-stone-900 outline-hidden focus:border-stone-900"
                />
              </div>
            </div>

            {/* Customizer Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-600 font-semibold">Item Total</span>
                <p className="text-xl font-black font-mono tabular-nums text-stone-900">
                  {formatPHP(
                    (selectedVariant?.priceCents || 0) +
                      selectedModifiers.reduce((sum, m) => sum + m.priceCents, 0)
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizingProduct(null)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black bg-[#14100E] text-[#B4EE10] hover:bg-stone-900 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Ticket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
            {/* Header */}
            <div className="bg-[#14100E] text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-xs text-[#B4EE10] font-mono font-bold tracking-wider uppercase">
                  Tender Payment
                </span>
                <h3 className="font-display font-black text-xl mt-0.5 uppercase tracking-tight text-white">
                  Checkout Cashier
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-300">Total Due</span>
                <p className="text-3xl font-black font-mono tabular-nums text-white">
                  {formatPHP(totalCents)}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Payment Methods Tabs */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash (PHP)', icon: Banknote },
                  { id: 'gcash', label: 'GCash', icon: Smartphone },
                  { id: 'maya', label: 'Maya', icon: Smartphone },
                  { id: 'card_pos', label: 'Card POS', icon: CreditCard }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isSelected = paymentMethod === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(tab.id as PaymentMethod);
                        setCheckoutError(null);
                      }}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#14100E] text-[#B4EE10] border-[#14100E] shadow-sm font-black'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-700 font-bold'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Payment Mode */}
              {paymentMethod === 'cash' ? (
                <div className="space-y-4">
                  {/* Quick Bill Selectors */}
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-stone-700 block mb-2 font-display">
                      Quick Cash Presets
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: 'Exact', amount: totalCents / 100 },
                        { label: '₱100', amount: 100 },
                        { label: '₱200', amount: 200 },
                        { label: '₱500', amount: 500 },
                        { label: '₱1,000', amount: 1000 }
                      ].map(bill => (
                        <button
                          key={bill.label}
                          type="button"
                          onClick={() => setCashTenderedInput(bill.amount.toString())}
                          className="py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-black font-mono tabular-nums text-stone-900 active:scale-95 transition cursor-pointer"
                        >
                          {bill.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Input & Change Calculation */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-stone-700 block mb-1 font-display">
                        Cash Tendered (₱)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={cashTenderedInput}
                        onChange={e => setCashTenderedInput(e.target.value)}
                        className="w-full bg-white border-2 border-stone-300 focus:border-[#14100E] rounded-2xl px-4 py-3 text-2xl font-black font-mono tabular-nums text-stone-900 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-stone-700 block mb-1 font-display">
                        Change Due
                      </label>
                      <div
                        className={`w-full border-2 rounded-2xl px-4 py-3 text-2xl font-black font-mono tabular-nums flex items-center justify-between ${
                          tenderedCents >= totalCents
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                      >
                        <span>{formatPHP(changeCents)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Electronic / Card Payment Mode (Offline Confirmation Logger) */
                <div className="space-y-4 bg-stone-50 p-5 rounded-2xl border border-stone-200">
                  <div className="flex items-start gap-2.5 text-xs text-stone-800">
                    <Smartphone className="w-5 h-5 text-stone-900 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-stone-900 text-sm">Offline Payment Confirmation</p>
                      <p className="text-stone-600 mt-1 leading-relaxed">
                        C5ISR operates offline. The cashier checks the customer's phone confirmation screen and logs the reference number below.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-stone-900 block mb-1 font-display">
                      {paymentMethod.toUpperCase()} Approval / Reference Number *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 984321, APPR-0192"
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      className="w-full bg-white border-2 border-stone-300 focus:border-[#14100E] rounded-2xl px-4 py-3 text-sm font-mono font-black text-stone-900 uppercase outline-hidden"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isConfirmedOnlineRef}
                      onChange={e => setIsConfirmedOnlineRef(e.target.checked)}
                      className="w-4 h-4 rounded text-stone-900 focus:ring-stone-900"
                    />
                    <span className="text-xs font-bold text-stone-800">
                      I have verified the customer's successful payment screen.
                    </span>
                  </label>
                </div>
              )}

              {/* Error Message */}
              {checkoutError && (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-stone-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-5 py-3 rounded-2xl text-xs font-bold text-stone-700 hover:bg-stone-100 border border-stone-200 transition cursor-pointer"
              >
                Back to Ticket
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                className="px-7 py-3 rounded-2xl text-xs font-black bg-[#14100E] hover:bg-stone-900 text-[#B4EE10] transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Complete & Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED THERMAL RECEIPT MODAL */}
      <ThermalReceiptModal
        isOpen={Boolean(completedSale)}
        onClose={() => setCompletedSale(null)}
        sale={completedSale}
        settings={settings}
      />

      {/* INVENTORY ALERTS BANNER (AFTER CHECKOUT) */}
      {inventoryWarnings.length > 0 && (
        <div className="fixed bottom-4 left-68 right-8 z-40 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-xl flex items-center justify-between text-xs text-amber-950">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="space-y-0.5">
              {inventoryWarnings.map((w, i) => (
                <p key={i} className="font-bold">
                  {w}
                </p>
              ))}
            </div>
          </div>
          <button
            onClick={() => setInventoryWarnings([])}
            className="text-amber-900 hover:text-black font-black text-xs px-3 py-1 bg-amber-200 rounded-xl"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
