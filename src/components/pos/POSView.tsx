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
  currentUser,
  activeShift,
  onRefreshData,
  onOpenShiftModal
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

  // Customizer Modal State (progressive disclosure: size → extras → optional note)
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [customizerStep, setCustomizerStep] = useState<'size' | 'extras'>('size');
  const [showItemNotes, setShowItemNotes] = useState<boolean>(false);
  const [showDiscountPanel, setShowDiscountPanel] = useState<boolean>(false);

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

  // Selecting a product from grid — progressive disclosure
  const handleSelectProduct = (product: Product) => {
    const needsSizeChoice = product.variants.length > 1;
    const needsModifiers = product.modifierGroupIds.length > 0;

    if (!needsSizeChoice && !needsModifiers) {
      // Single size, no modifiers → add immediately (zero decisions)
      addToCartDirect(product, product.variants[0], [], '');
      return;
    }

    setCustomizingProduct(product);
    setSelectedVariant(product.variants[0] || null);
    setSelectedModifiers([]);
    setItemNotes('');
    setShowItemNotes(false);
    // Start on size when multiple sizes exist; otherwise jump to extras
    setCustomizerStep(needsSizeChoice ? 'size' : 'extras');
  };

  const productNeedsSizeStep = (product: Product | null) =>
    Boolean(product && product.variants.length > 1);

  const productNeedsExtrasStep = (product: Product | null) =>
    Boolean(product && product.modifierGroupIds.length > 0);

  const customizerLivePriceCents = useMemo(() => {
    if (!selectedVariant) return 0;
    const modTotal = selectedModifiers.reduce((sum, m) => sum + m.priceCents, 0);
    return selectedVariant.priceCents + modTotal;
  }, [selectedVariant, selectedModifiers]);

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
    setCustomizerStep('size');
    setShowItemNotes(false);
  };

  const handleCustomizerNext = () => {
    if (!customizingProduct) return;
    // Size step → extras if product has modifiers, otherwise add to cart
    if (customizerStep === 'size' && productNeedsExtrasStep(customizingProduct)) {
      setCustomizerStep('extras');
      return;
    }
    handleConfirmCustomization();
  };

  const handleCustomizerBack = () => {
    if (customizerStep === 'extras' && productNeedsSizeStep(customizingProduct)) {
      setCustomizerStep('size');
      return;
    }
    setCustomizingProduct(null);
    setCustomizerStep('size');
    setShowItemNotes(false);
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
      setShowDiscountPanel(false);
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
    if (isProcessingCheckout) return;
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
      {/* LEFT SECTION: PRODUCT CATALOG */}
      <div className="flex-1 flex flex-col overflow-hidden px-5 pt-5 pb-4 border-r border-[#E8E2D9]">
        {/* Search */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B948C] pointer-events-none" />
            <input
              type="text"
              placeholder="Search drinks, pastries…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl border border-[#E8E2D9] text-[13px] text-[#292929] placeholder:text-[#9B948C] outline-hidden focus:border-[#3B2925] focus:ring-2 focus:ring-[#3B2925]/8 transition shadow-[0_1px_2px_rgba(59,41,37,0.03)]"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3.5 py-2.5 text-xs text-[#6E6862] bg-white rounded-2xl border border-[#E8E2D9] hover:bg-[#FAF7F2] cursor-pointer transition"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3.5 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#3B2925] text-white'
                : 'bg-white/80 text-[#6E6862] hover:text-[#292929] hover:bg-white border border-[#E8E2D9]'
            }`}
          >
            All
          </button>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#3B2925] text-white'
                    : 'bg-white/80 text-[#6E6862] hover:text-[#292929] hover:bg-white border border-[#E8E2D9]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto pr-0.5 -mr-0.5">
          {products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-xs mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E2D9] flex items-center justify-center text-[#9B948C] mb-4 shadow-[0_1px_3px_rgba(59,41,37,0.04)]">
                <Coffee className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-semibold text-[#292929]">Menu is empty</h3>
              <p className="text-xs text-[#7A736C] mt-1.5 leading-relaxed">
                Add products in the Menu tab to start taking orders.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center">
              <Search className="w-5 h-5 text-[#DDD4C7] mb-2.5" />
              <p className="text-xs font-medium text-[#292929]">No matches</p>
              <p className="text-[11px] text-[#7A736C] mt-0.5">Try a different name or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-2">
              {filteredProducts.map((product, idx) => {
                const lowestPrice = Math.min(...product.variants.map(v => v.priceCents));
                const highestPrice = Math.max(...product.variants.map(v => v.priceCents));
                const priceDisplay =
                  lowestPrice === highestPrice
                    ? formatPHP(lowestPrice)
                    : `from ${formatPHP(lowestPrice)}`;
                const stagger = idx < 12 ? `stagger-${idx + 1}` : '';

                return (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={`group bg-white rounded-2xl overflow-hidden text-left border border-[#E8E2D9] hover:border-[#C4B9AA] hover:shadow-[0_4px_16px_rgba(59,41,37,0.06)] active:scale-[0.97] transition-all duration-200 flex flex-col cursor-pointer animate-fade-in pressable ${stagger}`}
                  >
                    {/* Image / placeholder — always present for visual rhythm */}
                    <div className="w-full aspect-[5/4] bg-gradient-to-b from-[#F7F3EB] to-[#EFE9DF] overflow-hidden relative">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Coffee className="w-8 h-8 text-[#D4C9BA] stroke-[1.25] group-hover:text-[#C4B9AA] transition" />
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col">
                      <h4 className="text-[13px] font-semibold text-[#292929] leading-snug tracking-tight line-clamp-2">
                        {product.name}
                      </h4>
                      {product.variants.length > 1 && (
                        <p className="text-[10px] text-[#9B948C] mt-0.5">
                          {product.variants.length} sizes
                        </p>
                      )}

                      <div className="mt-auto pt-2.5 flex items-center justify-between">
                        <span className="text-[13px] font-mono font-semibold text-[#3B2925] tracking-tight">
                          {priceDisplay}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-[#F7F3EB] group-hover:bg-[#3B2925] text-[#9B948C] group-hover:text-white flex items-center justify-center transition duration-200">
                          <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
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

      {/* RIGHT SECTION: ORDER TICKET */}
      <div className="w-[22rem] bg-white flex flex-col border-l border-[#E8E2D9] shrink-0 shadow-[-8px_0_24px_rgba(59,41,37,0.03)]">
        {/* Ticket Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#E8E2D9] space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#292929] tracking-tight">
                Current Order
              </h3>
              <p className="text-[11px] text-[#9B948C] mt-0.5 font-mono tabular-nums">
                {cart.length === 0
                  ? 'No items yet'
                  : `${cart.length} ${cart.length === 1 ? 'item' : 'items'}`}
              </p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-[11px] font-medium text-[#A25035]/80 hover:text-[#A25035] transition cursor-pointer px-2 py-1 rounded-lg hover:bg-[#FDF6F4]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Order type — soft segmented control */}
          <div className="grid grid-cols-3 gap-0.5 bg-[#F7F3EB] p-1 rounded-xl">
            {(['dine_in', 'take_out', 'delivery_pickup'] as OrderType[]).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                  orderType === type
                    ? 'bg-white text-[#292929] shadow-[0_1px_3px_rgba(59,41,37,0.08)]'
                    : 'text-[#7A736C] hover:text-[#292929]'
                }`}
              >
                {type === 'dine_in' ? 'Dine In' : type === 'take_out' ? 'Take Out' : 'Delivery'}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-full bg-[#FAF7F2] px-3.5 py-2 rounded-xl border border-transparent text-xs text-[#292929] placeholder:text-[#9B948C] outline-hidden focus:bg-white focus:border-[#E8E2D9] transition"
          />
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F7F3EB] flex items-center justify-center text-[#C4B9AA] mb-3">
                <Coffee className="w-5 h-5 stroke-[1.5]" />
              </div>
              <p className="text-xs font-medium text-[#292929]">Ticket is empty</p>
              <p className="text-[11px] text-[#9B948C] mt-1 leading-relaxed">
                Tap a drink to add it
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {cart.map(item => (
                <div
                  key={item.tempId}
                  className="py-3 border-b border-[#F7F3EB] last:border-0 animate-cart-item"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[13px] font-medium text-[#292929] leading-snug tracking-tight">
                        {item.product.name}
                      </h5>
                      <p className="text-[11px] text-[#9B948C] mt-0.5">
                        {item.variant.name}
                        {item.selectedModifiers.length > 0 &&
                          ` · ${item.selectedModifiers.map(m => m.name).join(', ')}`}
                      </p>
                      {item.notes && (
                        <p className="text-[10px] text-[#7A736C] italic mt-0.5 truncate">
                          “{item.notes}”
                        </p>
                      )}
                    </div>
                    <span className="text-[13px] font-mono font-semibold text-[#292929] shrink-0 tracking-tight">
                      {formatPHP(item.totalPriceCents)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2.5">
                    <button
                      onClick={() => handleRemoveFromCart(item.tempId)}
                      className="text-[#C4B9AA] hover:text-[#A25035] transition cursor-pointer p-1 -ml-1 rounded-md hover:bg-[#FDF6F4]"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-0.5 bg-[#F7F3EB] rounded-full p-0.5">
                      <button
                        onClick={() => handleUpdateQuantity(item.tempId, -1)}
                        className="w-7 h-7 rounded-full bg-white text-[#292929] hover:bg-[#EFE9DF] flex items-center justify-center cursor-pointer shadow-[0_1px_2px_rgba(59,41,37,0.05)] transition"
                      >
                        <Minus className="w-3 h-3" strokeWidth={2.2} />
                      </button>
                      <span className="w-7 text-center text-xs font-mono font-medium tabular-nums text-[#292929]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.tempId, 1)}
                        className="w-7 h-7 rounded-full bg-white text-[#292929] hover:bg-[#EFE9DF] flex items-center justify-center cursor-pointer shadow-[0_1px_2px_rgba(59,41,37,0.05)] transition"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + Charge */}
        <div className="px-5 pt-4 pb-5 border-t border-[#E8E2D9] bg-[#FAF7F2] space-y-3">
          {/* Discount — progressive disclosure */}
          {cart.length > 0 && (
            <>
              {!showDiscountPanel && discountType === 'none' ? (
                <button
                  type="button"
                  onClick={() => setShowDiscountPanel(true)}
                  className="text-[11px] font-medium text-[#7A736C] hover:text-[#3B2925] transition cursor-pointer"
                >
                  + Add discount
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7A736C]">Discount</span>
                    <select
                      value={discountType}
                      onChange={e => {
                        const val = e.target.value as typeof discountType;
                        setDiscountType(val);
                        if (val === 'none') setShowDiscountPanel(false);
                      }}
                      className="bg-white border border-[#E8E2D9] text-xs text-[#292929] rounded-lg px-2.5 py-1 outline-hidden focus:border-[#3B2925] cursor-pointer"
                    >
                      <option value="none">None</option>
                      <option value="senior">Senior (20%)</option>
                      <option value="pwd">PWD (20%)</option>
                      <option value="staff">Staff (10%)</option>
                      <option value="custom">Custom %</option>
                    </select>
                  </div>
                  {discountType === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={customDiscountPercent}
                        onChange={e => setCustomDiscountPercent(Number(e.target.value) || 0)}
                        className="w-20 bg-white border border-[#E8E2D9] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#292929] outline-hidden focus:border-[#3B2925]"
                      />
                      <span className="text-[11px] text-[#7A736C]">% off</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-[#7A736C]">
              <span>Subtotal</span>
              <span className="font-mono text-[#292929] tabular-nums">{formatPHP(subtotalCents)}</span>
            </div>
            {discountDetails.cents > 0 && (
              <div className="flex justify-between text-xs text-[#A25035]">
                <span>{discountDetails.label}</span>
                <span className="font-mono tabular-nums">−{formatPHP(discountDetails.cents)}</span>
              </div>
            )}
          </div>

          <div className="flex items-baseline justify-between pt-2.5 border-t border-[#E8E2D9]">
            <span className="text-[11px] font-semibold text-[#6E6862] tracking-wide uppercase">
              Total
            </span>
            <span className="text-[1.65rem] font-bold font-mono text-[#292929] tracking-tight tabular-nums leading-none">
              {formatPHP(totalCents)}
            </span>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-2xl text-[13px] font-semibold tracking-tight flex items-center justify-center gap-2 transition-all duration-150 ${
              cart.length === 0
                ? 'bg-[#E8E2D9] text-[#9B948C] cursor-not-allowed'
                : 'bg-[#3B2925] hover:bg-[#2C1E1A] text-white shadow-[0_2px_8px_rgba(59,41,37,0.2)] hover:shadow-[0_4px_12px_rgba(59,41,37,0.25)] active:scale-[0.98] cursor-pointer'
            }`}
          >
            <Banknote className="w-4 h-4 opacity-90" />
            <span>
              {cart.length === 0 ? 'Add items to charge' : `Charge ${formatPHP(totalCents)}`}
            </span>
          </button>
        </div>
      </div>

      {/* PRODUCT CUSTOMIZER — progressive disclosure */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B2925]/35 backdrop-blur-[3px] p-4 animate-backdrop">
          <div className="w-full max-w-md bg-white rounded-[1.25rem] shadow-[0_20px_50px_rgba(59,41,37,0.18)] border border-[#E8E2D9] overflow-hidden animate-in">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-[#F0EAE1]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#9B948C] mb-1">
                    Customize
                  </p>
                  <h3 className="text-[15px] font-semibold text-[#292929] tracking-tight leading-snug">
                    {customizingProduct.name}
                  </h3>
                  {customizingProduct.description && (
                    <p className="text-xs text-[#7A736C] mt-1 line-clamp-2">{customizingProduct.description}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setCustomizingProduct(null);
                    setCustomizerStep('size');
                    setShowItemNotes(false);
                  }}
                  className="w-8 h-8 rounded-full bg-[#F7F3EB] text-[#7A736C] hover:text-[#292929] hover:bg-[#EFE9DF] flex items-center justify-center cursor-pointer transition shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {productNeedsSizeStep(customizingProduct) && productNeedsExtrasStep(customizingProduct) && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-[#EFE9DF] overflow-hidden">
                    <div
                      className="h-full bg-[#3B2925] rounded-full transition-all duration-300 ease-out"
                      style={{ width: customizerStep === 'size' ? '50%' : '100%' }}
                    />
                  </div>
                  <span className="text-[10px] text-[#9B948C] font-medium tabular-nums shrink-0">
                    Step {customizerStep === 'size' ? '1' : '2'} of 2
                  </span>
                </div>
              )}
            </div>

            <div className="px-5 py-5 space-y-5 max-h-[55vh] overflow-y-auto">
              {/* Size step */}
              {customizerStep === 'size' && productNeedsSizeStep(customizingProduct) && (
                <div>
                  <label className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide block mb-2.5">
                    Choose size
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {customizingProduct.variants.map(variant => {
                      const isSelected = selectedVariant?.id === variant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariant(variant);
                            if (productNeedsExtrasStep(customizingProduct)) {
                              setCustomizerStep('extras');
                            }
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-[#3B2925] border-[#3B2925] text-white shadow-[0_4px_12px_rgba(59,41,37,0.2)]'
                              : 'bg-white border-[#E8E2D9] hover:border-[#C4B9AA] hover:bg-[#FAF7F2]'
                          }`}
                        >
                          <p className={`text-[13px] font-semibold tracking-tight ${isSelected ? 'text-white' : 'text-[#292929]'}`}>
                            {variant.name}
                          </p>
                          <p className={`text-xs font-mono mt-1 ${isSelected ? 'text-white/80' : 'text-[#3B2925]'}`}>
                            {formatPHP(variant.priceCents)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extras step */}
              {customizerStep === 'extras' && (
                <>
                  {productNeedsSizeStep(customizingProduct) && selectedVariant && (
                    <button
                      type="button"
                      onClick={() => setCustomizerStep('size')}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#F7F3EB] text-left cursor-pointer hover:bg-[#EFE9DF] transition group"
                    >
                      <div>
                        <p className="text-[10px] text-[#9B948C] font-medium uppercase tracking-wide">Size</p>
                        <p className="text-[13px] font-semibold text-[#292929] tracking-tight">{selectedVariant.name}</p>
                      </div>
                      <span className="text-[11px] font-medium text-[#3B2925] opacity-70 group-hover:opacity-100">
                        Change
                      </span>
                    </button>
                  )}

                  {customizingProduct.modifierGroupIds.map(grpId => {
                    const group = modifierGroups.find(g => g.id === grpId);
                    if (!group) return null;

                    return (
                      <div key={group.id}>
                        <label className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide block mb-2.5">
                          {group.name}
                          {group.maxSelection === 1 && (
                            <span className="text-[#9B948C] font-normal normal-case tracking-normal"> · pick one</span>
                          )}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {group.modifiers.map(mod => {
                            const isSelected = selectedModifiers.some(m => m.id === mod.id);
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => toggleModifier(mod, group.maxSelection)}
                                className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all duration-150 cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#F7F3EB] border-[#3B2925] ring-1 ring-[#3B2925]/30'
                                    : 'border-[#E8E2D9] hover:bg-[#FAF7F2] hover:border-[#C4B9AA]'
                                }`}
                              >
                                <span className="text-xs font-medium text-[#292929]">{mod.name}</span>
                                {mod.priceCents > 0 ? (
                                  <span className="text-[10px] font-mono text-[#7A736C] shrink-0">
                                    +{formatPHP(mod.priceCents)}
                                  </span>
                                ) : isSelected ? (
                                  <Check className="w-3.5 h-3.5 text-[#3B2925] shrink-0" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {!showItemNotes ? (
                    <button
                      type="button"
                      onClick={() => setShowItemNotes(true)}
                      className="text-xs font-medium text-[#7A736C] hover:text-[#3B2925] transition cursor-pointer"
                    >
                      + Add note
                    </button>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide">
                          Note
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowItemNotes(false);
                            setItemNotes('');
                          }}
                          className="text-[11px] text-[#9B948C] hover:text-[#6E6862] cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        autoFocus
                        placeholder="e.g. less ice, extra shot…"
                        value={itemNotes}
                        onChange={e => setItemNotes(e.target.value)}
                        className="w-full bg-[#F7F3EB] px-3.5 py-2.5 rounded-xl border border-transparent text-xs text-[#292929] placeholder:text-[#9B948C] outline-hidden focus:bg-white focus:border-[#E8E2D9] transition"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-[#F0EAE1] bg-[#FAF7F2] flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-[#9B948C] font-medium uppercase tracking-wide">Item total</p>
                <p className="text-lg font-mono font-bold text-[#292929] tracking-tight tabular-nums">
                  {formatPHP(customizerLivePriceCents)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCustomizerBack}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer transition"
                >
                  {customizerStep === 'extras' && productNeedsSizeStep(customizingProduct)
                    ? 'Back'
                    : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleCustomizerNext}
                  disabled={!selectedVariant}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#3B2925] text-white hover:bg-[#2C1E1A] cursor-pointer shadow-[0_2px_8px_rgba(59,41,37,0.2)] transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {customizerStep === 'size' && productNeedsExtrasStep(customizingProduct)
                    ? 'Next'
                    : 'Add to Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B2925]/35 backdrop-blur-[3px] p-4 animate-backdrop">
          <div className="w-full max-w-md bg-white rounded-[1.25rem] shadow-[0_20px_50px_rgba(59,41,37,0.18)] border border-[#E8E2D9] overflow-hidden animate-in">
            {/* Amount hero */}
            <div className="px-6 pt-6 pb-5 text-center border-b border-[#F0EAE1] bg-gradient-to-b from-[#FAF7F2] to-white">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#9B948C] mb-1.5">
                Amount due
              </p>
              <p className="text-4xl font-bold font-mono text-[#292929] tracking-tight tabular-nums leading-none">
                {formatPHP(totalCents)}
              </p>
              <p className="text-[11px] text-[#7A736C] mt-2">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
                {orderType === 'dine_in' ? ' · Dine in' : orderType === 'take_out' ? ' · Take out' : ' · Delivery'}
              </p>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Payment methods */}
              <div>
                <label className="text-[11px] font-semibold text-[#6E6862] uppercase tracking-wide block mb-2.5">
                  Payment method
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'gcash', label: 'GCash', icon: Smartphone },
                    { id: 'maya', label: 'Maya', icon: Smartphone },
                    { id: 'card_pos', label: 'Card', icon: CreditCard }
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
                        className={`py-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-[#3B2925] text-white border-[#3B2925] shadow-[0_4px_12px_rgba(59,41,37,0.2)]'
                            : 'border-[#E8E2D9] hover:bg-[#FAF7F2] hover:border-[#C4B9AA] text-[#6E6862]'
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5" strokeWidth={1.8} />
                        <span className="text-[11px] font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash fields */}
              {paymentMethod === 'cash' ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { label: 'Exact', amount: totalCents / 100 },
                      { label: '₱100', amount: 100 },
                      { label: '₱200', amount: 200 },
                      { label: '₱500', amount: 500 },
                      { label: '₱1k', amount: 1000 }
                    ].map(bill => {
                      const isActive =
                        Math.abs(parseFloat(cashTenderedInput || '0') - bill.amount) < 0.001;
                      return (
                        <button
                          key={bill.label}
                          type="button"
                          onClick={() => setCashTenderedInput(bill.amount.toString())}
                          className={`py-2 rounded-xl text-[11px] font-mono font-medium cursor-pointer transition ${
                            isActive
                              ? 'bg-[#3B2925] text-white'
                              : 'bg-[#F7F3EB] hover:bg-[#EFE9DF] text-[#292929]'
                          }`}
                        >
                          {bill.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-[#7A736C] block mb-1.5">
                        Cash tendered
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={cashTenderedInput}
                        onChange={e => setCashTenderedInput(e.target.value)}
                        className="w-full bg-[#F7F3EB] border border-transparent rounded-xl px-3.5 py-2.5 text-base font-mono font-semibold text-[#292929] outline-hidden focus:bg-white focus:border-[#E8E2D9] transition tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-[#7A736C] block mb-1.5">
                        Change
                      </label>
                      <div className="h-[42px] px-3.5 flex items-center bg-[#F7F3EB] rounded-xl font-mono font-bold text-base text-[#292929] tabular-nums">
                        {formatPHP(changeCents)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-medium text-[#7A736C] block mb-1.5">
                      {paymentMethod === 'gcash'
                        ? 'GCash'
                        : paymentMethod === 'maya'
                          ? 'Maya'
                          : 'Card'}{' '}
                      reference
                    </label>
                    <input
                      type="text"
                      placeholder="Approval / ref. code"
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      className="w-full bg-[#F7F3EB] border border-transparent rounded-xl px-3.5 py-2.5 text-sm font-mono text-[#292929] placeholder:text-[#9B948C] outline-hidden focus:bg-white focus:border-[#E8E2D9] transition"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-[#F7F3EB] hover:bg-[#EFE9DF] transition">
                    <input
                      type="checkbox"
                      checked={isConfirmedOnlineRef}
                      onChange={e => setIsConfirmedOnlineRef(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-[#C4B9AA] text-[#3B2925] focus:ring-[#3B2925] accent-[#3B2925]"
                    />
                    <span className="text-xs text-[#6E6862] leading-relaxed">
                      I’ve verified the customer’s successful payment on their screen
                    </span>
                  </label>
                </div>
              )}

              {checkoutError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FDF6F4] text-[#A25035] border border-[#F0D9D2] text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{checkoutError}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 bg-[#FAF7F2] border-t border-[#F0EAE1] flex gap-2">
              <button
                type="button"
                disabled={isProcessingCheckout}
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 px-4 py-3 rounded-2xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer transition"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isProcessingCheckout}
                onClick={isProcessingCheckout ? undefined : handleCompleteSale}
                className={`flex-[1.6] px-4 py-3 rounded-2xl text-xs font-semibold bg-[#3B2925] hover:bg-[#2C1E1A] text-white transition shadow-[0_2px_8px_rgba(59,41,37,0.2)] flex items-center justify-center gap-2 ${
                  isProcessingCheckout
                    ? 'opacity-60 pointer-events-none cursor-not-allowed'
                    : 'cursor-pointer active:scale-[0.98]'
                }`}
              >
                {isProcessingCheckout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Complete sale</span>
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
