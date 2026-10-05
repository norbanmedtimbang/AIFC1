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
  Coffee,
  X,
  Loader2
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
import { formatPHP } from '../../services/storage';
import { dataService } from '../../services/dataService';
import { ThermalReceiptModal } from '../shared/ThermalReceiptModal';

interface POSViewProps {
  products: Product[];
  categories: { id: string; name: string }[];
  modifierGroups: ModifierGroup[];
  settings: ShopSettings;
  currentUser?: User;
  activeShift?: CashierShift | null;
  onRefreshData: () => void;
  onOpenShiftModal?: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  categories,
  modifierGroups,
  settings,
  onRefreshData
}) => {
  // Category & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [customerName, setCustomerName] = useState<string>('');
  const [discountType, setDiscountType] = useState<'none' | 'senior' | 'pwd' | 'staff' | 'custom'>('none');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(10);

  // Customizer Modal State
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [itemNotes, setItemNotes] = useState<string>('');

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [isConfirmedOnlineRef, setIsConfirmedOnlineRef] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);

  // Completed Receipt Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

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
      return { cents: Math.round(subtotalCents * 0.20), label: 'Senior (20%)' };
    }
    if (discountType === 'pwd') {
      return { cents: Math.round(subtotalCents * 0.20), label: 'PWD (20%)' };
    }
    if (discountType === 'staff') {
      return { cents: Math.round(subtotalCents * 0.10), label: 'Staff (10%)' };
    }
    if (discountType === 'custom') {
      const pct = Math.min(100, Math.max(0, customDiscountPercent)) / 100;
      return { cents: Math.round(subtotalCents * pct), label: `Discount (${customDiscountPercent}%)` };
    }
    return { cents: 0, label: '' };
  }, [subtotalCents, discountType, customDiscountPercent]);

  const totalCents = Math.max(0, subtotalCents - discountDetails.cents);

  // Selecting a product from grid
  const handleSelectProduct = (product: Product) => {
    if (product.variants.length === 1 && product.modifierGroupIds.length === 0) {
      // Single size, no modifiers -> add immediately
      const variant = product.variants[0];
      addToCartDirect(product, variant, [], '');
    } else {
      // Open clean customization dialog
      setCustomizingProduct(product);
      setSelectedVariant(product.variants[0] || null);
      setSelectedModifiers([]);
      setItemNotes('');
    }
  };

  const addToCartDirect = (
    product: Product,
    variant: ProductVariant,
    modifiers: Modifier[],
    notes: string
  ) => {
    const modifierTotalCents = modifiers.reduce((sum, m) => sum + m.priceCents, 0);
    const unitPriceCents = variant.priceCents + modifierTotalCents;

    const newItem: CartItem = {
      tempId: 'cart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      product,
      variant,
      selectedModifiers: modifiers,
      quantity: 1,
      unitPriceCents,
      totalPriceCents: unitPriceCents,
      notes: notes.trim() || undefined
    };

    setCart(prev => [...prev, newItem]);
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct || !selectedVariant) return;
    addToCartDirect(customizingProduct, selectedVariant, selectedModifiers, itemNotes);
    setCustomizingProduct(null);
  };

  const handleUpdateQuantity = (tempId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.tempId === tempId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, totalPriceCents: newQty * item.unitPriceCents }
              : null;
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
    if (cart.length > 0) {
      setCart([]);
      setDiscountType('none');
    }
  };

  const toggleModifier = (mod: Modifier, maxSelection: number) => {
    setSelectedModifiers(prev => {
      const exists = prev.some(m => m.id === mod.id);
      if (exists) {
        return prev.filter(m => m.id !== mod.id);
      }
      if (maxSelection === 1) {
        const filtered = prev.filter(m => m.groupId !== mod.groupId);
        return [...filtered, mod];
      }
      return [...prev, mod];
    });
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod('cash');
    setCashTenderedInput((totalCents / 100).toString());
    setReferenceNumber('');
    setIsConfirmedOnlineRef(false);
    setCheckoutError(null);
    setIsCheckoutOpen(true);
  };

  const tenderedAmount = parseFloat(cashTenderedInput) || 0;
  const tenderedCents = Math.round(tenderedAmount * 100);
  const changeCents = Math.max(0, tenderedCents - totalCents);

  const handleCompleteSale = async () => {
    setCheckoutError(null);

    // Validation
    if (paymentMethod === 'cash') {
      if (tenderedCents < totalCents) {
        setCheckoutError(`Tendered cash (${formatPHP(tenderedCents)}) is less than total due (${formatPHP(totalCents)})`);
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

    setIsProcessingCheckout(true);
    try {
      const result = await dataService.checkoutSale({
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
      onRefreshData();
    } catch (e) {
      setCheckoutError('Transaction failed: ' + (e as Error).message);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-[#F7F3EB]">
      {/* LEFT SECTION: PRODUCT CATALOG & FILTERING */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 border-r border-[#E8E2D9]">
        {/* Search & Categories Bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9B948C]" />
            <input
              type="text"
              placeholder="Search drinks, pastries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-9 pr-4 py-2 rounded-xl border border-[#E8E2D9] text-xs text-[#292929] placeholder:text-[#9B948C] outline-hidden focus:border-[#3B2925] transition"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-2 text-xs text-[#6E6862] bg-white rounded-xl border border-[#E8E2D9] hover:bg-[#F7F3EB] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Clean Segmented Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#3B2925] text-white shadow-xs'
                : 'bg-white text-[#6E6862] hover:bg-[#EFE9DF] border border-[#E8E2D9]'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#3B2925] text-white shadow-xs'
                    : 'bg-white text-[#6E6862] hover:bg-[#EFE9DF] border border-[#E8E2D9]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E8E2D9] flex items-center justify-center text-[#7A736C] mb-3">
                <Coffee className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-semibold text-[#292929]">
                Menu is empty
              </h3>
              <p className="text-xs text-[#7A736C] mt-1">
                Add products in the Menu tab to begin cashier operations.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-[#9B948C]">
              <Search className="w-6 h-6 text-[#DDD4C7] mb-2" />
              <p className="text-xs font-medium text-[#292929]">No items match your search</p>
              <p className="text-[11px] text-[#7A736C] mt-0.5">Try searching another drink name</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
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
                    className="group bg-white rounded-xl overflow-hidden text-left border border-[#E8E2D9] hover:border-[#3B2925] hover:shadow-xs transition flex flex-col justify-between cursor-pointer"
                  >
                    {/* Product Photo if available */}
                    {product.imageUrl && (
                      <div className="w-full aspect-[4/3] bg-[#F7F3EB] overflow-hidden relative">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-102 transition duration-200"
                        />
                      </div>
                    )}

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-[#292929] leading-snug">
                          {product.name}
                        </h4>
                        {product.variants.length > 1 && (
                          <p className="text-[10px] text-[#7A736C] mt-0.5">
                            {product.variants.length} sizes
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#F7F3EB] flex items-center justify-between">
                        <span className="text-xs font-mono font-medium text-[#3B2925]">
                          {priceDisplay}
                        </span>
                        <div className="w-6 h-6 rounded-md bg-[#F7F3EB] group-hover:bg-[#3B2925] group-hover:text-white text-[#7A736C] flex items-center justify-center transition">
                          <Plus className="w-3.5 h-3.5" />
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
      <div className="w-88 bg-white flex flex-col justify-between border-l border-[#E8E2D9] shrink-0">
        {/* Ticket Header */}
        <div className="p-4 border-b border-[#E8E2D9] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#292929]">
                Current Order
              </span>
              <span className="text-[10px] font-mono text-[#7A736C]">
                ({cart.length} {cart.length === 1 ? 'item' : 'items'})
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-[11px] text-[#A25035] hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Dine In / Take Out Segmented Toggle */}
          <div className="grid grid-cols-3 gap-1 bg-[#F7F3EB] p-1 rounded-xl border border-[#E8E2D9]">
            {(['dine_in', 'take_out', 'delivery_pickup'] as OrderType[]).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  orderType === type
                    ? 'bg-[#3B2925] text-white shadow-xs'
                    : 'text-[#6E6862] hover:text-[#292929]'
                }`}
              >
                {type === 'dine_in' ? 'Dine In' : type === 'take_out' ? 'Take Out' : 'Delivery'}
              </button>
            ))}
          </div>

          {/* Customer Name */}
          <input
            type="text"
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-full bg-[#FBF9F5] px-3 py-1.5 rounded-lg border border-[#E8E2D9] text-xs text-[#292929] placeholder:text-[#9B948C] outline-hidden focus:border-[#3B2925]"
          />
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#F7F3EB]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#9B948C]">
              <div className="w-10 h-10 rounded-xl bg-[#F7F3EB] flex items-center justify-center text-[#9B948C] mb-2">
                <Tag className="w-4 h-4 stroke-[1.5]" />
              </div>
              <p className="text-xs font-medium text-[#292929]">Order ticket is empty</p>
              <p className="text-[11px] text-[#7A736C] mt-0.5">
                Select drinks from the menu
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.tempId} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h5 className="text-xs font-medium text-[#292929] leading-snug">
                      {item.product.name}
                    </h5>
                    <p className="text-[11px] text-[#7A736C]">
                      {item.variant.name}
                    </p>
                    {item.selectedModifiers.length > 0 && (
                      <div className="text-[10px] text-[#7A736C] mt-0.5">
                        {item.selectedModifiers.map(m => m.name).join(', ')}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-mono font-medium text-[#292929] shrink-0">
                    {formatPHP(item.totalPriceCents)}
                  </span>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => handleRemoveFromCart(item.tempId)}
                    className="text-[#9B948C] hover:text-[#A25035] transition cursor-pointer p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-2 bg-[#F7F3EB] rounded-lg p-0.5 border border-[#E8E2D9]">
                    <button
                      onClick={() => handleUpdateQuantity(item.tempId, -1)}
                      className="w-5 h-5 rounded bg-white text-[#292929] hover:bg-[#EFE9DF] flex items-center justify-center text-xs font-medium cursor-pointer shadow-2xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-mono tabular-nums text-[#292929]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.tempId, 1)}
                      className="w-5 h-5 rounded bg-white text-[#292929] hover:bg-[#EFE9DF] flex items-center justify-center text-xs font-medium cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary & Checkout Button */}
        <div className="p-4 border-t border-[#E8E2D9] bg-[#FBF9F5] space-y-3">
          {/* Discount Selector */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6E6862]">Discount:</span>
            <select
              value={discountType}
              onChange={e => setDiscountType(e.target.value as any)}
              className="bg-white border border-[#E8E2D9] text-xs text-[#292929] rounded-lg px-2 py-1 outline-hidden focus:border-[#3B2925] cursor-pointer"
            >
              <option value="none">None</option>
              <option value="senior">Senior (20%)</option>
              <option value="pwd">PWD (20%)</option>
              <option value="staff">Staff (10%)</option>
              <option value="custom">Custom %</option>
            </select>
          </div>

          {/* Subtotal and Discount Rows */}
          <div className="space-y-1 text-xs text-[#6E6862] pt-1 border-t border-[#E8E2D9]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono text-[#292929]">{formatPHP(subtotalCents)}</span>
            </div>
            {discountDetails.cents > 0 && (
              <div className="flex justify-between text-[#A25035]">
                <span>{discountDetails.label}</span>
                <span className="font-mono">-{formatPHP(discountDetails.cents)}</span>
              </div>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex items-baseline justify-between pt-2 border-t border-[#E8E2D9]">
            <span className="text-xs font-medium text-[#292929] uppercase tracking-wider">Total</span>
            <span className="text-2xl font-bold font-mono text-[#292929]">
              {formatPHP(totalCents)}
            </span>
          </div>

          {/* Primary Checkout Button in Espresso Brown */}
          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-xl font-medium text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-xs ${
              cart.length === 0
                ? 'bg-[#DDD4C7] text-[#9B948C] cursor-not-allowed'
                : 'bg-[#3B2925] hover:bg-[#2C1E1A] text-white'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Charge {formatPHP(totalCents)}</span>
          </button>
        </div>
      </div>

      {/* PRODUCT CUSTOMIZER MODAL */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#292929]">
                  {customizingProduct.name}
                </h3>
                {customizingProduct.description && (
                  <p className="text-xs text-[#7A736C] mt-0.5">{customizingProduct.description}</p>
                )}
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="text-xs font-medium text-[#292929] block mb-2">
                  Select Size
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingProduct.variants.map(variant => {
                    const isSelected = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#F7F3EB] border-[#3B2925] ring-1 ring-[#3B2925]'
                            : 'border-[#E8E2D9] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-medium text-[#292929]">{variant.name}</p>
                          <p className="text-xs font-mono text-[#3B2925] mt-0.5">
                            {formatPHP(variant.priceCents)}
                          </p>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#3B2925]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {customizingProduct.modifierGroupIds.map(grpId => {
                const group = modifierGroups.find(g => g.id === grpId);
                if (!group) return null;

                return (
                  <div key={group.id} className="pt-2 border-t border-[#F0EAE1]">
                    <label className="text-xs font-medium text-[#292929] block mb-2">
                      {group.name}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.modifiers.map(mod => {
                        const isSelected = selectedModifiers.some(m => m.id === mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => toggleModifier(mod, group.maxSelection)}
                            className={`p-2 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#F7F3EB] border-[#3B2925] ring-1 ring-[#3B2925]'
                                : 'border-[#E8E2D9] hover:bg-[#FAF7F2]'
                            }`}
                          >
                            <span className="text-xs text-[#292929]">{mod.name}</span>
                            {mod.priceCents > 0 && (
                              <span className="text-[10px] font-mono text-[#7A736C]">
                                +{formatPHP(mod.priceCents)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-[#E8E2D9] bg-[#FBF9F5] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomization}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer shadow-xs"
              >
                Add to Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[#292929]">
                  Checkout Order
                </h3>
                <p className="text-xs text-[#7A736C] mt-0.5">
                  Select payment method and confirm tender
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#7A736C]">Amount Due</span>
                <p className="text-2xl font-bold font-mono text-[#3B2925]">
                  {formatPHP(totalCents)}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Payment Methods */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
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
                      className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1 transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#3B2925] text-white border-[#3B2925] shadow-xs'
                          : 'border-[#E8E2D9] hover:bg-[#FAF7F2] text-[#6E6862]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Payment Mode */}
              {paymentMethod === 'cash' ? (
                <div className="space-y-3">
                  {/* Quick Cash Presets */}
                  <div className="grid grid-cols-5 gap-1.5">
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
                        className="py-1.5 rounded-lg bg-[#F7F3EB] hover:bg-[#EFE9DF] border border-[#E8E2D9] text-xs font-mono text-[#292929] cursor-pointer"
                      >
                        {bill.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#6E6862] block mb-1">
                        Cash Tendered (₱)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={cashTenderedInput}
                        onChange={e => setCashTenderedInput(e.target.value)}
                        className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-2 text-base font-mono font-medium text-[#292929] outline-hidden focus:border-[#3B2925]"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#6E6862] block mb-1">
                        Change Due
                      </label>
                      <div className="h-10 px-3 flex items-center bg-[#F7F3EB] rounded-xl border border-[#E8E2D9] font-mono font-bold text-base text-[#292929]">
                        {formatPHP(changeCents)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#6E6862] block mb-1">
                      {paymentMethod.toUpperCase()} Approval / Reference Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 984321, APPR-0192"
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-2 text-sm font-mono text-[#292929] outline-hidden focus:border-[#3B2925]"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isConfirmedOnlineRef}
                      onChange={e => setIsConfirmedOnlineRef(e.target.checked)}
                      className="w-4 h-4 rounded text-[#3B2925] focus:ring-[#3B2925]"
                    />
                    <span className="text-xs text-[#6E6862]">
                      I have verified the customer's successful payment screen.
                    </span>
                  </label>
                </div>
              )}

              {/* Error Message */}
              {checkoutError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#FBF9F5] border-t border-[#E8E2D9] flex justify-end gap-2">
              <button
                type="button"
                disabled={isProcessingCheckout}
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Back to Ticket
              </button>
              <button
                type="button"
                disabled={isProcessingCheckout}
                onClick={handleCompleteSale}
                className="px-5 py-2.5 rounded-xl text-xs font-medium bg-[#3B2925] hover:bg-[#2C1E1A] text-white transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isProcessingCheckout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#A8B5A0]" />
                    <span>Processing in Supabase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Complete & Print Receipt</span>
                  </>
                )}
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
    </div>
  );
};
