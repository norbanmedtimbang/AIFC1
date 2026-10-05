import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
  Trash2,
  Check,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Coffee,
  Bike,
  UtensilsCrossed,
  ShoppingBag,
  Sliders
} from 'lucide-react';
import {
  Product,
  ProductVariant,
  Modifier,
  ModifierGroup,
  CartItem,
  OrderType,
  PaymentMethod,
  Sale,
  ShopSettings,
  User,
  CashierShift
} from '../../types';
import { db, formatPHP } from '../../services/storage';
import { ThermalReceiptModal } from '../shared/ThermalReceiptModal';

interface POSViewProps {
  products: Product[];
  categories: { id: string; name: string }[];
  modifierGroups: ModifierGroup[];
  settings: ShopSettings;
  currentUser: User;
  activeShift: CashierShift | null;
  onRefreshData: () => void;
  onOpenShiftModal: () => void;
}

// Dedicated Card matching the Purr'Coffee aesthetic
interface ProductCardProps {
  product: Product;
  onAddToCart: (variant: ProductVariant, quantity: number) => void;
  onOpenCustomizer: (product: Product, variant: ProductVariant) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onOpenCustomizer
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  const activeVariant = useMemo(() => {
    return product.variants.find(v => v.id === selectedVariantId) || product.variants[0];
  }, [product.variants, selectedVariantId]);

  const handleAdd = () => {
    if (!activeVariant) return;
    onAddToCart(activeVariant, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 900);
  };

  return (
    <div className="bg-white rounded-[26px] p-4 border border-[#F5EBE1] shadow-[0_10px_30px_rgba(200,165,135,0.10)] hover:shadow-[0_14px_35px_rgba(200,165,135,0.16)] transition-all duration-200 flex flex-col justify-between group">
      {/* Top Image Container */}
      <div
        onClick={() => onOpenCustomizer(product, activeVariant)}
        className="w-full h-44 rounded-[20px] overflow-hidden bg-[#F5EBE1] relative cursor-pointer group-hover:opacity-95 transition"
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#C68A57]/60">
            <Coffee className="w-10 h-10" />
            <span className="text-[10px] font-semibold mt-1">Specialty Brew</span>
          </div>
        )}

        {/* Quick Customizer badge */}
        {product.modifierGroupIds.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCustomizer(product, activeVariant);
            }}
            className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-[#C68A57] shadow-xs hover:bg-white transition flex items-center gap-1"
          >
            <Sliders className="w-2.5 h-2.5" />
            <span>Customize</span>
          </button>
        )}
      </div>

      {/* Details */}
      <div className="pt-3 pb-1 flex-1 flex flex-col justify-between">
        <div>
          {/* Title & Price in one bold line */}
          <div className="flex items-start justify-between gap-2">
            <h4
              onClick={() => onOpenCustomizer(product, activeVariant)}
              className="font-bold text-sm text-[#2B2521] leading-snug cursor-pointer hover:text-[#C68A57] transition line-clamp-1"
            >
              {product.name}
            </h4>
            <span className="font-extrabold text-sm text-[#2B2521] shrink-0 font-mono tabular-nums">
              {formatPHP(activeVariant?.priceCents || 0)}
            </span>
          </div>

          {/* Short Description */}
          {product.description && (
            <p className="text-[11px] text-[#8C7F76] mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Size Selector */}
        {product.variants.length > 0 && (
          <div className="mt-3">
            <span className="block text-[11px] font-semibold text-[#5A4F47] mb-1.5">
              Size
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {product.variants.map(variant => {
                const isSelected = variant.id === activeVariant?.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#FCEFE5] border border-[#DEBEA6] text-[#C68A57] font-bold shadow-2xs'
                        : 'bg-white border border-[#EAE0D5] text-[#8C7F76] hover:border-[#C68A57]/60'
                    }`}
                  >
                    {variant.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Row: Stepper + Add to Cart Button */}
      <div className="pt-3 border-t border-[#F5EBE1] flex items-center justify-between gap-2 mt-2">
        {/* Stepper Pill */}
        <div className="flex items-center bg-[#F9F4EE] border border-[#EFE4D9] rounded-xl px-2 py-1 gap-2 text-xs font-bold text-[#5A4F47]">
          <button
            type="button"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-5 h-5 rounded-md hover:bg-white flex items-center justify-center transition active:scale-95"
          >
            <Minus className="w-3 h-3 text-[#7E726A]" />
          </button>
          <span className="w-4 text-center tabular-nums font-mono">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(q => q + 1)}
            className="w-5 h-5 rounded-md hover:bg-white flex items-center justify-center transition active:scale-95"
          >
            <Plus className="w-3 h-3 text-[#7E726A]" />
          </button>
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAdd}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white transition-all shadow-xs flex items-center justify-center gap-1.5 ${
            justAdded
              ? 'bg-emerald-600 scale-[0.98]'
              : 'bg-[#C68A57] hover:bg-[#AC7140] active:scale-95'
          }`}
        >
          {justAdded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Added</span>
            </>
          ) : (
            <span>Add to Cart</span>
          )}
        </button>
      </div>
    </div>
  );
};

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
  const handleOpenCustomizer = (product: Product, variant: ProductVariant) => {
    setCustomizingProduct(product);
    setSelectedVariant(variant);
    setSelectedModifiers([]);
    setCustomizerNotes('');
  };

  // Add directly from card
  const handleQuickAddToCart = (product: Product, variant: ProductVariant, quantity: number) => {
    const newItem: CartItem = {
      tempId: 'cart-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      product,
      variant,
      selectedModifiers: [],
      quantity,
      unitPriceCents: variant.priceCents,
      totalPriceCents: variant.priceCents * quantity
    };
    setCart(prev => [...prev, newItem]);
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
  const handleAddCustomizedToCart = () => {
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

  const handleClearCart = () => {
    if (cart.length > 0 && window.confirm('Clear all items from current cart ticket?')) {
      setCart([]);
      setCustomerName('');
      setDiscountType('none');
    }
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    if (!activeShift) {
      alert('Please open a cashier shift with opening cash float before ringing up sales.');
      onOpenShiftModal();
      return;
    }
    setPaymentMethod('cash');
    setCashTenderedInput((totalCents / 100).toString());
    setReferenceNumber('');
    setIsConfirmedOnlineRef(false);
    setCheckoutError(null);
    setIsCheckoutOpen(true);
  };

  // Cash Calculation
  const tenderedCents = useMemo(() => {
    const parsed = parseFloat(cashTenderedInput);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }, [cashTenderedInput]);

  const changeCents = Math.max(0, tenderedCents - totalCents);

  // Commit Checkout Transaction
  const handleCompleteSale = () => {
    setCheckoutError(null);

    if (paymentMethod === 'cash') {
      if (tenderedCents < totalCents) {
        setCheckoutError(`Tendered cash (${formatPHP(tenderedCents)}) is less than total due (${formatPHP(totalCents)}).`);
        return;
      }
    } else {
      if (!referenceNumber.trim()) {
        setCheckoutError(`Please record the ${paymentMethod.toUpperCase()} confirmation reference number.`);
        return;
      }
      if (!isConfirmedOnlineRef) {
        setCheckoutError(`Cashier must visually confirm customer's payment screen.`);
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

  return (
    <div className="flex h-full overflow-hidden p-4 gap-4">
      {/* CENTER SECTION: MENU CATALOG */}
      <div className="flex-1 flex flex-col overflow-hidden space-y-4">
        {/* Top Search Bar & Filter Button (Matching Inspiration) */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#A59B93]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white pl-11 pr-4 py-2.5 rounded-full border border-[#EFE4D9] text-xs text-[#2B2521] placeholder:text-[#A59B93] outline-hidden focus:border-[#C68A57] shadow-xs transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8C7F76] hover:text-[#2B2521]"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => setSelectedCategory('all')}
            className="px-5 py-2.5 rounded-full bg-[#C68A57] hover:bg-[#AC7140] text-white text-xs font-bold transition shadow-xs flex items-center gap-2 shrink-0 active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </div>

        {/* Section Heading & Category Filter Pills */}
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-[#2B2521] tracking-tight">
            Coffee menu
          </h2>

          {/* Horizontal Category Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                selectedCategory === 'all'
                  ? 'bg-[#C68A57] text-white shadow-xs'
                  : 'bg-white text-[#7D726A] border border-[#EFE4D9] hover:bg-[#FCEFE5] hover:text-[#C68A57]'
              }`}
            >
              All
            </button>
            {categories.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                    isActive
                      ? 'bg-[#C68A57] text-white shadow-xs'
                      : 'bg-white text-[#7D726A] border border-[#EFE4D9] hover:bg-[#FCEFE5] hover:text-[#C68A57]'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-[#8C7F76]">
              <Coffee className="w-10 h-10 text-[#DECFC2] mb-2" />
              <p className="text-sm font-bold text-[#2B2521]">No items found</p>
              <p className="text-xs text-[#8C7F76] mt-0.5">Try searching another drink or keyword</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={(variant, qty) => handleQuickAddToCart(product, variant, qty)}
                  onOpenCustomizer={(p, v) => handleOpenCustomizer(p, v)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION: CART SUMMARY (Matching Purr'Coffee Layout) */}
      <div className="w-88 bg-white rounded-[28px] p-5 border border-[#F5EBE1] shadow-[0_10px_30px_rgba(200,165,135,0.12)] flex flex-col justify-between shrink-0 select-none">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#2B2521] tracking-tight">
              Cart summary
            </h3>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* 3 Order Type Selector Tiles: Delivery, Dine in, Take away */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'delivery_pickup', label: 'Delivery', icon: Bike },
              { id: 'dine_in', label: 'Dine in', icon: UtensilsCrossed },
              { id: 'take_out', label: 'Take away', icon: ShoppingBag }
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = orderType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setOrderType(tab.id as OrderType)}
                  className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-xs ${
                    isSelected
                      ? 'bg-[#FCEFE5] border border-[#DEBEA6] text-[#C68A57] font-bold shadow-xs'
                      : 'bg-[#F9F4EE] border border-transparent text-[#7D726A] hover:bg-[#F3E9DF]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px]">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Customer Name Field */}
          <input
            type="text"
            placeholder="Customer name (Optional)"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-full bg-[#FBF6F0] px-3.5 py-2 rounded-xl border border-[#EFE4D9] text-xs text-[#2B2521] placeholder:text-[#A59B93] outline-hidden focus:border-[#C68A57]"
          />

          {/* Cart Item Rows */}
          <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-[#A59B93] space-y-1">
                <Coffee className="w-8 h-8 mx-auto text-[#DECFC2]" />
                <p className="text-xs font-semibold">Your ticket is empty</p>
                <p className="text-[11px]">Choose a coffee to start ringing orders</p>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.tempId}
                  className="flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-[#FBF6F0] transition"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-[#F5EBE1] overflow-hidden shrink-0">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#C68A57]">
                          <Coffee className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-[#2B2521] truncate">
                        {item.product.name}
                      </p>
                      <p className="text-[10px] text-[#8C7F76] truncate">
                        {item.variant.name}
                        {item.selectedModifiers.length > 0 &&
                          ` + ${item.selectedModifiers.map(m => m.name).join(', ')}`}
                      </p>
                      <p className="text-xs font-extrabold text-[#2B2521] font-mono tabular-nums mt-0.5">
                        {formatPHP(item.totalPriceCents)}
                      </p>
                    </div>
                  </div>

                  {/* Inline Stepper Pill */}
                  <div className="flex items-center bg-[#F9F4EE] border border-[#EFE4D9] rounded-full px-2 py-0.5 gap-2 text-xs font-bold text-[#5A4F47] shrink-0">
                    <button
                      onClick={() => handleUpdateQuantity(item.tempId, -1)}
                      className="w-4 h-4 hover:text-[#C68A57] flex items-center justify-center"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-3 text-center tabular-nums font-mono text-[11px]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.tempId, 1)}
                      className="w-4 h-4 hover:text-[#C68A57] flex items-center justify-center"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pricing Breakdown & Place An Order Button */}
        <div className="pt-4 border-t border-[#F5EBE1] space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[#7D726A]">
              <span>Price</span>
              <span className="font-mono font-bold tabular-nums text-[#2B2521]">
                {formatPHP(subtotalCents)}
              </span>
            </div>

            {/* Discount selector button or line */}
            <div className="flex items-center justify-between text-[#7D726A]">
              <div className="flex items-center gap-1.5">
                <span>Discount applied</span>
                <select
                  value={discountType}
                  onChange={e => setDiscountType(e.target.value as any)}
                  className="text-[10px] bg-[#FBF6F0] rounded-lg border border-[#EFE4D9] px-1.5 py-0.5 outline-hidden text-[#C68A57] font-semibold cursor-pointer"
                >
                  <option value="none">None</option>
                  <option value="senior">Senior (20%)</option>
                  <option value="pwd">PWD (20%)</option>
                  <option value="staff">Staff (10%)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <span className="font-mono font-bold tabular-nums text-emerald-700">
                {discountDetails.cents > 0 ? `-${formatPHP(discountDetails.cents)}` : '₱0.00'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F5EBE1]">
              <span className="text-sm font-extrabold text-[#2B2521]">Grand total</span>
              <span className="text-lg font-black text-[#2B2521] font-mono tabular-nums">
                {formatPHP(totalCents)}
              </span>
            </div>
          </div>

          {/* Large Place An Order Button */}
          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
              cart.length === 0
                ? 'bg-[#DECFC2] text-white/70 cursor-not-allowed'
                : 'bg-[#C68A57] hover:bg-[#AC7140] active:scale-[0.98]'
            }`}
          >
            <span>Place an order</span>
          </button>
        </div>
      </div>

      {/* PRODUCT CUSTOMIZER MODAL */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-[#F5EBE1] overflow-hidden my-6">
            {/* Customizer Header */}
            <div className="bg-[#FFFDFB] p-6 border-b border-[#F5EBE1] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-[#2B2521]">
                  {customizingProduct.name}
                </h3>
                <p className="text-xs text-[#8C7F76] mt-0.5">{customizingProduct.description}</p>
              </div>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="w-8 h-8 rounded-full bg-[#F5EBE1] hover:bg-[#EFE4D9] flex items-center justify-center text-xs font-bold text-[#5A4F47]"
              >
                ✕
              </button>
            </div>

            {/* Sizes & Variants */}
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5A4F47] block mb-2">
                  Select Size
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {customizingProduct.variants.map(variant => {
                    const isSelected = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-[#FCEFE5] border-[#DEBEA6] text-[#C68A57] shadow-xs'
                            : 'border-[#EFE4D9] hover:bg-[#FBF6F0]'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-[#2B2521]">{variant.name}</p>
                          <p className="text-xs font-mono font-bold tabular-nums text-[#C68A57] mt-0.5">
                            {formatPHP(variant.priceCents)}
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#C68A57]" />}
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
                  <div key={group.id} className="pt-3 border-t border-[#F5EBE1]">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#5A4F47] block mb-2">
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
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-[#FCEFE5] border-[#DEBEA6] text-[#C68A57]'
                                : 'border-[#EFE4D9] hover:bg-[#FBF6F0]'
                            }`}
                          >
                            <span className="text-xs font-semibold text-[#2B2521]">{mod.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#C68A57]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Notes */}
              <div className="pt-3 border-t border-[#F5EBE1]">
                <label className="text-xs font-bold uppercase tracking-wider text-[#5A4F47] block mb-1.5">
                  Barista Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra hot, personal tumbler, oat milk foam..."
                  value={customizerNotes}
                  onChange={e => setCustomizerNotes(e.target.value)}
                  className="w-full bg-[#FBF6F0] border border-[#EFE4D9] rounded-xl px-3 py-2 text-xs text-[#2B2521] outline-hidden focus:border-[#C68A57]"
                />
              </div>
            </div>

            {/* Customizer Footer */}
            <div className="p-5 bg-[#FFFDFB] border-t border-[#F5EBE1] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#8C7F76]">Item Total</span>
                <p className="text-lg font-black font-mono tabular-nums text-[#2B2521]">
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#7D726A] hover:bg-[#F5EBE1] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomizedToCart}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#C68A57] hover:bg-[#AC7140] text-white transition shadow-xs flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-[32px] shadow-2xl border border-[#F5EBE1] overflow-hidden my-6">
            {/* Header */}
            <div className="bg-[#FFFDFB] p-6 border-b border-[#F5EBE1] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#C68A57] font-bold tracking-wider uppercase">
                  Tender Payment
                </span>
                <h3 className="font-extrabold text-xl text-[#2B2521] mt-0.5">
                  Complete Order
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#8C7F76]">Total Due</span>
                <p className="text-2xl font-black font-mono tabular-nums text-[#2B2521]">
                  {formatPHP(totalCents)}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
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
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition ${
                        isSelected
                          ? 'bg-[#FCEFE5] text-[#C68A57] border-[#DEBEA6] shadow-xs font-bold'
                          : 'border-[#EFE4D9] hover:bg-[#FBF6F0] text-[#5A4F47]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cash Payment Mode */}
              {paymentMethod === 'cash' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#8C7F76] block mb-2">
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
                          className="py-2.5 rounded-xl bg-[#F9F4EE] hover:bg-[#F3E9DF] border border-[#EFE4D9] text-xs font-bold font-mono tabular-nums text-[#2B2521] active:scale-95 transition"
                        >
                          {bill.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#8C7F76] block mb-1">
                        Cash Tendered (₱)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={cashTenderedInput}
                        onChange={e => setCashTenderedInput(e.target.value)}
                        className="w-full bg-[#FBF6F0] border border-[#EFE4D9] rounded-xl px-4 py-3 text-xl font-bold font-mono tabular-nums text-[#2B2521] focus:border-[#C68A57] outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-[#8C7F76] block mb-1">
                        Change Due
                      </label>
                      <div
                        className={`w-full border rounded-xl px-4 py-3 text-xl font-black font-mono tabular-nums flex items-center justify-between ${
                          tenderedCents >= totalCents
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-rose-50 text-rose-700 border-rose-300'
                        }`}
                      >
                        <span>{formatPHP(changeCents)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-[#FBF6F0] p-4 rounded-2xl border border-[#EFE4D9]">
                  <div className="flex items-start gap-2.5 text-xs text-[#2B2521]">
                    <Smartphone className="w-5 h-5 text-[#C68A57] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">E-Wallet Confirmation</p>
                      <p className="text-[#8C7F76] mt-0.5 leading-relaxed">
                        Verify customer's payment screen and record reference number.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-[#2B2521] block mb-1">
                      {paymentMethod.toUpperCase()} Approval Reference # *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 984321, APPR-0192"
                      value={referenceNumber}
                      onChange={e => setReferenceNumber(e.target.value)}
                      className="w-full bg-white border border-[#EFE4D9] rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-[#2B2521] uppercase outline-hidden focus:border-[#C68A57]"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isConfirmedOnlineRef}
                      onChange={e => setIsConfirmedOnlineRef(e.target.checked)}
                      className="w-4 h-4 rounded text-[#C68A57] focus:ring-[#C68A57]"
                    />
                    <span className="text-xs font-semibold text-[#2B2521]">
                      I have confirmed the customer's payment screen.
                    </span>
                  </label>
                </div>
              )}

              {checkoutError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-white border-t border-[#F5EBE1] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#7D726A] hover:bg-[#F5EBE1] border border-[#EFE4D9] transition"
              >
                Back to Ticket
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#C68A57] hover:bg-[#AC7140] text-white transition shadow-md flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Complete Order</span>
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

      {/* INVENTORY ALERTS */}
      {inventoryWarnings.length > 0 && (
        <div className="fixed bottom-4 left-68 right-8 z-40 bg-amber-50 border border-amber-300 rounded-2xl p-3 shadow-lg flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="space-y-0.5">
              {inventoryWarnings.map((w, i) => (
                <p key={i} className="font-medium">
                  {w}
                </p>
              ))}
            </div>
          </div>
          <button
            onClick={() => setInventoryWarnings([])}
            className="text-amber-800 hover:text-black font-bold text-xs px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
