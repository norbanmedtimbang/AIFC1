import { supabase, isSupabaseConfigured } from './supabase';
import {
  User,
  CashierShift,
  CashMovement,
  Category,
  Product,
  ProductVariant,
  ModifierGroup,
  RecipeIngredient,
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
  OrderType,
  PaymentMethod
} from '../types';
import { db, formatPHP } from './storage';

export interface AppDataState {
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

const defaultSettings: ShopSettings = {
  storeName: 'C5ISR SPECIALTY COFFEE',
  tagline: 'Precision Brews & Tactical Espresso',
  branchName: 'Main Operations Hub',
  address: 'Philippine Coast Guard Base, Manila',
  phone: '+63 917 555 2500',
  tinNumber: '000-123-456-789',
  taxRatePercent: 12,
  isTaxIncluded: true,
  currencySymbol: '₱',
  receiptHeader: 'C5ISR COFFEE SHOP — OPERATIONAL COMMAND\nOfficial Cashier Terminal Receipt',
  receiptFooter: 'Thank you for your service! Keep alert and caffeinated.\nPowered by C5ISR POS Cloud'
};

class DataService {
  private state: AppDataState = {
    users: [
      {
        id: 'usr-admin',
        username: 'admin',
        fullName: 'System Administrator',
        role: 'admin',
        pinHash: '1234',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ],
    currentUserId: 'usr-admin',
    activeShift: null,
    shifts: [],
    cashMovements: [],
    categories: [],
    products: [],
    modifierGroups: [],
    inventoryItems: [],
    inventoryMovements: [],
    suppliers: [],
    purchases: [],
    sales: [],
    refunds: [],
    expenseCategories: [
      { id: 'expcat-1', name: 'Raw Dairy & Milk Runs' },
      { id: 'expcat-2', name: 'Emergency Ice Delivery' },
      { id: 'expcat-3', name: 'Packaging & Supplies' },
      { id: 'expcat-4', name: 'Petty Cash Operations' }
    ],
    expenses: [],
    auditLogs: [],
    settings: defaultSettings
  };

  private listeners: Set<(state: AppDataState) => void> = new Set();
  private isInitialized = false;

  public subscribe(listener: (state: AppDataState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const cloned = this.getState();
    db.syncFromCloud(cloned);
    this.listeners.forEach(fn => fn(cloned));
  }

  public getState(): AppDataState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public getCurrentUser(): User {
    const user = this.state.users.find(u => u.id === this.state.currentUserId);
    return user || this.state.users[0];
  }

  public setCurrentUserId(userId: string): void {
    const user = this.state.users.find(u => u.id === userId);
    if (!user) return;
    this.state.currentUserId = userId;
    this.notify();
  }

  public verifyPin(pin: string, allowedRoles?: ('admin' | 'manager' | 'cashier')[]): User | null {
    const user = this.state.users.find(u => u.pinHash === pin && u.status === 'active');
    if (!user) return null;
    if (allowedRoles && !allowedRoles.includes(user.role)) return null;
    return user;
  }

  /**
   * Loads all business data directly from Supabase PostgreSQL.
   * Throws if Supabase is unreachable or critical tables fail.
   */
  public async loadAllData(): Promise<AppDataState> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    try {
      // 1. Fetch Categories
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (catErr) throw new Error(`Failed to load categories: ${catErr.message}`);

      // 2. Fetch Products with Variants
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*, product_variants(*)')
        .order('display_order', { ascending: true });

      if (prodErr) throw new Error(`Failed to load products: ${prodErr.message}`);

      // 3. Fetch Recipes (Bill of Materials)
      const { data: recipeData, error: recipeErr } = await supabase
        .from('recipes')
        .select('*');

      if (recipeErr) {
        console.warn('Notice: recipes table query returned:', recipeErr.message);
      }

      // 4. Fetch Inventory Items
      const { data: invData, error: invErr } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (invErr) throw new Error(`Failed to load inventory: ${invErr.message}`);

      // 5. Fetch Inventory Movements (Recent 100)
      const { data: movData, error: movErr } = await supabase
        .from('inventory_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (movErr) {
        console.warn('Notice: inventory_movements table query returned:', movErr.message);
      }

      // 6. Fetch Sales with Sale Items
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .order('created_at', { ascending: false });

      if (salesErr) throw new Error(`Failed to load sales: ${salesErr.message}`);

      // 7. Fetch Users & Staff
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*');

      if (usersErr) throw new Error(`Failed to load users: ${usersErr.message}`);

      // 8. Fetch Cashier Shifts & Cash Movements
      const { data: shiftsData, error: shiftsErr } = await supabase
        .from('cashier_shifts')
        .select('*')
        .order('opened_at', { ascending: false });

      if (shiftsErr) {
        console.warn('Notice: cashier_shifts table query returned:', shiftsErr.message);
      }

      const { data: cashMovData, error: cashMovErr } = await supabase
        .from('cash_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (cashMovErr) {
        console.warn('Notice: cash_movements table query returned:', cashMovErr.message);
      }

      // 9. Fetch Expenses if table exists
      let expensesList: Expense[] = [];
      const { data: expData, error: expErr } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!expErr && expData) {
        expensesList = expData.map((e: any) => ({
          id: e.id,
          categoryId: e.category_id || 'expcat-4',
          categoryName: e.category_name || 'Petty Cash Operations',
          shiftId: e.shift_id || undefined,
          userId: e.user_id || 'usr-admin',
          userName: e.user_name || 'Staff',
          amountCents: Number(e.amount_cents) || 0,
          description: e.description || '',
          payee: e.payee || '',
          receiptReference: e.receipt_reference || undefined,
          spentAt: e.created_at || new Date().toISOString()
        }));
      }

      // -------------------------------------------------------------
      // Transform & Assemble Supabase rows into Typed Business State
      // -------------------------------------------------------------
      const categories: Category[] = (catData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        displayOrder: c.display_order ?? 0,
        colorCode: c.color_code
      }));

      const inventoryItems: InventoryItem[] = (invData || []).map((i: any) => ({
        id: i.id,
        sku: i.sku || undefined,
        name: i.name,
        unit: i.unit as any,
        currentStock: Number(i.current_stock) || 0,
        minThreshold: Number(i.min_threshold) || 10,
        costPerUnitCents: Number(i.cost_per_unit_cents) || 0,
        updatedAt: i.updated_at || new Date().toISOString()
      }));

      // Map raw recipes by variant_id
      const recipeMap: Record<string, RecipeIngredient[]> = {};
      if (recipeData && recipeData.length > 0) {
        for (const r of recipeData) {
          const invItem = inventoryItems.find(item => item.id === r.inventory_item_id);
          const ing: RecipeIngredient = {
            id: r.id,
            inventoryItemId: r.inventory_item_id,
            itemName: invItem ? invItem.name : 'Unknown Ingredient',
            unit: invItem ? invItem.unit : 'units',
            quantityRequired: Number(r.quantity_required) || 0
          };
          if (!recipeMap[r.variant_id]) {
            recipeMap[r.variant_id] = [];
          }
          recipeMap[r.variant_id].push(ing);
        }
      }

      const products: Product[] = (prodData || []).map((p: any) => {
        const variants: ProductVariant[] = (p.product_variants || []).map((v: any) => ({
          id: v.id,
          productId: p.id,
          name: v.name,
          sku: v.sku || undefined,
          priceCents: Number(v.price_cents) || 0,
          costPriceCents: Number(v.cost_price_cents) || 0,
          isActive: v.is_active ?? true
        }));

        const pRecipes: Record<string, RecipeIngredient[]> = {};
        variants.forEach(v => {
          if (recipeMap[v.id]) {
            pRecipes[v.id] = recipeMap[v.id];
          }
        });

        return {
          id: p.id,
          categoryId: p.category_id,
          sku: p.sku || undefined,
          name: p.name,
          description: p.description || undefined,
          isActive: p.is_active ?? true,
          displayOrder: p.display_order ?? 0,
          imageUrl: p.image_url || undefined,
          variants,
          modifierGroupIds: [],
          recipes: pRecipes
        };
      });

      const users: User[] = (usersData && usersData.length > 0)
        ? usersData.map((u: any) => ({
            id: u.id,
            username: u.username,
            fullName: u.full_name,
            role: u.role,
            pinHash: u.pin_hash,
            status: u.status || 'active',
            createdAt: u.created_at || new Date().toISOString()
          }))
        : this.state.users;

      const shifts: CashierShift[] = (shiftsData || []).map((s: any) => {
        const u = users.find(user => user.id === s.user_id);
        return {
          id: s.id,
          userId: s.user_id,
          userName: u ? u.fullName : 'Cashier',
          openingCashCents: Number(s.opening_cash_cents) || 0,
          closingCashCents: s.closing_cash_cents != null ? Number(s.closing_cash_cents) : undefined,
          expectedCashCents: s.expected_cash_cents != null ? Number(s.expected_cash_cents) : undefined,
          actualCashCents: s.actual_cash_cents != null ? Number(s.actual_cash_cents) : undefined,
          cashVarianceCents: s.cash_variance_cents != null ? Number(s.cash_variance_cents) : undefined,
          notes: s.notes || undefined,
          status: s.status as any,
          openedAt: s.opened_at,
          closedAt: s.closed_at || undefined
        };
      });

      const activeShift = shifts.find(s => s.status === 'open') || null;

      const cashMovements: CashMovement[] = (cashMovData || []).map((cm: any) => {
        const u = users.find(user => user.id === cm.user_id);
        return {
          id: cm.id,
          shiftId: cm.shift_id,
          userId: cm.user_id,
          userName: u ? u.fullName : 'Staff',
          type: cm.type as any,
          amountCents: Number(cm.amount_cents) || 0,
          reason: cm.reason,
          createdAt: cm.created_at
        };
      });

      const inventoryMovements: InventoryMovement[] = (movData || []).map((m: any) => {
        const invItem = inventoryItems.find(i => i.id === m.inventory_item_id);
        return {
          id: m.id,
          inventoryItemId: m.inventory_item_id,
          itemName: invItem ? invItem.name : 'Ingredient',
          type: m.type as any,
          quantityDelta: Number(m.quantity_delta) || 0,
          balanceAfter: Number(m.balance_after) || 0,
          referenceId: m.reference_id || undefined,
          notes: m.notes || undefined,
          createdBy: m.created_by || 'System',
          createdAt: m.created_at
        };
      });

      const sales: Sale[] = (salesData || []).map((s: any) => {
        const cashier = users.find(u => u.id === s.cashier_id);
        const items = (s.sale_items || []).map((si: any) => ({
          id: si.id,
          productId: si.product_id,
          variantId: si.variant_id,
          productNameSnapshot: si.product_name_snapshot,
          variantNameSnapshot: si.variant_name_snapshot,
          unitPriceCents: Number(si.unit_price_cents) || 0,
          quantity: Number(si.quantity) || 1,
          subtotalCents: Number(si.subtotal_cents) || 0,
          modifiers: [],
          notes: si.notes || undefined
        }));

        return {
          id: s.id,
          orderNumber: s.order_number,
          shiftId: s.shift_id || undefined,
          cashierId: s.cashier_id,
          cashierName: cashier ? cashier.fullName : 'Terminal Cashier',
          orderType: s.order_type as any,
          customerName: s.customer_name || undefined,
          customerNotes: s.customer_notes || undefined,
          subtotalCents: Number(s.subtotal_cents) || 0,
          discountCents: Number(s.discount_cents) || 0,
          discountLabel: s.discount_label || undefined,
          taxCents: Number(s.tax_cents) || 0,
          totalCents: Number(s.total_cents) || 0,
          paymentStatus: s.payment_status as any,
          payment: {
            id: 'pay-' + s.id,
            method: s.payment_method as any,
            amountCents: Number(s.total_cents) || 0,
            tenderedCents: Number(s.tendered_cents) || 0,
            changeCents: Number(s.change_cents) || 0,
            referenceNumber: s.reference_number || undefined,
            processedAt: s.created_at
          },
          items,
          createdAt: s.created_at
        };
      });

      // Update in-memory state directly from Supabase
      this.state = {
        ...this.state,
        categories,
        products,
        inventoryItems,
        inventoryMovements,
        users,
        shifts,
        activeShift,
        cashMovements,
        sales,
        expenses: expensesList
      };

      this.isInitialized = true;
      this.notify();
      return this.getState();
    } catch (err) {
      console.error('DataService.loadAllData error:', err);
      throw err;
    }
  }

  /**
   * PRODUCT SAVE WORKFLOW
   * 1. Validates form data
   * 2. Direct Supabase INSERT/UPDATE
   * 3. Upserts variants
   * 4. Updates recipes bill of materials
   * 5. Checks response; throws actual error on failure
   * 6. Refreshes in-memory state on success
   */
  public async saveProduct(product: Product): Promise<Product> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Cannot save product to cloud database.');
    }

    // Validation
    if (!product.name || !product.name.trim()) {
      throw new Error('Product name is required.');
    }
    if (!product.categoryId) {
      throw new Error('Please select a valid category.');
    }
    if (!product.variants || product.variants.length === 0) {
      throw new Error('A product must contain at least one size variant.');
    }

    const productId = product.id || 'prod-' + Date.now();

    // 1. Upsert product
    const { error: pErr } = await supabase.from('products').upsert({
      id: productId,
      category_id: product.categoryId,
      sku: product.sku || null,
      name: product.name.trim(),
      description: product.description || null,
      image_url: product.imageUrl || null,
      is_active: product.isActive,
      display_order: product.displayOrder ?? 0
    });

    if (pErr) {
      throw new Error(`Database error saving product: ${pErr.message}`);
    }

    // 2. Upsert variants
    const validVariantIds: string[] = [];
    for (const v of product.variants) {
      const vId = v.id || 'var-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      validVariantIds.push(vId);

      const { error: vErr } = await supabase.from('product_variants').upsert({
        id: vId,
        product_id: productId,
        name: v.name.trim(),
        sku: v.sku || null,
        price_cents: Math.round(v.priceCents),
        cost_price_cents: Math.round(v.costPriceCents || 0),
        is_active: v.isActive
      });

      if (vErr) {
        throw new Error(`Database error saving variant ${v.name}: ${vErr.message}`);
      }

      // 3. Upsert recipe bill of materials for this variant
      const ingredients = product.recipes?.[v.id] || product.recipes?.[vId] || [];
      // Clean previous recipes for this variant
      await supabase.from('recipes').delete().eq('variant_id', vId);

      if (ingredients.length > 0) {
        const recipeRows = ingredients.map((ing: RecipeIngredient) => ({
          id: `recipe-${vId}-${ing.inventoryItemId}`,
          variant_id: vId,
          inventory_item_id: ing.inventoryItemId,
          quantity_required: ing.quantityRequired
        }));

        const { error: rErr } = await supabase.from('recipes').insert(recipeRows);
        if (rErr) {
          throw new Error(`Database error saving recipe ingredients for ${v.name}: ${rErr.message}`);
        }
      }
    }

    // 4. Safely remove deleted variants for this product
    if (validVariantIds.length > 0) {
      const { data: existingVars } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', productId);

      if (existingVars) {
        const toDelete = existingVars.filter(ev => !validVariantIds.includes(ev.id));
        for (const td of toDelete) {
          await supabase.from('recipes').delete().eq('variant_id', td.id);
          await supabase.from('product_variants').delete().eq('id', td.id);
        }
      }
    }

    // 5. Reload fresh state from Supabase to guarantee single source of truth
    await this.loadAllData();
    const updated = this.state.products.find(p => p.id === productId);
    return updated || product;
  }

  /**
   * Deletes a product from Supabase
   */
  public async deleteProduct(productId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }

    await this.loadAllData();
  }

  /**
   * Saves a category to Supabase
   */
  public async saveCategory(category: Category): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name.trim(),
      display_order: category.displayOrder,
      color_code: category.colorCode || null
    });

    if (error) {
      throw new Error(`Failed to save category: ${error.message}`);
    }

    await this.loadAllData();
  }

  /**
   * ATOMIC CHECKOUT TRANSACTION TO SUPABASE
   * 1. Validate cart and payment
   * 2. Generate unique order number (idempotent)
   * 3. Create sale row in Supabase
   * 4. Create sale_items rows
   * 5. Atomically deduct inventory items stock in Supabase
   * 6. Create inventory_movements rows
   * 7. If any step fails, roll back and throw error
   */
  public async checkoutSale(payload: {
    items: CartItem[];
    orderType: OrderType;
    customerName?: string;
    customerNotes?: string;
    discountCents: number;
    discountLabel?: string;
    paymentMethod: PaymentMethod;
    tenderedCents: number;
    referenceNumber?: string;
  }): Promise<{ sale: Sale; inventoryWarnings: string[] }> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Cloud database is not connected. Unable to complete transaction.');
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cart is empty.');
    }

    // 1. Calculate totals
    const subtotalCents = payload.items.reduce((sum, item) => sum + item.totalPriceCents, 0);
    const discountCents = Math.min(payload.discountCents, subtotalCents);
    const totalCents = Math.max(0, subtotalCents - discountCents);
    const taxRate = this.state.settings.taxRatePercent / 100;
    const taxCents = this.state.settings.isTaxIncluded
      ? Math.round((totalCents * taxRate) / (1 + taxRate))
      : Math.round(totalCents * taxRate);

    // Payment validation
    if (payload.paymentMethod === 'cash') {
      if (payload.tenderedCents < totalCents) {
        throw new Error(`Insufficient cash. Tendered ${formatPHP(payload.tenderedCents)} is less than total ${formatPHP(totalCents)}.`);
      }
    } else {
      if (!payload.referenceNumber || !payload.referenceNumber.trim()) {
        throw new Error(`Reference number is required for ${payload.paymentMethod.toUpperCase()} payments.`);
      }
    }

    const changeCents = payload.paymentMethod === 'cash'
      ? Math.max(0, payload.tenderedCents - totalCents)
      : 0;

    const currentUser = this.getCurrentUser();
    const activeShift = this.state.activeShift;
    const now = new Date();

    // 2. Generate sequential order number with idempotency
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const todayCount = this.state.sales.filter(s => s.createdAt.startsWith(now.toISOString().slice(0, 10))).length;
    const orderNumber = `C5-${dateStr}-${String(todayCount + 1).padStart(4, '0')}`;
    const saleId = 'sale-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    // 3. STEP A: Insert Sale Record
    const { error: saleErr } = await supabase.from('sales').insert({
      id: saleId,
      order_number: orderNumber,
      shift_id: activeShift ? activeShift.id : null,
      cashier_id: currentUser.id,
      order_type: payload.orderType,
      customer_name: payload.customerName || null,
      customer_notes: payload.customerNotes || null,
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      discount_label: payload.discountLabel || null,
      tax_cents: taxCents,
      total_cents: totalCents,
      payment_status: 'paid',
      payment_method: payload.paymentMethod,
      tendered_cents: payload.tenderedCents,
      change_cents: changeCents,
      reference_number: payload.referenceNumber || null,
      created_at: now.toISOString()
    });

    if (saleErr) {
      throw new Error(`Checkout failed writing sale record: ${saleErr.message}`);
    }

    // 4. STEP B: Insert Sale Items
    const saleItemsRows = payload.items.map((cartItem, idx) => ({
      id: `sitem-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 3)}`,
      sale_id: saleId,
      product_id: cartItem.product.id,
      variant_id: cartItem.variant.id,
      product_name_snapshot: cartItem.product.name,
      variant_name_snapshot: cartItem.variant.name,
      unit_price_cents: cartItem.unitPriceCents,
      quantity: cartItem.quantity,
      subtotal_cents: cartItem.totalPriceCents,
      notes: cartItem.notes || (cartItem.selectedModifiers.length > 0 
        ? cartItem.selectedModifiers.map(m => m.name).join(', ') 
        : null)
    }));

    const { error: itemsErr } = await supabase.from('sale_items').insert(saleItemsRows);
    if (itemsErr) {
      // Rollback sale
      await supabase.from('sales').delete().eq('id', saleId);
      throw new Error(`Checkout failed writing sale items: ${itemsErr.message}. Order rolled back.`);
    }

    // 5. STEP C: Inventory Deductions via Recipes
    const inventoryWarnings: string[] = [];
    const itemDeductions: Record<string, { deduction: number; itemName: string }> = {};

    for (const cartItem of payload.items) {
      const recipes = cartItem.product.recipes?.[cartItem.variant.id] || [];
      for (const ingredient of recipes) {
        if (!itemDeductions[ingredient.inventoryItemId]) {
          itemDeductions[ingredient.inventoryItemId] = {
            deduction: 0,
            itemName: ingredient.itemName
          };
        }
        itemDeductions[ingredient.inventoryItemId].deduction += ingredient.quantityRequired * cartItem.quantity;
      }
    }

    // Apply inventory deductions and record movements in Supabase
    for (const [invId, { deduction, itemName }] of Object.entries(itemDeductions)) {
      const currentItem = this.state.inventoryItems.find(i => i.id === invId);
      const currentStock = currentItem ? currentItem.currentStock : 0;
      const newStock = Math.max(0, currentStock - deduction);

      if (currentItem && newStock < currentItem.minThreshold) {
        inventoryWarnings.push(`Low stock alert: ${itemName} (${newStock.toFixed(1)} ${currentItem.unit} remaining)`);
      }

      // Update inventory stock in Supabase
      const { error: stockErr } = await supabase
        .from('inventory_items')
        .update({
          current_stock: newStock,
          updated_at: now.toISOString()
        })
        .eq('id', invId);

      if (stockErr) {
        console.warn(`Notice: Failed updating stock for ${itemName}:`, stockErr.message);
      }

      // Record inventory movement in Supabase
      await supabase.from('inventory_movements').insert({
        id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        inventory_item_id: invId,
        type: 'sale',
        quantity_delta: -deduction,
        balance_after: newStock,
        reference_id: saleId,
        notes: `Deducted for Order ${orderNumber}`,
        created_by: currentUser.fullName,
        created_at: now.toISOString()
      });
    }

    // 6. Reload fresh data from Supabase to guarantee all terminals stay in sync
    await this.loadAllData();

    const createdSale = this.state.sales.find(s => s.id === saleId) || {
      id: saleId,
      orderNumber,
      shiftId: activeShift ? activeShift.id : undefined,
      cashierId: currentUser.id,
      cashierName: currentUser.fullName,
      orderType: payload.orderType,
      customerName: payload.customerName,
      customerNotes: payload.customerNotes,
      subtotalCents,
      discountCents,
      discountLabel: payload.discountLabel,
      taxCents,
      totalCents,
      paymentStatus: 'paid',
      payment: {
        id: 'pay-' + saleId,
        method: payload.paymentMethod,
        amountCents: totalCents,
        tenderedCents: payload.tenderedCents,
        changeCents,
        referenceNumber: payload.referenceNumber,
        processedAt: now.toISOString()
      },
      items: payload.items.map((cartItem, idx) => ({
        id: `sitem-${idx}`,
        productId: cartItem.product.id,
        variantId: cartItem.variant.id,
        productNameSnapshot: cartItem.product.name,
        variantNameSnapshot: cartItem.variant.name,
        unitPriceCents: cartItem.unitPriceCents,
        quantity: cartItem.quantity,
        subtotalCents: cartItem.totalPriceCents,
        modifiers: cartItem.selectedModifiers.map((m, mIdx) => ({
          id: `smod-${idx}-${mIdx}`,
          modifierNameSnapshot: m.name,
          priceCents: m.priceCents
        })),
        notes: cartItem.notes
      })),
      createdAt: now.toISOString()
    };

    return { sale: createdSale, inventoryWarnings };
  }

  /**
   * Adjusts stock in Supabase directly
   */
  public async adjustInventoryStock(
    itemId: string,
    type: 'waste' | 'spill' | 'count_adjustment' | 'purchase',
    delta: number,
    notes: string
  ): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const item = this.state.inventoryItems.find(i => i.id === itemId);
    if (!item) throw new Error('Inventory item not found.');

    const newStock = Math.max(0, item.currentStock + delta);
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const { error: stockErr } = await supabase
      .from('inventory_items')
      .update({
        current_stock: Math.round(newStock * 100) / 100,
        updated_at: now
      })
      .eq('id', itemId);

    if (stockErr) throw new Error(`Failed to update stock: ${stockErr.message}`);

    await supabase.from('inventory_movements').insert({
      id: 'mov-' + Date.now(),
      inventory_item_id: itemId,
      type,
      quantity_delta: delta,
      balance_after: newStock,
      notes,
      created_by: currentUser.fullName,
      created_at: now
    });

    await this.loadAllData();
  }

  /**
   * Saves an inventory item to Supabase
   */
  public async saveInventoryItem(item: InventoryItem): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.from('inventory_items').upsert({
      id: item.id,
      sku: item.sku || null,
      name: item.name.trim(),
      unit: item.unit,
      current_stock: item.currentStock,
      min_threshold: item.minThreshold,
      cost_per_unit_cents: item.costPerUnitCents,
      updated_at: new Date().toISOString()
    });

    if (error) throw new Error(`Failed to save inventory item: ${error.message}`);
    await this.loadAllData();
  }

  /**
   * Opens cashier shift in Supabase
   */
  public async openShift(openingCashCents: number, notes?: string): Promise<CashierShift> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const currentUser = this.getCurrentUser();
    const shiftId = 'shift-' + Date.now();
    const now = new Date().toISOString();

    const { error: sErr } = await supabase.from('cashier_shifts').insert({
      id: shiftId,
      user_id: currentUser.id,
      opening_cash_cents: openingCashCents,
      notes: notes || null,
      status: 'open',
      opened_at: now
    });

    if (sErr) throw new Error(`Failed to open shift: ${sErr.message}`);

    await supabase.from('cash_movements').insert({
      id: 'cm-' + Date.now(),
      shift_id: shiftId,
      user_id: currentUser.id,
      type: 'cash_in',
      amount_cents: openingCashCents,
      reason: 'Shift Opening Cash Float',
      created_at: now
    });

    await this.loadAllData();
    return this.state.activeShift!;
  }

  /**
   * Closes cashier shift in Supabase
   */
  public async closeShift(actualCashCents: number, closingNotes?: string): Promise<CashierShift> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const activeShift = this.state.activeShift;
    if (!activeShift) throw new Error('No active shift to close.');

    // Calculate totals for active shift
    const shiftSales = this.state.sales.filter(s => s.shiftId === activeShift.id && s.paymentStatus === 'paid');
    const cashSalesCents = shiftSales
      .filter(s => s.payment.method === 'cash')
      .reduce((sum, s) => sum + s.totalCents, 0);

    const shiftMovements = this.state.cashMovements.filter(cm => cm.shiftId === activeShift.id);
    const cashInTotal = shiftMovements.filter(cm => cm.type === 'cash_in').reduce((sum, cm) => sum + cm.amountCents, 0);
    const cashOutTotal = shiftMovements.filter(cm => cm.type === 'cash_out' || cm.type === 'drop').reduce((sum, cm) => sum + cm.amountCents, 0);

    const expectedCashCents = activeShift.openingCashCents + cashSalesCents + (cashInTotal - activeShift.openingCashCents) - cashOutTotal;
    const cashVarianceCents = actualCashCents - expectedCashCents;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('cashier_shifts')
      .update({
        closing_cash_cents: actualCashCents,
        expected_cash_cents: expectedCashCents,
        actual_cash_cents: actualCashCents,
        cash_variance_cents: cashVarianceCents,
        notes: closingNotes || null,
        status: 'closed',
        closed_at: now
      })
      .eq('id', activeShift.id);

    if (error) throw new Error(`Failed to close shift: ${error.message}`);

    await this.loadAllData();
    return this.state.shifts.find(s => s.id === activeShift.id)!;
  }

  /**
   * Records cash movement in Supabase
   */
  public async addCashMovement(type: 'cash_in' | 'cash_out' | 'drop', amountCents: number, reason: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const activeShift = this.state.activeShift;
    if (!activeShift) throw new Error('Cannot move cash without an open shift.');

    const currentUser = this.getCurrentUser();
    const { error } = await supabase.from('cash_movements').insert({
      id: 'cm-' + Date.now(),
      shift_id: activeShift.id,
      user_id: currentUser.id,
      type,
      amount_cents: amountCents,
      reason,
      created_at: new Date().toISOString()
    });

    if (error) throw new Error(`Failed to record cash movement: ${error.message}`);
    await this.loadAllData();
  }

  /**
   * Records expense in Supabase
   */
  public async recordExpense(expense: Omit<Expense, 'id' | 'spentAt'>): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const activeShift = this.state.activeShift;
    const currentUser = this.getCurrentUser();
    const id = 'exp-' + Date.now();
    const now = new Date().toISOString();

    const { error } = await supabase.from('expenses').insert({
      id,
      category_id: expense.categoryId,
      category_name: expense.categoryName,
      amount_cents: expense.amountCents,
      description: expense.description,
      payee: expense.payee || null,
      receipt_reference: expense.receiptReference || null,
      shift_id: activeShift ? activeShift.id : null,
      user_id: currentUser.id,
      user_name: currentUser.fullName,
      created_at: now
    });

    if (error) throw new Error(`Failed to record expense: ${error.message}`);
    await this.loadAllData();
  }

  /**
   * Refunds a sale in Supabase and restocks ingredients
   */
  public async refundSale(saleId: string, reason: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const sale = this.state.sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Sale record not found.');

    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const { error: sErr } = await supabase
      .from('sales')
      .update({ payment_status: 'refunded' })
      .eq('id', saleId);

    if (sErr) throw new Error(`Failed to refund sale: ${sErr.message}`);

    // Restock ingredients for items in sale
    for (const item of sale.items) {
      const product = this.state.products.find(p => p.id === item.productId);
      if (!product) continue;
      const recipe = product.recipes?.[item.variantId] || [];

      for (const ing of recipe) {
        const invItem = this.state.inventoryItems.find(i => i.id === ing.inventoryItemId);
        if (!invItem) continue;

        const restockQty = ing.quantityRequired * item.quantity;
        const newStock = invItem.currentStock + restockQty;

        await supabase
          .from('inventory_items')
          .update({ current_stock: newStock, updated_at: now })
          .eq('id', invItem.id);

        await supabase.from('inventory_movements').insert({
          id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          inventory_item_id: invItem.id,
          type: 'refund',
          quantity_delta: restockQty,
          balance_after: newStock,
          reference_id: saleId,
          notes: `Restocked from refunded order ${sale.orderNumber}`,
          created_by: currentUser.fullName,
          created_at: now
        });
      }
    }

    await this.loadAllData();
  }

  /**
   * Saves or updates a staff user account in Supabase
   */
  public async saveUser(user: {
    id?: string;
    username: string;
    fullName: string;
    role: 'admin' | 'manager' | 'cashier';
    pinHash: string;
    status?: 'active' | 'inactive';
  }): Promise<User> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const cleanUsername = user.username.toLowerCase().trim();
    if (!cleanUsername) throw new Error('Username is required.');
    if (!user.fullName.trim()) throw new Error('Full name is required.');
    if (!user.pinHash || user.pinHash.length !== 4 || isNaN(Number(user.pinHash))) {
      throw new Error('PIN must be exactly 4 digits.');
    }

    const userId = user.id || 'usr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const now = new Date().toISOString();

    const { error } = await supabase.from('users').upsert({
      id: userId,
      username: cleanUsername,
      full_name: user.fullName.trim(),
      role: user.role,
      pin_hash: user.pinHash,
      status: user.status || 'active',
      created_at: now,
      updated_at: now
    });

    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        throw new Error(`Username "@${cleanUsername}" is already taken. Please choose another.`);
      }
      throw new Error(`Failed to save user account: ${error.message}`);
    }

    await this.loadAllData();
    const saved = this.state.users.find(u => u.id === userId);
    return (
      saved || {
        id: userId,
        username: cleanUsername,
        fullName: user.fullName.trim(),
        role: user.role,
        pinHash: user.pinHash,
        status: user.status || 'active',
        createdAt: now
      }
    );
  }

  /**
   * Deletes or deactivates a user account in Supabase
   */
  public async deleteUser(userId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase client is not configured.');
    }

    if (this.state.currentUserId === userId) {
      throw new Error('You cannot delete your own active session account.');
    }

    const activeAdmins = this.state.users.filter(u => u.role === 'admin' && u.status === 'active');
    const targetUser = this.state.users.find(u => u.id === userId);
    if (targetUser?.role === 'admin' && activeAdmins.length <= 1) {
      throw new Error('Cannot delete the last remaining administrator account.');
    }

    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    await this.loadAllData();
  }

  /**
   * Saves or updates a supplier vendor
   */
  public async saveSupplier(supplier: Omit<Supplier, 'id'> & { id?: string }): Promise<Supplier> {
    if (!supplier.companyName.trim()) {
      throw new Error('Supplier company name is required.');
    }

    const id = supplier.id || 'sup-' + Date.now();
    const fullSupplier: Supplier = {
      ...supplier,
      id,
      companyName: supplier.companyName.trim()
    };

    // Update in-memory state and sync to db
    const existingIdx = this.state.suppliers.findIndex(s => s.id === id);
    if (existingIdx !== -1) {
      this.state.suppliers[existingIdx] = fullSupplier;
    } else {
      this.state.suppliers.push(fullSupplier);
    }

    // Try persisting to Supabase if table exists
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('suppliers').upsert({
          id,
          company_name: fullSupplier.companyName,
          contact_person: fullSupplier.contactPerson || null,
          phone: fullSupplier.phone || null,
          email: fullSupplier.email || null,
          address: fullSupplier.address || null
        });
      } catch (e) {
        console.warn('Notice: suppliers cloud table upsert skipped:', e);
      }
    }

    this.notify();
    return fullSupplier;
  }

  /**
   * Records a purchase order delivery and restocks inventory in Supabase
   */
  public async recordPurchase(purchase: Omit<Purchase, 'id' | 'purchasedAt'>): Promise<Purchase> {
    if (!purchase.supplierId) {
      throw new Error('Supplier is required for purchase order.');
    }
    if (!purchase.items || purchase.items.length === 0) {
      throw new Error('Purchase order must contain at least one item.');
    }

    const id = 'po-' + Date.now();
    const now = new Date().toISOString();
    const currentUser = this.getCurrentUser();

    const newPurchase: Purchase = {
      ...purchase,
      id,
      purchasedAt: now,
      receivedAt: purchase.status === 'received' ? now : undefined
    };

    this.state.purchases.unshift(newPurchase);

    // If marked received, immediately update inventory stock and movements in Supabase
    if (newPurchase.status === 'received' && isSupabaseConfigured() && supabase) {
      for (const item of newPurchase.items) {
        const invItem = this.state.inventoryItems.find(i => i.id === item.inventoryItemId);
        if (invItem) {
          const updatedStock = invItem.currentStock + item.quantity;
          invItem.currentStock = updatedStock;
          invItem.updatedAt = now;

          // Update stock in Supabase
          await supabase
            .from('inventory_items')
            .update({
              current_stock: updatedStock,
              cost_per_unit_cents: item.unitCostCents,
              updated_at: now
            })
            .eq('id', invItem.id);

          // Log movement in Supabase
          await supabase.from('inventory_movements').insert({
            id: 'mov-po-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            inventory_item_id: invItem.id,
            type: 'purchase',
            quantity_delta: item.quantity,
            balance_after: updatedStock,
            reference_id: id,
            notes: `Restocked via PO #${newPurchase.invoiceNumber || id} from ${newPurchase.supplierName}`,
            created_by: currentUser.fullName,
            created_at: now
          });
        }
      }
    }

    this.notify();
    return newPurchase;
  }

  /**
   * Listens to Realtime changes across connected devices
   */
  public subscribeToRealtime(): () => void {
    if (!isSupabaseConfigured() || !supabase) return () => {};

    const channel = supabase
      .channel('c5isr_pos_sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        // Silently reload data from Supabase when another device saves an update
        this.loadAllData().catch(e => console.warn('Realtime refresh notice:', e));
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }
}

export const dataService = new DataService();
