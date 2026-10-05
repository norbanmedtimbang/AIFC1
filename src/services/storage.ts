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

const STORAGE_KEY = 'c5isr_pos_offline_db_v3_clean';
const DB_VERSION = '3.0.0';

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
  { id: 'cat-1', name: 'Espresso & Coffee', displayOrder: 1, colorCode: '#3B2925' },
  { id: 'cat-2', name: 'Specialty Lattes', displayOrder: 2, colorCode: '#523B36' },
  { id: 'cat-3', name: 'Cold Brew & Signatures', displayOrder: 3, colorCode: '#A8B5A0' },
  { id: 'cat-4', name: 'Non-Coffee & Teas', displayOrder: 4, colorCode: '#8E9E85' },
  { id: 'cat-5', name: 'Pastries & Food', displayOrder: 5, colorCode: '#D4C7B5' },
  { id: 'cat-6', name: 'Retail Beans & Merch', displayOrder: 6, colorCode: '#292929' }
];

const initialInventory: InventoryItem[] = [];

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

const initialProducts: Product[] = [];
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

export class LocalStorageDB {
  private state: DatabaseState;

  constructor() {
    // Purge any past demo databases to ensure a completely clean start
    try {
      localStorage.removeItem('c5isr_pos_offline_db_v1');
      localStorage.removeItem('c5isr_pos_offline_db_v2');
      localStorage.removeItem('c5isr_pos_offline_db_v2_clean');
    } catch {}
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === DB_VERSION) {
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
  }

  public deleteProduct(productId: string): void {
    const idx = this.state.products.findIndex(p => p.id === productId);
    if (idx !== -1) {
      const name = this.state.products[idx].name;
      this.state.products.splice(idx, 1);
      const currentUser = this.getCurrentUser();
      this.logAudit(currentUser.id, currentUser.fullName, 'PRODUCT_DELETE', `Deleted product ${name}`);
      this.persist(this.state);
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

  public generateSQLiteDump(): string {
    const s = this.state;
    const lines: string[] = [
      '-- ==============================================================================',
      '-- C5ISR COFFEE SHOP POS — PRODUCTION SQLITE 3 OFFLINE DATABASE DUMP',
      `-- Exported At: ${new Date().toISOString()}`,
      `-- Database Version: ${DB_VERSION}`,
      '-- ==============================================================================',
      'PRAGMA foreign_keys = OFF;',
      'BEGIN TRANSACTION;',
      '',
      '-- 1. USERS',
      'CREATE TABLE IF NOT EXISTS users (',
      '    id TEXT PRIMARY KEY,',
      '    username TEXT UNIQUE NOT NULL,',
      '    pin_hash TEXT NOT NULL,',
      '    full_name TEXT NOT NULL,',
      '    role TEXT CHECK(role IN (\'admin\', \'manager\', \'cashier\')) NOT NULL,',
      '    status TEXT CHECK(status IN (\'active\', \'inactive\')) DEFAULT \'active\',',
      '    created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
      ');',
      ...s.users.map(u => 
        `INSERT OR REPLACE INTO users (id, username, pin_hash, full_name, role, status, created_at) VALUES ('${u.id}', '${u.username.replace(/'/g, "''")}', '${u.pinHash}', '${u.fullName.replace(/'/g, "''")}', '${u.role}', '${u.status}', '${u.createdAt}');`
      ),
      '',
      '-- 2. CATEGORIES',
      'CREATE TABLE IF NOT EXISTS categories (',
      '    id TEXT PRIMARY KEY,',
      '    name TEXT NOT NULL,',
      '    display_order INTEGER DEFAULT 0,',
      '    color_code TEXT',
      ');',
      ...s.categories.map(c =>
        `INSERT OR REPLACE INTO categories (id, name, display_order, color_code) VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', ${c.displayOrder}, '${c.colorCode || ''}');`
      ),
      '',
      '-- 3. PRODUCTS & VARIANTS',
      'CREATE TABLE IF NOT EXISTS products (',
      '    id TEXT PRIMARY KEY,',
      '    category_id TEXT NOT NULL,',
      '    sku TEXT,',
      '    name TEXT NOT NULL,',
      '    description TEXT,',
      '    is_active INTEGER DEFAULT 1,',
      '    display_order INTEGER DEFAULT 0',
      ');',
      'CREATE TABLE IF NOT EXISTS product_variants (',
      '    id TEXT PRIMARY KEY,',
      '    product_id TEXT NOT NULL,',
      '    name TEXT NOT NULL,',
      '    price_cents INTEGER NOT NULL,',
      '    cost_price_cents INTEGER DEFAULT 0,',
      '    is_active INTEGER DEFAULT 1',
      ');',
      ...s.products.map(p =>
        `INSERT OR REPLACE INTO products (id, category_id, sku, name, description, is_active, display_order) VALUES ('${p.id}', '${p.categoryId}', '${(p.sku || '').replace(/'/g, "''")}', '${p.name.replace(/'/g, "''")}', '${(p.description || '').replace(/'/g, "''")}', ${p.isActive ? 1 : 0}, ${p.displayOrder});`
      ),
      ...s.products.flatMap(p => p.variants.map(v =>
        `INSERT OR REPLACE INTO product_variants (id, product_id, name, price_cents, cost_price_cents, is_active) VALUES ('${v.id}', '${p.id}', '${v.name.replace(/'/g, "''")}', ${v.priceCents}, ${v.costPriceCents || 0}, ${v.isActive ? 1 : 0});`
      )),
      '',
      '-- 4. INVENTORY ITEMS',
      'CREATE TABLE IF NOT EXISTS inventory_items (',
      '    id TEXT PRIMARY KEY,',
      '    sku TEXT,',
      '    name TEXT NOT NULL,',
      '    current_stock REAL NOT NULL,',
      '    min_threshold REAL NOT NULL,',
      '    unit TEXT NOT NULL,',
      '    cost_per_unit_cents INTEGER NOT NULL',
      ');',
      ...s.inventoryItems.map(i =>
        `INSERT OR REPLACE INTO inventory_items (id, sku, name, current_stock, min_threshold, unit, cost_per_unit_cents) VALUES ('${i.id}', '${(i.sku || '').replace(/'/g, "''")}', '${i.name.replace(/'/g, "''")}', ${i.currentStock}, ${i.minThreshold}, '${i.unit}', ${i.costPerUnitCents});`
      ),
      '',
      '-- 5. CASHIER SHIFTS & MOVEMENTS',
      'CREATE TABLE IF NOT EXISTS cashier_shifts (',
      '    id TEXT PRIMARY KEY,',
      '    user_id TEXT NOT NULL,',
      '    user_name TEXT NOT NULL,',
      '    opening_cash_cents INTEGER NOT NULL,',
      '    closing_cash_cents INTEGER,',
      '    expected_cash_cents INTEGER,',
      '    actual_cash_cents INTEGER,',
      '    cash_variance_cents INTEGER,',
      '    status TEXT NOT NULL,',
      '    opened_at DATETIME NOT NULL,',
      '    closed_at DATETIME',
      ');',
      ...s.shifts.map(sh =>
        `INSERT OR REPLACE INTO cashier_shifts (id, user_id, user_name, opening_cash_cents, closing_cash_cents, expected_cash_cents, actual_cash_cents, cash_variance_cents, status, opened_at, closed_at) VALUES ('${sh.id}', '${sh.userId}', '${sh.userName.replace(/'/g, "''")}', ${sh.openingCashCents}, ${sh.closingCashCents || 'NULL'}, ${sh.expectedCashCents || 'NULL'}, ${sh.actualCashCents || 'NULL'}, ${sh.cashVarianceCents || 'NULL'}, '${sh.status}', '${sh.openedAt}', ${sh.closedAt ? `'${sh.closedAt}'` : 'NULL'});`
      ),
      '',
      '-- 6. SALES TICKETS',
      'CREATE TABLE IF NOT EXISTS sales (',
      '    id TEXT PRIMARY KEY,',
      '    order_number TEXT UNIQUE NOT NULL,',
      '    customer_name TEXT,',
      '    order_type TEXT NOT NULL,',
      '    subtotal_cents INTEGER NOT NULL,',
      '    discount_cents INTEGER NOT NULL,',
      '    total_cents INTEGER NOT NULL,',
      '    payment_method TEXT NOT NULL,',
      '    payment_status TEXT NOT NULL,',
      '    created_at DATETIME NOT NULL',
      ');',
      ...s.sales.map(sl =>
        `INSERT OR REPLACE INTO sales (id, order_number, customer_name, order_type, subtotal_cents, discount_cents, total_cents, payment_method, payment_status, created_at) VALUES ('${sl.id}', '${sl.orderNumber}', '${(sl.customerName || '').replace(/'/g, "''")}', '${sl.orderType}', ${sl.subtotalCents}, ${sl.discountCents}, ${sl.totalCents}, '${sl.payment.method}', '${sl.paymentStatus}', '${sl.createdAt}');`
      ),
      '',
      '-- 7. EXPENSES',
      'CREATE TABLE IF NOT EXISTS expenses (',
      '    id TEXT PRIMARY KEY,',
      '    category_name TEXT NOT NULL,',
      '    payee TEXT NOT NULL,',
      '    amount_cents INTEGER NOT NULL,',
      '    description TEXT,',
      '    spent_at DATETIME NOT NULL',
      ');',
      ...s.expenses.map(e =>
        `INSERT OR REPLACE INTO expenses (id, category_name, payee, amount_cents, description, spent_at) VALUES ('${e.id}', '${e.categoryName.replace(/'/g, "''")}', '${e.payee.replace(/'/g, "''")}', ${e.amountCents}, '${(e.description || '').replace(/'/g, "''")}', '${e.spentAt}');`
      ),
      '',
      '-- 8. AUDIT LOGS',
      'CREATE TABLE IF NOT EXISTS audit_logs (',
      '    id TEXT PRIMARY KEY,',
      '    user_name TEXT NOT NULL,',
      '    action TEXT NOT NULL,',
      '    details TEXT NOT NULL,',
      '    terminal TEXT NOT NULL,',
      '    created_at DATETIME NOT NULL',
      ');',
      ...s.auditLogs.map(a =>
        `INSERT OR REPLACE INTO audit_logs (id, user_name, action, details, terminal, created_at) VALUES ('${a.id}', '${a.userName.replace(/'/g, "''")}', '${a.action}', '${a.details.replace(/'/g, "''")}', '${a.terminal}', '${a.createdAt}');`
      ),
      '',
      'COMMIT;',
      'PRAGMA foreign_keys = ON;'
    ];
    return lines.join('\n');
  }

  public loadSpecialtyCoffeeSampleMenu(): void {
    const sampleProducts: Product[] = [
      {
        id: 'prod-sample-1',
        categoryId: 'cat-2',
        sku: 'DRK-SPAN',
        name: 'Iced Spanish Latte',
        description: 'Double espresso, sweetened condensed milk, and velvety chilled milk on ice.',
        imageUrl: '/src/assets/images/product_spanish_latte_1791168309026.jpg',
        isActive: true,
        displayOrder: 1,
        modifierGroupIds: ['modgrp-1', 'modgrp-2', 'modgrp-3'],
        variants: [
          { id: 'var-p1-1', productId: 'prod-sample-1', name: '12oz Hot', priceCents: 17000, costPriceCents: 4500, isActive: true },
          { id: 'var-p1-2', productId: 'prod-sample-1', name: '16oz Iced', priceCents: 18500, costPriceCents: 5200, isActive: true }
        ]
      },
      {
        id: 'prod-sample-2',
        categoryId: 'cat-3',
        sku: 'DRK-DIRTY-MAT',
        name: 'Dirty Uji Matcha Espresso',
        description: 'Layered Japanese ceremonial green tea, oat milk, and a floating ristretto shot.',
        imageUrl: '/src/assets/images/product_dirty_matcha_1791168321790.jpg',
        isActive: true,
        displayOrder: 2,
        modifierGroupIds: ['modgrp-1', 'modgrp-2'],
        variants: [
          { id: 'var-p2-1', productId: 'prod-sample-2', name: '16oz Iced', priceCents: 21000, costPriceCents: 6800, isActive: true }
        ]
      },
      {
        id: 'prod-sample-3',
        categoryId: 'cat-5',
        sku: 'PAS-CROIS',
        name: 'Artisan Butter Croissant',
        description: 'Freshly baked artisanal 100% French butter croissant with flaky layers.',
        imageUrl: '/src/assets/images/product_artisan_pastry_1791168332615.jpg',
        isActive: true,
        displayOrder: 3,
        modifierGroupIds: [],
        variants: [
          { id: 'var-p3-1', productId: 'prod-sample-3', name: 'Standard Heated', priceCents: 13500, costPriceCents: 6500, isActive: true }
        ]
      }
    ];

    const sampleInventory: InventoryItem[] = [
      {
        id: 'inv-sample-1',
        name: 'Single Origin Espresso Beans (Mt. Apo)',
        sku: 'RAW-BEAN-APO',
        currentStock: 4500,
        minThreshold: 1000,
        unit: 'grams',
        costPerUnitCents: 90,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inv-sample-2',
        name: 'Barista Oat Milk (Oatly Edition)',
        sku: 'RAW-MILK-OAT',
        currentStock: 12000,
        minThreshold: 3000,
        unit: 'ml',
        costPerUnitCents: 18,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inv-sample-3',
        name: 'Sweetened Condensed Milk',
        sku: 'RAW-COND-MILK',
        currentStock: 3500,
        minThreshold: 800,
        unit: 'ml',
        costPerUnitCents: 14,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'inv-sample-4',
        name: 'Ceremonial Matcha Powder',
        sku: 'RAW-MATCHA',
        currentStock: 800,
        minThreshold: 200,
        unit: 'grams',
        costPerUnitCents: 350,
        updatedAt: new Date().toISOString()
      }
    ];

    this.state.products = sampleProducts;
    this.state.inventoryItems = sampleInventory;
    const currentUser = this.getCurrentUser();
    this.logAudit(currentUser.id, currentUser.fullName, 'MENU_PRESETS_LOADED', 'Loaded specialty coffee catalog sample presets.');
    this.persist(this.state);
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
