import {
  User,
  CashierShift,
  CashMovement,
  Category,
  Product,
  ModifierGroup,
  InventoryItem,
  InventoryMovement,
  Supplier,
  Purchase,
  Sale,
  RefundRecord,
  ExpenseCategory,
  Expense,
  AuditLog,
  ShopSettings,
  CartItem,
  PaymentMethod,
  OrderType
} from '../types';

const STORAGE_KEY = 'c5isr_pos_offline_db_v2_clean';
const DB_VERSION = '2.0.0';

export interface DatabaseState {
  version: string;
  users: User[];
  currentUserId: string;
  activeShift: CashierShift | null;
  shifts: CashierShift[];
  cashMovements: CashMovement[];
  categories: Category[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  inventoryItems: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
  refunds: RefundRecord[];
  expenseCategories: ExpenseCategory[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  settings: ShopSettings;
}

// Format centavos to PHP string: 15000 -> "₱150.00"
export function formatPHP(cents: number): string {
  const isNegative = cents < 0;
  const absValue = Math.abs(cents) / 100;
  return `${isNegative ? '-' : ''}₱${absValue.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function parsePHPAmountToCents(amount: number): number {
  return Math.round(amount * 100);
}

// Clean Initial User: Only 1 root administrator
const initialUsers: User[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    fullName: 'System Administrator',
    role: 'admin',
    pinHash: '1234',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

const initialCategories: Category[] = [
  { id: 'cat-1', name: 'Coffee', displayOrder: 1, colorCode: '#C68A57' },
  { id: 'cat-2', name: 'Non Coffee', displayOrder: 2, colorCode: '#8E9E85' },
  { id: 'cat-3', name: 'Food', displayOrder: 3, colorCode: '#D4C7B5' },
  { id: 'cat-4', name: 'Snack', displayOrder: 4, colorCode: '#C29B7F' },
  { id: 'cat-5', name: 'Dessert', displayOrder: 5, colorCode: '#E4A882' }
];

const initialInventory: InventoryItem[] = [
  { id: 'inv-beans-house', sku: 'RAW-BEAN-ESP', name: 'House Espresso Blend Beans', unit: 'grams', currentStock: 8500, minThreshold: 2000, costPerUnitCents: 120, updatedAt: new Date().toISOString() },
  { id: 'inv-milk-fresh', sku: 'RAW-MILK-WHOLE', name: 'Fresh Whole Dairy Milk', unit: 'ml', currentStock: 18000, minThreshold: 4000, costPerUnitCents: 12, updatedAt: new Date().toISOString() },
  { id: 'inv-syrup-vanilla', sku: 'RAW-SYR-VAN', name: 'Artisan Vanilla Syrup', unit: 'ml', currentStock: 3200, minThreshold: 500, costPerUnitCents: 45, updatedAt: new Date().toISOString() },
  { id: 'inv-cups-16oz', sku: 'PKG-CUP-16', name: '16oz Biodegradable Cups', unit: 'pcs', currentStock: 450, minThreshold: 80, costPerUnitCents: 450, updatedAt: new Date().toISOString() }
];

const initialModifierGroups: ModifierGroup[] = [
  {
    id: 'modgrp-1',
    name: 'Milk Selection',
    minSelection: 0,
    maxSelection: 1,
    isRequired: false,
    modifiers: [
      { id: 'mod-1', groupId: 'modgrp-1', name: 'Standard Whole Milk', priceCents: 0, isDefault: true },
      { id: 'mod-2', groupId: 'modgrp-1', name: 'Oat Milk (+₱40)', priceCents: 4000, isDefault: false },
      { id: 'mod-3', groupId: 'modgrp-1', name: 'Almond Milk (+₱40)', priceCents: 4000, isDefault: false }
    ]
  },
  {
    id: 'modgrp-2',
    name: 'Sweetness Level',
    minSelection: 0,
    maxSelection: 1,
    isRequired: false,
    modifiers: [
      { id: 'mod-4', groupId: 'modgrp-2', name: '100% Regular Sweetness', priceCents: 0, isDefault: true },
      { id: 'mod-5', groupId: 'modgrp-2', name: '70% Less Sweet', priceCents: 0, isDefault: false },
      { id: 'mod-6', groupId: 'modgrp-2', name: '30% Light Sweetness', priceCents: 0, isDefault: false },
      { id: 'mod-7', groupId: 'modgrp-2', name: '0% Unsweetened', priceCents: 0, isDefault: false }
    ]
  },
  {
    id: 'modgrp-3',
    name: 'Espresso Shots',
    minSelection: 0,
    maxSelection: 2,
    isRequired: false,
    modifiers: [
      { id: 'mod-8', groupId: 'modgrp-3', name: 'Extra Double Shot (+₱35)', priceCents: 3500, isDefault: false },
      { id: 'mod-9', groupId: 'modgrp-3', name: 'Decaf Espresso (+₱20)', priceCents: 2000, isDefault: false }
    ]
  }
];

const initialProducts: Product[] = [
  {
    id: 'prod-cappuccino',
    categoryId: 'cat-1',
    sku: 'COF-CAP',
    name: 'Cappuccino',
    description: 'Entice in rich coffee with small and home made cappuccino foam.',
    imageUrl: '/src/assets/images/cappuccino_drink_1791171598605.jpg',
    isActive: true,
    displayOrder: 1,
    modifierGroupIds: ['modgrp-1', 'modgrp-2'],
    variants: [
      { id: 'var-cap-s', productId: 'prod-cappuccino', name: 'Small', priceCents: 15000, costPriceCents: 4500, isActive: true },
      { id: 'var-cap-l', productId: 'prod-cappuccino', name: 'Large', priceCents: 18000, costPriceCents: 5500, isActive: true }
    ],
    recipes: {
      'var-cap-s': [
        { id: 'rec-cap-s-1', inventoryItemId: 'inv-beans-house', itemName: 'House Espresso Blend Beans', unit: 'grams', quantityRequired: 18 },
        { id: 'rec-cap-s-2', inventoryItemId: 'inv-milk-fresh', itemName: 'Fresh Whole Dairy Milk', unit: 'ml', quantityRequired: 160 },
        { id: 'rec-cap-s-3', inventoryItemId: 'inv-cups-16oz', itemName: '16oz Biodegradable Cups', unit: 'pcs', quantityRequired: 1 }
      ],
      'var-cap-l': [
        { id: 'rec-cap-l-1', inventoryItemId: 'inv-beans-house', itemName: 'House Espresso Blend Beans', unit: 'grams', quantityRequired: 22 },
        { id: 'rec-cap-l-2', inventoryItemId: 'inv-milk-fresh', itemName: 'Fresh Whole Dairy Milk', unit: 'ml', quantityRequired: 220 },
        { id: 'rec-cap-l-3', inventoryItemId: 'inv-cups-16oz', itemName: '16oz Biodegradable Cups', unit: 'pcs', quantityRequired: 1 }
      ]
    }
  },
  {
    id: 'prod-latte',
    categoryId: 'cat-1',
    sku: 'COF-LAT',
    name: 'Coffee Latte',
    description: 'Enticing coffee with sweet microfoam poured over chilled fresh milk.',
    imageUrl: '/src/assets/images/iced_latte_drink_1791171609455.jpg',
    isActive: true,
    displayOrder: 2,
    modifierGroupIds: ['modgrp-1', 'modgrp-2'],
    variants: [
      { id: 'var-lat-s', productId: 'prod-latte', name: 'Small', priceCents: 16000, costPriceCents: 4800, isActive: true },
      { id: 'var-lat-l', productId: 'prod-latte', name: 'Large', priceCents: 19000, costPriceCents: 5800, isActive: true }
    ],
    recipes: {
      'var-lat-s': [
        { id: 'rec-lat-s-1', inventoryItemId: 'inv-beans-house', itemName: 'House Espresso Blend Beans', unit: 'grams', quantityRequired: 18 },
        { id: 'rec-lat-s-2', inventoryItemId: 'inv-milk-fresh', itemName: 'Fresh Whole Dairy Milk', unit: 'ml', quantityRequired: 180 },
        { id: 'rec-lat-s-3', inventoryItemId: 'inv-cups-16oz', itemName: '16oz Biodegradable Cups', unit: 'pcs', quantityRequired: 1 }
      ],
      'var-lat-l': [
        { id: 'rec-lat-l-1', inventoryItemId: 'inv-beans-house', itemName: 'House Espresso Blend Beans', unit: 'grams', quantityRequired: 24 },
        { id: 'rec-lat-l-2', inventoryItemId: 'inv-milk-fresh', itemName: 'Fresh Whole Dairy Milk', unit: 'ml', quantityRequired: 250 },
        { id: 'rec-lat-l-3', inventoryItemId: 'inv-cups-16oz', itemName: '16oz Biodegradable Cups', unit: 'pcs', quantityRequired: 1 }
      ]
    }
  },
  {
    id: 'prod-americano',
    categoryId: 'cat-1',
    sku: 'COF-AME',
    name: 'Americano',
    description: 'Fast extraction recent and clean specialty roast coffee over chilled water.',
    imageUrl: '/src/assets/images/americano_iced_drink_1791171619230.jpg',
    isActive: true,
    displayOrder: 3,
    modifierGroupIds: ['modgrp-2'],
    variants: [
      { id: 'var-ame-s', productId: 'prod-americano', name: 'Small', priceCents: 15500, costPriceCents: 3500, isActive: true },
      { id: 'var-ame-l', productId: 'prod-americano', name: 'Large', priceCents: 17500, costPriceCents: 4200, isActive: true }
    ],
    recipes: {
      'var-ame-s': [
        { id: 'rec-ame-s-1', inventoryItemId: 'inv-beans-house', itemName: 'House Espresso Blend Beans', unit: 'grams', quantityRequired: 18 },
        { id: 'rec-ame-s-2', inventoryItemId: 'inv-cups-16oz', itemName: '16oz Biodegradable Cups', unit: 'pcs', quantityRequired: 1 }
      ],
      'var-ame-l': [
        { id: 'rec-ame-l-1', inventoryItemId: 'inv-beans-house', itemName: 'House Espresso Blend Beans', unit: 'grams', quantityRequired: 24 },
        { id: 'rec-ame-l-2', inventoryItemId: 'inv-cups-16oz', itemName: '16oz Biodegradable Cups', unit: 'pcs', quantityRequired: 1 }
      ]
    }
  },
  {
    id: 'prod-v60',
    categoryId: 'cat-1',
    sku: 'COF-V60',
    name: 'V60 Pour Over',
    description: 'High condition coffee with delicate citrus and floral finish.',
    imageUrl: '/src/assets/images/v60_pourover_drink_1791171628952.jpg',
    isActive: true,
    displayOrder: 4,
    modifierGroupIds: [],
    variants: [
      { id: 'var-v60-s', productId: 'prod-v60', name: 'Small', priceCents: 18000, costPriceCents: 6000, isActive: true },
      { id: 'var-v60-l', productId: 'prod-v60', name: 'Large', priceCents: 21000, costPriceCents: 7500, isActive: true }
    ],
    recipes: {
      'var-v60-s': [
        { id: 'rec-v60-s-1', inventoryItemId: 'inv-beans-house', itemName: 'House Espresso Blend Beans', unit: 'grams', quantityRequired: 15 },
        { id: 'rec-v60-s-2', inventoryItemId: 'inv-cups-16oz', itemName: '16oz Biodegradable Cups', unit: 'pcs', quantityRequired: 1 }
      ],
      'var-v60-l': [
        { id: 'rec-v60-l-1', inventoryItemId: 'inv-beans-house', itemName: 'House Espresso Blend Beans', unit: 'grams', quantityRequired: 20 },
        { id: 'rec-v60-l-2', inventoryItemId: 'inv-cups-16oz', itemName: '16oz Biodegradable Cups', unit: 'pcs', quantityRequired: 1 }
      ]
    }
  }
];
const initialSuppliers: Supplier[] = [];

const initialExpenseCategories: ExpenseCategory[] = [
  { id: 'expcat-1', name: 'Dairy & Fresh Produce Runs' },
  { id: 'expcat-2', name: 'Ice & Water Supply' },
  { id: 'expcat-3', name: 'Petty Cash & Consumables' },
  { id: 'expcat-4', name: 'Equipment Maintenance & Cleaning' }
];

const initialSettings: ShopSettings = {
  storeName: 'C5ISR COFFEE SHOP',
  tagline: 'Specialty Coffee & Command Operations',
  branchName: 'Main Terminal 1',
  address: 'Update Store Address in Settings',
  phone: 'Update Phone in Settings',
  tinNumber: 'TIN: 000-000-000-000 NV',
  receiptHeader: 'WELCOME TO C5ISR COFFEE\nPRECISION ROASTED & CRAFTED',
  receiptFooter: 'THANK YOU FOR YOUR PATRONAGE!\nKEEP THIS OFFICIAL RECEIPT FOR REVIEWS',
  taxRatePercent: 12,
  isTaxIncluded: true,
  currencySymbol: '₱',
  lastBackupAt: undefined
};

type ProductSyncListener = (product: Product, action: 'save' | 'delete') => void;
let productSyncListener: ProductSyncListener | null = null;

export function setProductSyncListener(listener: ProductSyncListener): void {
  productSyncListener = listener;
}

export class LocalStorageDB {
  private state: DatabaseState;

  constructor() {
    // Clear any previous demo state so the user starts with a completely clean database
    try {
      localStorage.removeItem('c5isr_pos_offline_db_v1');
    } catch {}
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === DB_VERSION) {
          if (!parsed.products || parsed.products.length === 0) {
            parsed.products = initialProducts;
            parsed.categories = initialCategories;
            if (!parsed.inventoryItems || parsed.inventoryItems.length === 0) {
              parsed.inventoryItems = initialInventory;
            }
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return this.getInitialState();
  }

  private getInitialState(): DatabaseState {
    const adminUser = initialUsers[0];

    const state: DatabaseState = {
      version: DB_VERSION,
      users: initialUsers,
      currentUserId: adminUser.id,
      activeShift: null,
      shifts: [],
      cashMovements: [],
      categories: initialCategories,
      products: initialProducts,
      modifierGroups: initialModifierGroups,
      inventoryItems: initialInventory,
      inventoryMovements: [],
      suppliers: initialSuppliers,
      purchases: [],
      sales: [],
      refunds: [],
      expenseCategories: initialExpenseCategories,
      expenses: [],
      auditLogs: [
        {
          id: 'audit-1',
          userId: adminUser.id,
          userName: adminUser.fullName,
          action: 'SYSTEM_BOOT',
          details: 'C5ISR Clean Offline Database initialized. Ready for production.',
          terminal: 'TERMINAL_1',
          createdAt: new Date().toISOString()
        }
      ],
      settings: initialSettings
    };

    this.persist(state);
    return state;
  }

  private persist(state: DatabaseState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Local database persistence failed:', e);
    }
  }

  public getState(): DatabaseState {
    return { ...this.state };
  }

  // Current User Operations
  public getCurrentUser(): User {
    const user = this.state.users.find(u => u.id === this.state.currentUserId);
    return user || this.state.users[0];
  }

  public setCurrentUserId(userId: string): void {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) return;
    this.state.currentUserId = userId;
    this.logAudit(user.id, user.fullName, 'USER_SWITCH', `Switched active cashier to ${user.fullName}`);
    this.persist(this.state);
  }

  public verifyPin(pin: string, allowedRoles?: ('admin' | 'manager' | 'cashier')[]): User | null {
    const user = this.state.users.find(u => u.pinHash === pin && u.status === 'active');
    if (!user) return null;
    if (allowedRoles && !allowedRoles.includes(user.role)) return null;
    return user;
  }

  public addUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...user,
      id: 'u-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    this.state.users.push(newUser);
    const currentUser = this.getCurrentUser();
    this.logAudit(currentUser.id, currentUser.fullName, 'USER_CREATE', `Created user ${newUser.fullName} (${newUser.role})`);
    this.persist(this.state);
    return newUser;
  }

  public updateUser(userId: string, updates: Partial<User>): void {
    const idx = this.state.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      this.state.users[idx] = { ...this.state.users[idx], ...updates };
      const currentUser = this.getCurrentUser();
      this.logAudit(currentUser.id, currentUser.fullName, 'USER_UPDATE', `Updated user ${this.state.users[idx].fullName}`);
      this.persist(this.state);
    }
  }

  // Shift & Cash Drawer Operations
  public openShift(openingCashCents: number, notes?: string): CashierShift {
    const currentUser = this.getCurrentUser();
    const newShift: CashierShift = {
      id: 'shift-' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      openingCashCents,
      notes,
      status: 'open',
      openedAt: new Date().toISOString()
    };

    const cashMovement: CashMovement = {
      id: 'cm-' + Date.now(),
      shiftId: newShift.id,
      userId: currentUser.id,
      userName: currentUser.fullName,
      type: 'cash_in',
      amountCents: openingCashCents,
      reason: 'Shift Opening Cash Float',
      createdAt: newShift.openedAt
    };

    this.state.activeShift = newShift;
    this.state.shifts.unshift(newShift);
    this.state.cashMovements.unshift(cashMovement);
    this.logAudit(currentUser.id, currentUser.fullName, 'SHIFT_OPEN', `Opened shift with ${formatPHP(openingCashCents)} float`);
    this.persist(this.state);
    return newShift;
  }

  public recordCashMovement(type: 'cash_in' | 'cash_out' | 'drop', amountCents: number, reason: string): CashMovement | null {
    if (!this.state.activeShift) return null;
    const currentUser = this.getCurrentUser();

    const movement: CashMovement = {
      id: 'cm-' + Date.now(),
      shiftId: this.state.activeShift.id,
      userId: currentUser.id,
      userName: currentUser.fullName,
      type,
      amountCents,
      reason,
      createdAt: new Date().toISOString()
    };

    this.state.cashMovements.unshift(movement);
    this.logAudit(currentUser.id, currentUser.fullName, `CASH_${type.toUpperCase()}`, `${reason}: ${formatPHP(amountCents)}`);
    this.persist(this.state);
    return movement;
  }

  public closeShift(actualCashCents: number, notes?: string): CashierShift | null {
    if (!this.state.activeShift) return null;
    const currentUser = this.getCurrentUser();
    const shift = this.state.activeShift;

    // Calculate expected cash:
    // Opening Cash + Cash Sales + Cash In - Cash Out - Cash Drops - Cash Expenses
    const shiftSales = this.state.sales.filter(s => s.shiftId === shift.id && s.payment.method === 'cash' && s.paymentStatus === 'paid');
    const totalCashSales = shiftSales.reduce((sum, s) => sum + s.totalCents, 0);

    const shiftMovements = this.state.cashMovements.filter(cm => cm.shiftId === shift.id);
    const totalCashIn = shiftMovements.filter(m => m.type === 'cash_in' && m.reason !== 'Shift Opening Cash Float').reduce((sum, m) => sum + m.amountCents, 0);
    const totalCashOut = shiftMovements.filter(m => m.type === 'cash_out' || m.type === 'drop').reduce((sum, m) => sum + m.amountCents, 0);

    const shiftExpenses = this.state.expenses.filter(e => e.shiftId === shift.id);
    const totalCashExpenses = shiftExpenses.reduce((sum, e) => sum + e.amountCents, 0);

    const expectedCashCents = shift.openingCashCents + totalCashSales + totalCashIn - totalCashOut - totalCashExpenses;
    const cashVarianceCents = actualCashCents - expectedCashCents;

    const closedShift: CashierShift = {
      ...shift,
      closingCashCents: actualCashCents,
      expectedCashCents,
      actualCashCents,
      cashVarianceCents,
      notes,
      status: 'closed',
      closedAt: new Date().toISOString()
    };

    const idx = this.state.shifts.findIndex(s => s.id === shift.id);
    if (idx !== -1) {
      this.state.shifts[idx] = closedShift;
    }
    this.state.activeShift = null;

    this.logAudit(currentUser.id, currentUser.fullName, 'SHIFT_CLOSE', `Closed shift. Expected: ${formatPHP(expectedCashCents)}, Actual: ${formatPHP(actualCashCents)}, Variance: ${formatPHP(cashVarianceCents)}`);
    this.persist(this.state);
    return closedShift;
  }

  // ATOMIC CHECKOUT TRANSACTION
  public checkoutSale(payload: {
    items: CartItem[];
    orderType: OrderType;
    customerName?: string;
    customerNotes?: string;
    discountCents: number;
    discountLabel?: string;
    paymentMethod: PaymentMethod;
    tenderedCents: number;
    referenceNumber?: string;
  }): { sale: Sale; inventoryWarnings: string[] } {
    const currentUser = this.getCurrentUser();
    const activeShift = this.state.activeShift;
    const now = new Date();

    // 1. Calculate totals
    const subtotalCents = payload.items.reduce((sum, item) => sum + item.totalPriceCents, 0);
    const discountCents = Math.min(payload.discountCents, subtotalCents);
    const totalCents = Math.max(0, subtotalCents - discountCents);
    const taxRate = this.state.settings.taxRatePercent / 100;
    const taxCents = this.state.settings.isTaxIncluded 
      ? Math.round((totalCents * taxRate) / (1 + taxRate))
      : Math.round(totalCents * taxRate);

    const changeCents = payload.paymentMethod === 'cash' 
      ? Math.max(0, payload.tenderedCents - totalCents)
      : 0;

    // 2. Generate sequential order number: C5-YYYYMMDD-XXXX
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const todaySalesCount = this.state.sales.filter(s => s.createdAt.startsWith(now.toISOString().slice(0, 10))).length;
    const orderNumber = `C5-${dateStr}-${String(todaySalesCount + 1).padStart(4, '0')}`;
    const saleId = 'sale-' + Date.now();

    // 3. Prepare Sale Items with historical snapshots
    const saleItems = payload.items.map((cartItem, idx) => ({
      id: `sitem-${Date.now()}-${idx}`,
      productId: cartItem.product.id,
      variantId: cartItem.variant.id,
      productNameSnapshot: cartItem.product.name,
      variantNameSnapshot: cartItem.variant.name,
      unitPriceCents: cartItem.unitPriceCents,
      quantity: cartItem.quantity,
      subtotalCents: cartItem.totalPriceCents,
      notes: cartItem.notes,
      modifiers: cartItem.selectedModifiers.map((m, mIdx) => ({
        id: `smod-${Date.now()}-${idx}-${mIdx}`,
        modifierNameSnapshot: m.name,
        priceCents: m.priceCents
      }))
    }));

    // 4. Atomic Inventory Deductions via Recipes
    const inventoryWarnings: string[] = [];
    const inventoryMovementsToCommit: InventoryMovement[] = [];
    const itemStockUpdates: Record<string, number> = {};

    for (const cartItem of payload.items) {
      const recipeIngredients = cartItem.product.recipes?.[cartItem.variant.id] || [];
      for (const ingredient of recipeIngredients) {
        const invItem = this.state.inventoryItems.find(i => i.id === ingredient.inventoryItemId);
        if (!invItem) continue;

        const deduction = ingredient.quantityRequired * cartItem.quantity;
        const currentCalculated = itemStockUpdates[invItem.id] !== undefined 
          ? itemStockUpdates[invItem.id] 
          : invItem.currentStock;

        const newStock = currentCalculated - deduction;
        itemStockUpdates[invItem.id] = newStock;

        if (newStock < invItem.minThreshold) {
          inventoryWarnings.push(`Low stock warning: ${invItem.name} (${newStock.toFixed(1)} ${invItem.unit} remaining)`);
        }

        inventoryMovementsToCommit.push({
          id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          inventoryItemId: invItem.id,
          itemName: invItem.name,
          type: 'sale',
          quantityDelta: -deduction,
          balanceAfter: newStock,
          referenceId: saleId,
          notes: `Deducted for Order ${orderNumber} (${cartItem.quantity}x ${cartItem.product.name})`,
          createdBy: currentUser.fullName,
          createdAt: now.toISOString()
        });
      }
    }

    // Apply inventory updates
    for (const [itemId, newStock] of Object.entries(itemStockUpdates)) {
      const invItem = this.state.inventoryItems.find(i => i.id === itemId);
      if (invItem) {
        invItem.currentStock = Math.round(newStock * 100) / 100;
        invItem.updatedAt = now.toISOString();
      }
    }
    this.state.inventoryMovements.unshift(...inventoryMovementsToCommit);

    // 5. Create Sale Record
    const sale: Sale = {
      id: saleId,
      orderNumber,
      shiftId: activeShift ? activeShift.id : undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.fullName,
      orderType: payload.orderType,
      customerName: payload.customerName || 'Walk-in Customer',
      customerNotes: payload.customerNotes,
      subtotalCents,
      discountCents,
      discountLabel: payload.discountLabel,
      taxCents,
      totalCents,
      paymentStatus: 'paid',
      payment: {
        id: 'pay-' + Date.now(),
        method: payload.paymentMethod,
        amountCents: totalCents,
        tenderedCents: payload.tenderedCents,
        changeCents,
        referenceNumber: payload.referenceNumber,
        processedAt: now.toISOString()
      },
      items: saleItems,
      createdAt: now.toISOString()
    };

    this.state.sales.unshift(sale);

    this.logAudit(
      currentUser.id,
      currentUser.fullName,
      'SALE_COMPLETED',
      `Order ${orderNumber} completed. Total: ${formatPHP(totalCents)} via ${payload.paymentMethod.toUpperCase()}`
    );

    this.persist(this.state);
    return { sale, inventoryWarnings };
  }

  // REFUND / VOID TRANSACTION
  public refundSale(saleId: string, reason: string, managerPin: string, restockInventory: boolean): RefundRecord | null {
    const manager = this.verifyPin(managerPin, ['admin', 'manager']);
    if (!manager) return null;

    const sale = this.state.sales.find(s => s.id === saleId);
    if (!sale || sale.paymentStatus === 'refunded') return null;

    sale.paymentStatus = 'refunded';
    const now = new Date();

    const refund: RefundRecord = {
      id: 'ref-' + Date.now(),
      saleId: sale.id,
      orderNumber: sale.orderNumber,
      reason,
      authorizedBy: manager.fullName,
      amountCents: sale.totalCents,
      restockInventory,
      refundedAt: now.toISOString()
    };

    this.state.refunds.unshift(refund);

    // If restock is requested, rollback inventory
    if (restockInventory) {
      const movements = this.state.inventoryMovements.filter(m => m.referenceId === sale.id && m.type === 'sale');
      for (const mov of movements) {
        const item = this.state.inventoryItems.find(i => i.id === mov.inventoryItemId);
        if (item) {
          const restoredQty = Math.abs(mov.quantityDelta);
          item.currentStock += restoredQty;
          item.updatedAt = now.toISOString();

          this.state.inventoryMovements.unshift({
            id: 'mov-ref-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            inventoryItemId: item.id,
            itemName: item.name,
            type: 'refund',
            quantityDelta: restoredQty,
            balanceAfter: item.currentStock,
            referenceId: sale.id,
            notes: `Restocked from refunded order ${sale.orderNumber}`,
            createdBy: manager.fullName,
            createdAt: now.toISOString()
          });
        }
      }
    }

    this.logAudit(
      manager.id,
      manager.fullName,
      'SALE_REFUNDED',
      `Order ${sale.orderNumber} refunded for ${formatPHP(sale.totalCents)}. Reason: ${reason}`
    );

    this.persist(this.state);
    return refund;
  }

  // Inventory Stock Adjustment
  public adjustInventoryStock(itemId: string, type: 'waste' | 'spill' | 'count_adjustment' | 'purchase', delta: number, notes: string): void {
    const item = this.state.inventoryItems.find(i => i.id === itemId);
    if (!item) return;

    const currentUser = this.getCurrentUser();
    const newStock = Math.max(0, item.currentStock + delta);
    item.currentStock = Math.round(newStock * 100) / 100;
    item.updatedAt = new Date().toISOString();

    this.state.inventoryMovements.unshift({
      id: 'mov-' + Date.now(),
      inventoryItemId: item.id,
      itemName: item.name,
      type,
      quantityDelta: delta,
      balanceAfter: item.currentStock,
      notes,
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString()
    });

    this.logAudit(
      currentUser.id,
      currentUser.fullName,
      'INVENTORY_ADJUST',
      `Adjusted ${item.name} (${delta > 0 ? '+' : ''}${delta} ${item.unit}). New Stock: ${item.currentStock} ${item.unit}. Reason: ${notes}`
    );

    this.persist(this.state);
  }

  // Menu Management CRUD
  public saveProduct(product: Product): void {
    const idx = this.state.products.findIndex(p => p.id === product.id);
    const currentUser = this.getCurrentUser();
    if (idx !== -1) {
      this.state.products[idx] = product;
      this.logAudit(currentUser.id, currentUser.fullName, 'PRODUCT_UPDATE', `Updated product ${product.name}`);
    } else {
      this.state.products.push(product);
      this.logAudit(currentUser.id, currentUser.fullName, 'PRODUCT_CREATE', `Created product ${product.name}`);
    }
    this.persist(this.state);
    if (productSyncListener) {
      try {
        productSyncListener(product, 'save');
      } catch (err) {
        console.warn('Sync listener error:', err);
      }
    }
  }

  public deleteProduct(productId: string): void {
    const idx = this.state.products.findIndex(p => p.id === productId);
    if (idx !== -1) {
      const name = this.state.products[idx].name;
      this.state.products.splice(idx, 1);
      const currentUser = this.getCurrentUser();
      this.logAudit(currentUser.id, currentUser.fullName, 'PRODUCT_DELETE', `Deleted product ${name}`);
      this.persist(this.state);
      if (productSyncListener) {
        try {
          productSyncListener({ id: productId } as Product, 'delete');
        } catch (err) {
          console.warn('Sync listener error:', err);
        }
      }
    }
  }

  public saveCategory(category: Category): void {
    const idx = this.state.categories.findIndex(c => c.id === category.id);
    if (idx !== -1) {
      this.state.categories[idx] = category;
    } else {
      this.state.categories.push(category);
    }
    this.persist(this.state);
  }

  public saveInventoryItem(item: InventoryItem): void {
    const idx = this.state.inventoryItems.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      this.state.inventoryItems[idx] = item;
    } else {
      this.state.inventoryItems.push(item);
    }
    this.persist(this.state);
  }

  // Purchases & Suppliers
  public addSupplier(supplier: Omit<Supplier, 'id'>): Supplier {
    const newSupplier: Supplier = {
      ...supplier,
      id: 'sup-' + Date.now()
    };
    this.state.suppliers.push(newSupplier);
    this.persist(this.state);
    return newSupplier;
  }

  public recordPurchase(purchase: Omit<Purchase, 'id' | 'purchasedAt'>): Purchase {
    const currentUser = this.getCurrentUser();
    const newPurchase: Purchase = {
      ...purchase,
      id: 'po-' + Date.now(),
      purchasedAt: new Date().toISOString()
    };

    // If marked received, immediately update inventory stock
    if (newPurchase.status === 'received') {
      newPurchase.receivedAt = new Date().toISOString();
      for (const item of newPurchase.items) {
        const invItem = this.state.inventoryItems.find(i => i.id === item.inventoryItemId);
        if (invItem) {
          invItem.currentStock += item.quantity;
          invItem.updatedAt = newPurchase.receivedAt;

          this.state.inventoryMovements.unshift({
            id: 'mov-po-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            inventoryItemId: invItem.id,
            itemName: invItem.name,
            type: 'purchase',
            quantityDelta: item.quantity,
            balanceAfter: invItem.currentStock,
            referenceId: newPurchase.id,
            notes: `Restock from PO #${newPurchase.invoiceNumber || newPurchase.id}`,
            createdBy: currentUser.fullName,
            createdAt: newPurchase.receivedAt
          });
        }
      }
    }

    this.state.purchases.unshift(newPurchase);
    this.logAudit(
      currentUser.id,
      currentUser.fullName,
      'PURCHASE_ORDER',
      `Recorded PO for ${newPurchase.supplierName}: ${formatPHP(newPurchase.totalAmountCents)} (${newPurchase.status})`
    );
    this.persist(this.state);
    return newPurchase;
  }

  // Expenses
  public addExpense(expense: Omit<Expense, 'id' | 'spentAt' | 'userId' | 'userName'>): Expense {
    const currentUser = this.getCurrentUser();
    const newExpense: Expense = {
      ...expense,
      id: 'exp-' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      shiftId: this.state.activeShift?.id,
      spentAt: new Date().toISOString()
    };

    this.state.expenses.unshift(newExpense);
    this.logAudit(
      currentUser.id,
      currentUser.fullName,
      'EXPENSE_LOGGED',
      `Logged expense: ${newExpense.description} (${formatPHP(newExpense.amountCents)}) to ${newExpense.payee}`
    );
    this.persist(this.state);
    return newExpense;
  }

  // Settings
  public updateSettings(settings: Partial<ShopSettings>): void {
    this.state.settings = { ...this.state.settings, ...settings };
    const currentUser = this.getCurrentUser();
    this.logAudit(currentUser.id, currentUser.fullName, 'SETTINGS_UPDATE', 'Updated shop settings and receipt configuration');
    this.persist(this.state);
  }

  // Backup & Restore
  public createBackup(): { jsonString: string; filename: string; timestamp: string; checksum: string } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `c5isr_backup_${timestamp}.json`;
    const payload = {
      backupMeta: {
        app: 'C5ISR Coffee Shop POS',
        version: DB_VERSION,
        createdAt: new Date().toISOString(),
        totalSalesCount: this.state.sales.length,
        totalProductsCount: this.state.products.length
      },
      data: this.state
    };
    const jsonString = JSON.stringify(payload, null, 2);
    
    // Simple checksum
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      hash = (hash << 5) - hash + jsonString.charCodeAt(i);
      hash |= 0;
    }
    const checksum = 'SHA-' + Math.abs(hash).toString(16).toUpperCase();

    this.state.settings.lastBackupAt = new Date().toISOString();
    const currentUser = this.getCurrentUser();
    this.logAudit(currentUser.id, currentUser.fullName, 'BACKUP_CREATED', `Created backup archive: ${filename} (Checksum: ${checksum})`);
    this.persist(this.state);

    return { jsonString, filename, timestamp, checksum };
  }

  public restoreBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !parsed.data || !parsed.data.version || !parsed.data.users) {
        return { success: false, message: 'Invalid backup file structure. Verification failed.' };
      }

      this.state = parsed.data;
      this.persist(this.state);

      const currentUser = this.getCurrentUser();
      this.logAudit(currentUser.id, currentUser.fullName, 'BACKUP_RESTORED', 'Successfully restored database from backup file.');
      return { success: true, message: 'Database successfully restored.' };
    } catch (e) {
      return { success: false, message: 'JSON parsing error: ' + (e as Error).message };
    }
  }

  public resetToFactory(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = this.getInitialState();
  }

  private logAudit(userId: string, userName: string, action: string, details: string): void {
    const audit: AuditLog = {
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      userId,
      userName,
      action,
      details,
      terminal: 'TERMINAL_1',
      createdAt: new Date().toISOString()
    };
    this.state.auditLogs.unshift(audit);
  }
}

export const db = new LocalStorageDB();
