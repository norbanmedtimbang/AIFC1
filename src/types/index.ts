export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  pinHash: string; // Plain or hashed 4-digit PIN for local terminal
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CashierShift {
  id: string;
  userId: string;
  userName: string;
  openingCashCents: number;
  closingCashCents?: number;
  expectedCashCents?: number;
  actualCashCents?: number;
  cashVarianceCents?: number; // actual - expected
  notes?: string;
  status: 'open' | 'closed';
  openedAt: string;
  closedAt?: string;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  userId: string;
  userName: string;
  type: 'cash_in' | 'cash_out' | 'drop';
  amountCents: number;
  reason: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  displayOrder: number;
  colorCode?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // e.g. "12oz Hot", "16oz Iced", "Regular"
  sku?: string;
  priceCents: number;
  costPriceCents: number;
  isActive: boolean;
}

export interface Modifier {
  id: string;
  groupId: string;
  name: string; // e.g. "Oat Milk", "Vanilla Syrup", "Extra Shot"
  priceCents: number;
  isDefault: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string; // e.g. "Milk Choice", "Sweetness", "Add-ons"
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  modifiers: Modifier[];
}

export interface RecipeIngredient {
  id: string;
  inventoryItemId: string;
  itemName: string;
  unit: string;
  quantityRequired: number; // e.g. 18 for grams of espresso, 200 for ml of milk
}

export interface Product {
  id: string;
  categoryId: string;
  sku?: string;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  imageUrl?: string;
  variants: ProductVariant[];
  modifierGroupIds: string[];
  recipes?: Record<string, RecipeIngredient[]>; // variantId -> RecipeIngredient[]
}

export interface InventoryItem {
  id: string;
  sku?: string;
  name: string;
  unit: 'grams' | 'ml' | 'pcs' | 'shots' | 'kg' | 'liters';
  currentStock: number;
  minThreshold: number;
  costPerUnitCents: number; // in centavos
  updatedAt: string;
}

export type InventoryMovementType = 
  | 'sale' 
  | 'purchase' 
  | 'waste' 
  | 'spill' 
  | 'count_adjustment' 
  | 'refund';

export interface InventoryMovement {
  id: string;
  inventoryItemId: string;
  itemName: string;
  type: InventoryMovementType;
  quantityDelta: number; // negative for deductions, positive for additions
  balanceAfter: number;
  referenceId?: string; // saleId or purchaseId
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface PurchaseItem {
  id: string;
  inventoryItemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitCostCents: number;
  totalCostCents: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber?: string;
  status: 'pending' | 'received' | 'cancelled';
  totalAmountCents: number;
  purchasedAt: string;
  receivedAt?: string;
  items: PurchaseItem[];
}

export type OrderType = 'dine_in' | 'take_out' | 'delivery_pickup';
export type DiscountType = 'senior' | 'pwd' | 'staff' | 'custom';
export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'card_pos' | 'bank_transfer';
export type PaymentStatus = 'paid' | 'refunded' | 'partially_refunded' | 'voided';

export interface SaleItemModifier {
  id: string;
  modifierNameSnapshot: string;
  priceCents: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  variantId: string;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  modifiers: SaleItemModifier[];
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  method: PaymentMethod;
  amountCents: number;
  tenderedCents: number;
  changeCents: number;
  referenceNumber?: string; // GCash/Maya ref #, Card approval code
  processedAt: string;
}

export interface Sale {
  id: string;
  orderNumber: string; // e.g. "C5-20261004-001"
  shiftId?: string;
  cashierId: string;
  cashierName: string;
  orderType: OrderType;
  customerName?: string;
  customerNotes?: string;
  subtotalCents: number;
  tableNumber?: string; // dine-in table
  discountCents: number;
  discountLabel?: string;
  discountType?: DiscountType;
  discountIdName?: string; // Senior/PWD ID holder name
  discountIdNumber?: string; // Senior Citizen / PWD ID number
  isVatExempt?: boolean; // Senior/PWD transactions are VAT-exempt
  vatRemovedCents?: number; // VAT removed from price before the 20% discount
  vatExemptCents?: number; // VAT-exempt sales amount (amount due)
  taxCents: number;
  totalCents: number;
  paymentStatus: PaymentStatus;
  payment: PaymentRecord;
  items: SaleItem[];
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  saleId: string;
  orderNumber: string;
  reason: string;
  authorizedBy: string;
  amountCents: number;
  restockInventory: boolean;
  refundedAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName: string;
  shiftId?: string;
  userId: string;
  userName: string;
  amountCents: number;
  payee: string;
  description: string;
  receiptReference?: string;
  spentAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  terminal: string;
  createdAt: string;
}

export interface ShopSettings {
  storeName: string;
  tagline: string;
  branchName: string;
  address: string;
  phone: string;
  tinNumber: string;
  receiptHeader: string;
  receiptFooter: string;
  taxRatePercent: number; // e.g. 12 for 12% VAT
  isTaxIncluded: boolean;
  currencySymbol: string;
  lastBackupAt?: string;
}

export interface CartItem {
  tempId: string;
  product: Product;
  variant: ProductVariant;
  selectedModifiers: Modifier[];
  quantity: number;
  notes?: string;
  unitPriceCents: number;
  totalPriceCents: number;
}
