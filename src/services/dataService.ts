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
        username: 'juan.admin',
        fullName: 'Juan Dela Cruz',
        role: 'admin',
        pinHash: '1234',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-manager',
        username: 'pedro.mgr',
        fullName: 'Pedro Reyes',
        role: 'manager',
        pinHash: '2345',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-cashier',
        username: 'maria.pos',
        fullName: 'Maria Santos',
        role: 'cashier',
        pinHash: '3456',
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

  public loadOfflineData(): AppDataState {
    const local = db.getState();
    this.state = {
      ...this.state,
      users: local.users && local.users.length > 0 ? local.users : this.state.users,
      currentUserId: local.currentUserId || this.state.currentUserId,
      activeShift: local.activeShift,
      shifts: local.shifts || [],
      cashMovements: local.cashMovements || [],
      categories: local.categories || [],
      products: local.products || [],
      modifierGroups: local.modifierGroups && local.modifierGroups.length > 0 ? local.modifierGroups : this.state.modifierGroups,
      inventoryItems: local.inventoryItems || [],
      inventoryMovements: local.inventoryMovements || [],
      suppliers: local.suppliers || [],
      purchases: local.purchases || [],
      sales: local.sales || [],
      refunds: local.refunds || [],
      expenseCategories: local.expenseCategories || this.state.expenseCategories,
      expenses: local.expenses || [],
      auditLogs: local.auditLogs || [],
      settings: local.settings || this.state.settings
    };
    this.isInitialized = true;
    this.notify();
    return this.getState();
  }

  /**
   * Loads all business data from Supabase PostgreSQL.
   * If Supabase is offline or tables are unreachable, falls back gracefully to local database.
   */
  public async loadAllData(): Promise<AppDataState> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('Supabase not configured, using offline local database.');
      return this.loadOfflineData();
    }

    try {
      // 1. Fetch Categories
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (catErr) {
        console.warn('Categories query error, using offline cache:', catErr.message);
        return this.loadOfflineData();
      }

      // 2. Fetch Products with Variants
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*, product_variants(*)')
        .order('display_order', { ascending: true });

      if (prodErr) {
        console.warn('Products query error, using offline cache:', prodErr.message);
        return this.loadOfflineData();
      }

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

      if (invErr) {
        console.warn('Inventory query error, using offline cache:', invErr.message);
        return this.loadOfflineData();
      }

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

      if (salesErr) {
        console.warn('Sales query error, using offline cache:', salesErr.message);
        return this.loadOfflineData();
      }

      // 7. Fetch Users & Staff
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*');

      if (usersErr) {
        console.warn('Users query error, using offline cache:', usersErr.message);
        return this.loadOfflineData();
      }

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
      } else {
        expensesList = db.getState().expenses || [];
      }

      // 10. Fetch Settings from Supabase shop_settings
      let settingsObj: ShopSettings = db.getState().settings || defaultSettings;
      try {
        const { data: setRows } = await supabase.from('shop_settings').select('*');
        if (setRows && setRows.length > 0) {
          const dict: Record<string, string> = {};
          setRows.forEach((r: any) => {
            dict[r.setting_key] = r.setting_value;
          });
          settingsObj = {
            ...settingsObj,
            storeName: dict['shop_name'] || dict['business_name'] || settingsObj.storeName,
            tagline: dict['tagline'] || settingsObj.tagline,
            branchName: dict['branch_name'] || settingsObj.branchName,
            address: dict['address'] || settingsObj.address,
            phone: dict['phone'] || settingsObj.phone,
            tinNumber: dict['tin'] || settingsObj.tinNumber,
            receiptHeader: dict['receipt_header']
              ? dict['receipt_header'].replace(/\\n/g, '\n')
              : settingsObj.receiptHeader,
            receiptFooter: dict['receipt_footer']
              ? dict['receipt_footer'].replace(/\\n/g, '\n')
              : settingsObj.receiptFooter,
            taxRatePercent: dict['tax_rate_percent']
              ? Number(dict['tax_rate_percent'])
              : settingsObj.taxRatePercent,
            currencySymbol: dict['currency_symbol'] || settingsObj.currencySymbol
          };
        }
      } catch (e) {
        console.warn('Notice: shop_settings query skipped:', e);
      }

      // 11. Fetch suppliers & purchases (with offline fallback)
      let suppliersList: Supplier[] = db.getState().suppliers || [];
      try {
        const { data: supData, error: supErr } = await supabase.from('suppliers').select('*');
        if (!supErr && supData && supData.length > 0) {
          suppliersList = supData.map((s: any) => ({
            id: s.id,
            companyName: s.company_name,
            contactPerson: s.contact_person || undefined,
            phone: s.phone || undefined,
            email: s.email || undefined,
            address: s.address || undefined
          }));
        }
      } catch {}

      let purchasesList: Purchase[] = db.getState().purchases || [];
      try {
        const { data: purData, error: purErr } = await supabase
          .from('purchases')
          .select('*, purchase_items(*)')
          .order('purchased_at', { ascending: false });
        if (!purErr && purData && purData.length > 0) {
          purchasesList = purData.map((p: any) => ({
            id: p.id,
            supplierId: p.supplier_id,
            supplierName: p.supplier_name || 'Vendor',
            invoiceNumber: p.invoice_number || undefined,
            status: p.status,
            totalAmountCents: Number(p.total_amount_cents) || 0,
            purchasedAt: p.purchased_at,
            receivedAt: p.received_at || undefined,
            items: (p.purchase_items || []).map((pi: any) => ({
              id: pi.id,
              inventoryItemId: pi.inventory_item_id,
              itemName: pi.item_name || 'Ingredient',
              unit: pi.unit || 'units',
              quantity: Number(pi.quantity) || 0,
              unitCostCents: Number(pi.unit_cost_cents) || 0,
              totalCostCents: Number(pi.total_cost_cents) || 0
            }))
          }));
        }
      } catch {}

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

      // Update in-memory state directly from Supabase with offline fallbacks
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
        expenses: expensesList,
        settings: settingsObj,
        suppliers: suppliersList,
        purchases: purchasesList,
        modifierGroups: db.getState().modifierGroups && db.getState().modifierGroups.length > 0 ? db.getState().modifierGroups : this.state.modifierGroups,
        auditLogs: db.getState().auditLogs && db.getState().auditLogs.length > 0 ? db.getState().auditLogs : this.state.auditLogs
      };

      this.isInitialized = true;
      this.notify();
      return this.getState();
    } catch (err) {
      console.warn('DataService.loadAllData error, smoothly falling back to offline cache:', err);
      return this.loadOfflineData();
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

    if (!isSupabaseConfigured() || !supabase) {
      db.saveProduct(product);
      await this.loadAllData();
      return product;
    }

    try {
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

      db.saveProduct(product);
      await this.loadAllData();
      const updated = this.state.products.find(p => p.id === productId);
      return updated || product;
    } catch (err) {
      console.warn('Supabase saveProduct failed, saving locally:', err);
      db.saveProduct(product);
      await this.loadAllData();
      return product;
    }
  }

  /**
   * Deletes a product from Supabase (or local db if offline)
   */
  public async deleteProduct(productId: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) {
          console.warn('Supabase deleteProduct error:', error.message);
        }
      } catch (e) {
        console.warn('Supabase deleteProduct exception:', e);
      }
    }

    db.deleteProduct(productId);
    await this.loadAllData();
  }

  /**
   * Saves a category to Supabase and local db
   */
  public async saveCategory(category: Category): Promise<void> {
    if (!category.name || !category.name.trim()) {
      throw new Error('Category name is required.');
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('categories').upsert({
          id: category.id,
          name: category.name.trim(),
          display_order: category.displayOrder,
          color_code: category.colorCode || null
        });

        if (error) {
          console.warn('Supabase category save notice:', error.message);
        }
      } catch (e) {
        console.warn('Supabase saveCategory error:', e);
      }
    }

    db.saveCategory(category);
    await this.loadAllData();
  }

  /**
   * Deletes a category if not in use by active products
   */
  public async deleteCategory(categoryId: string): Promise<void> {
    const prodsInCat = this.state.products.filter(p => p.categoryId === categoryId);
    if (prodsInCat.length > 0) {
      throw new Error(`Cannot delete category with ${prodsInCat.length} existing products. Reassign or delete products first.`);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', categoryId);
        if (error) {
          console.warn('Supabase deleteCategory error:', error.message);
        }
      } catch (e) {
        console.warn('Supabase deleteCategory error:', e);
      }
    }

    const currentDb = db.getState();
    currentDb.categories = currentDb.categories.filter(c => c.id !== categoryId);
    this.state.categories = this.state.categories.filter(c => c.id !== categoryId);
    this.notify();
  }

  /**
   * Saves Modifier Group
   */
  public saveModifierGroup(group: ModifierGroup): void {
    const existingIdx = this.state.modifierGroups.findIndex(g => g.id === group.id);
    if (existingIdx !== -1) {
      this.state.modifierGroups[existingIdx] = group;
    } else {
      this.state.modifierGroups.push(group);
    }

    const currentDb = db.getState();
    const mgIdx = currentDb.modifierGroups.findIndex(g => g.id === group.id);
    if (mgIdx !== -1) {
      currentDb.modifierGroups[mgIdx] = group;
    } else {
      currentDb.modifierGroups.push(group);
    }
    db.persistState();
    this.notify();
  }

  /**
   * Deletes Modifier Group
   */
  public deleteModifierGroup(groupId: string): void {
    this.state.modifierGroups = this.state.modifierGroups.filter(g => g.id !== groupId);
    const currentDb = db.getState();
    currentDb.modifierGroups = currentDb.modifierGroups.filter(g => g.id !== groupId);
    db.persistState();
    this.notify();
  }

  /**
   * Saves Settings to Supabase shop_settings and local storage
   */
  public async saveSettings(newSettings: Partial<ShopSettings>): Promise<ShopSettings> {
    this.state.settings = { ...this.state.settings, ...newSettings };
    db.updateSettings(this.state.settings);

    if (isSupabaseConfigured() && supabase) {
      try {
        const updates = [
          { setting_key: 'shop_name', setting_value: this.state.settings.storeName },
          { setting_key: 'business_name', setting_value: this.state.settings.storeName },
          { setting_key: 'tagline', setting_value: this.state.settings.tagline },
          { setting_key: 'branch_name', setting_value: this.state.settings.branchName },
          { setting_key: 'address', setting_value: this.state.settings.address },
          { setting_key: 'phone', setting_value: this.state.settings.phone },
          { setting_key: 'tin', setting_value: this.state.settings.tinNumber },
          { setting_key: 'receipt_header', setting_value: this.state.settings.receiptHeader },
          { setting_key: 'receipt_footer', setting_value: this.state.settings.receiptFooter },
          { setting_key: 'tax_rate_percent', setting_value: String(this.state.settings.taxRatePercent) },
          { setting_key: 'currency_symbol', setting_value: this.state.settings.currencySymbol }
        ];

        for (const u of updates) {
          await supabase.from('shop_settings').upsert({
            setting_key: u.setting_key,
            setting_value: u.setting_value,
            updated_at: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn('Notice: Failed updating cloud shop_settings:', e);
      }
    }

    this.notify();
    return this.state.settings;
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
    if (!payload.items || payload.items.length === 0) {
      throw new Error('Cart is empty.');
    }

    if (!isSupabaseConfigured() || !supabase) {
      console.warn('Supabase not configured, processing checkout in offline local database.');
      const localResult = db.checkoutSale(payload);
      this.loadOfflineData();
      return localResult;
    }

    try {
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

      // Also record in local database cache without double-processing
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
        paymentStatus: 'paid' as const,
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

      db.recordSyncedSale(createdSale);

      // 6. Reload fresh data from Supabase to guarantee all terminals stay in sync
      await this.loadAllData();

      return { sale: createdSale, inventoryWarnings };
    } catch (err) {
      console.warn('Cloud checkout encountered error, falling back to local database:', err);
      const localResult = db.checkoutSale(payload);
      this.loadOfflineData();
      return localResult;
    }
  }

  /**
   * Adjusts stock in Supabase directly with offline fallback
   */
  public async adjustInventoryStock(
    itemId: string,
    type: 'waste' | 'spill' | 'count_adjustment' | 'purchase',
    delta: number,
    notes: string
  ): Promise<void> {
    const item = this.state.inventoryItems.find(i => i.id === itemId);
    if (!item) throw new Error('Inventory item not found.');

    const newStock = Math.max(0, item.currentStock + delta);
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: stockErr } = await supabase
          .from('inventory_items')
          .update({
            current_stock: Math.round(newStock * 100) / 100,
            updated_at: now
          })
          .eq('id', itemId);

        if (!stockErr) {
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
        }
      } catch (e) {
        console.warn('Notice: Supabase stock adjust exception, logging locally:', e);
      }
    }

    db.adjustInventoryStock(itemId, type, delta, notes);
    await this.loadAllData();
  }

  /**
   * Saves an inventory item to Supabase and local database
   */
  public async saveInventoryItem(item: InventoryItem): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
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
        if (error) {
          console.warn('Notice: Supabase inventory item save notice:', error.message);
        }
      } catch (e) {
        console.warn('Notice: Supabase inventory save exception:', e);
      }
    }

    db.saveInventoryItem(item);
    await this.loadAllData();
  }

  /**
   * Opens cashier shift in Supabase and local database
   */
  public async openShift(openingCashCents: number, notes?: string): Promise<CashierShift> {
    const currentUser = this.getCurrentUser();
    const shiftId = 'shift-' + Date.now();
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error: sErr } = await supabase.from('cashier_shifts').insert({
          id: shiftId,
          user_id: currentUser.id,
          opening_cash_cents: openingCashCents,
          notes: notes || null,
          status: 'open',
          opened_at: now
        });

        if (!sErr) {
          await supabase.from('cash_movements').insert({
            id: 'cm-' + Date.now(),
            shift_id: shiftId,
            user_id: currentUser.id,
            type: 'cash_in',
            amount_cents: openingCashCents,
            reason: 'Shift Opening Cash Float',
            created_at: now
          });
        }
      } catch (e) {
        console.warn('Notice: Supabase openShift exception, opening locally:', e);
      }
    }

    const localShift = db.openShift(openingCashCents, notes);
    await this.loadAllData();
    return this.state.activeShift || localShift;
  }

  /**
   * Closes cashier shift in Supabase and local database with comprehensive reconciliation
   */
  public async closeShift(actualCashCents: number, closingNotes?: string): Promise<CashierShift> {
    const activeShift = this.state.activeShift;
    if (!activeShift) throw new Error('No active shift to close.');

    // Calculate totals for active shift
    const shiftSales = this.state.sales.filter(s => s.shiftId === activeShift.id && s.paymentStatus === 'paid');
    const cashSalesCents = shiftSales
      .filter(s => s.payment.method === 'cash')
      .reduce((sum, s) => sum + s.totalCents, 0);

    const shiftMovements = this.state.cashMovements.filter(cm => cm.shiftId === activeShift.id);
    const cashInTotal = shiftMovements
      .filter(cm => cm.type === 'cash_in' && cm.reason !== 'Shift Opening Cash Float')
      .reduce((sum, cm) => sum + cm.amountCents, 0);
    const cashOutTotal = shiftMovements
      .filter(cm => cm.type === 'cash_out' || cm.type === 'drop')
      .reduce((sum, cm) => sum + cm.amountCents, 0);

    // Subtract store petty cash expenses paid from cash drawer
    const shiftExpenses = this.state.expenses.filter(e => e.shiftId === activeShift.id);
    const cashExpensesTotal = shiftExpenses.reduce((sum, e) => sum + e.amountCents, 0);

    const expectedCashCents = activeShift.openingCashCents + cashSalesCents + cashInTotal - cashOutTotal - cashExpensesTotal;
    const cashVarianceCents = actualCashCents - expectedCashCents;
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
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
      } catch (e) {
        console.warn('Notice: Supabase closeShift exception, closing locally:', e);
      }
    }

    const localShift = db.closeShift(actualCashCents, closingNotes);
    await this.loadAllData();
    return this.state.shifts.find(s => s.id === activeShift.id) || localShift!;
  }

  /**
   * Records cash movement in Supabase and local database
   */
  public async addCashMovement(type: 'cash_in' | 'cash_out' | 'drop', amountCents: number, reason: string): Promise<void> {
    const activeShift = this.state.activeShift;
    if (!activeShift) throw new Error('Cannot move cash without an open shift.');

    const currentUser = this.getCurrentUser();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('cash_movements').insert({
          id: 'cm-' + Date.now(),
          shift_id: activeShift.id,
          user_id: currentUser.id,
          type,
          amount_cents: amountCents,
          reason,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Notice: Supabase cash movement exception, recording locally:', e);
      }
    }

    db.recordCashMovement(type, amountCents, reason);
    await this.loadAllData();
  }

  /**
   * Records expense in Supabase (authoritative) and local cache.
   * Failures are thrown — never report success without persistence confirmation.
   */
  public async recordExpense(expense: Omit<Expense, 'id' | 'spentAt'>): Promise<Expense> {
    const { canPerformCapability } = await import('./rbac');
    const currentUser = this.getCurrentUser();
    if (!canPerformCapability(currentUser.role, 'canManageExpenses')) {
      throw new Error('You do not have permission to record expenses.');
    }

    if (!expense.categoryId?.trim()) {
      throw new Error('Expense category is required.');
    }
    if (!expense.description?.trim()) {
      throw new Error('Expense description is required.');
    }
    if (!expense.payee?.trim()) {
      throw new Error('Payee is required.');
    }
    if (!Number.isFinite(expense.amountCents) || expense.amountCents <= 0) {
      throw new Error('Expense amount must be greater than zero (integer centavos).');
    }
    if (!Number.isInteger(expense.amountCents)) {
      throw new Error('Expense amount must be whole centavos (no fractional cents).');
    }

    const activeShift = this.state.activeShift;
    const id = 'exp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();

    const full: Expense = {
      id,
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      shiftId: expense.shiftId || activeShift?.id,
      userId: currentUser.id,
      userName: currentUser.fullName,
      amountCents: expense.amountCents,
      payee: expense.payee.trim(),
      description: expense.description.trim(),
      receiptReference: expense.receiptReference?.trim() || undefined,
      spentAt: now
    };

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('expenses').insert({
        id: full.id,
        category_id: full.categoryId,
        category_name: full.categoryName,
        amount_cents: full.amountCents,
        description: full.description,
        payee: full.payee,
        receipt_reference: full.receiptReference || null,
        shift_id: full.shiftId || null,
        user_id: full.userId,
        user_name: full.userName,
        created_at: full.spentAt
      });

      if (error) {
        console.error('[recordExpense] Supabase insert failed:', error);
        throw new Error(
          error.message?.includes('amount_cents')
            ? 'Invalid expense amount. Please enter a valid amount greater than zero.'
            : error.message?.includes('user_id')
              ? 'Could not identify the logged-in user for recorded_by.'
              : `Failed to save expense: ${error.message}`
        );
      }
    }

    // Local cache (same id as cloud so refresh stays consistent offline)
    this.state.expenses.unshift(full);
    const localState = db.getState();
    localState.expenses.unshift(full);
    db.persistState();
    this.notify();
    return full;
  }

  /**
   * Refunds a sale in Supabase and restocks ingredients
   */
  public async refundSale(saleId: string, reason: string): Promise<void> {
    const sale = this.state.sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Sale record not found.');

    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('sales')
          .update({ payment_status: 'refunded' })
          .eq('id', saleId);

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
      } catch (e) {
        console.warn('Notice: Supabase refund sale exception, updating locally:', e);
      }
    }

    // Local database refund
    const targetSale = db.getState().sales.find(s => s.id === saleId);
    if (targetSale) {
      targetSale.paymentStatus = 'refunded';
    }
    await this.loadAllData();
  }

  /**
   * Saves or updates a staff user account in Supabase and local storage
   */
  public async saveUser(user: {
    id?: string;
    username: string;
    fullName: string;
    role: 'admin' | 'manager' | 'cashier';
    pinHash: string;
    status?: 'active' | 'inactive';
  }): Promise<User> {
    const cleanUsername = user.username.toLowerCase().trim();
    if (!cleanUsername) throw new Error('Username is required.');
    if (!user.fullName.trim()) throw new Error('Full name is required.');
    if (!user.pinHash || user.pinHash.length !== 4 || isNaN(Number(user.pinHash))) {
      throw new Error('PIN must be exactly 4 digits.');
    }

    const userId = user.id || 'usr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const now = new Date().toISOString();

    const userObj: User = {
      id: userId,
      username: cleanUsername,
      fullName: user.fullName.trim(),
      role: user.role,
      pinHash: user.pinHash,
      status: user.status || 'active',
      createdAt: now
    };

    if (isSupabaseConfigured() && supabase) {
      try {
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
          console.warn('Notice: Supabase saveUser error, saving locally:', error.message);
        }
      } catch (e) {
        if ((e as Error).message.includes('already taken')) {
          throw e;
        }
        console.warn('Notice: Supabase user save exception:', e);
      }
    }

    // Persist in local storage database
    const localUsers = db.getState().users;
    const existingIdx = localUsers.findIndex(u => u.id === userId);
    if (existingIdx !== -1) {
      localUsers[existingIdx] = userObj;
    } else {
      localUsers.push(userObj);
    }

    await this.loadAllData();
    const saved = this.state.users.find(u => u.id === userId);
    return saved || userObj;
  }

  /**
   * Deletes or deactivates a user account in Supabase and local storage
   */
  public async deleteUser(userId: string): Promise<void> {
    if (this.state.currentUserId === userId) {
      throw new Error('You cannot delete your own active session account.');
    }

    const activeAdmins = this.state.users.filter(u => u.role === 'admin' && u.status === 'active');
    const targetUser = this.state.users.find(u => u.id === userId);
    if (targetUser?.role === 'admin' && activeAdmins.length <= 1) {
      throw new Error('Cannot delete the last remaining administrator account.');
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) {
          console.warn('Notice: Supabase delete user notice:', error.message);
        }
      } catch (e) {
        console.warn('Notice: Supabase deleteUser exception:', e);
      }
    }

    const currentDb = db.getState();
    currentDb.users = currentDb.users.filter(u => u.id !== userId);
    this.state.users = this.state.users.filter(u => u.id !== userId);
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
    db.saveSupplier(fullSupplier);

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('suppliers').upsert({
        id,
        company_name: fullSupplier.companyName,
        contact_person: fullSupplier.contactPerson || null,
        phone: fullSupplier.phone || null,
        email: fullSupplier.email || null,
        address: fullSupplier.address || null
      });
      if (error) {
        console.error('[saveSupplier] upsert failed:', error);
        throw new Error(`Failed to save supplier: ${error.message}`);
      }
    }

    this.notify();
    return fullSupplier;
  }

  /**
   * Records a purchase order and optionally restocks inventory.
   * Purchase header + items + inventory (if received) are persisted to Supabase.
   * Inventory is increased exactly once — never doubled on local+cloud paths.
   */
  public async recordPurchase(purchase: Omit<Purchase, 'id' | 'purchasedAt'>): Promise<Purchase> {
    const { canPerformCapability } = await import('./rbac');
    const currentUser = this.getCurrentUser();
    if (!canPerformCapability(currentUser.role, 'canManagePurchases')) {
      throw new Error('You do not have permission to record purchases.');
    }

    if (!purchase.supplierId?.trim()) {
      throw new Error('Supplier is required for purchase order.');
    }
    if (!purchase.items || purchase.items.length === 0) {
      throw new Error('Purchase order must contain at least one item.');
    }
    if (!['pending', 'received', 'cancelled'].includes(purchase.status)) {
      throw new Error('Invalid purchase status.');
    }

    // Validate line items — reject zero/negative qty or negative cost
    for (const item of purchase.items) {
      if (!item.inventoryItemId) {
        throw new Error('Each purchase line must reference an inventory item.');
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error(`Invalid quantity for "${item.itemName || 'item'}". Quantity must be greater than zero.`);
      }
      if (!Number.isFinite(item.unitCostCents) || item.unitCostCents < 0) {
        throw new Error(`Invalid unit cost for "${item.itemName || 'item'}". Cost cannot be negative.`);
      }
      const expectedLine = Math.round(item.quantity * item.unitCostCents);
      if (item.totalCostCents !== expectedLine) {
        item.totalCostCents = expectedLine;
      }
    }

    const computedTotal = purchase.items.reduce((sum, i) => sum + i.totalCostCents, 0);
    if (computedTotal < 0) {
      throw new Error('Purchase total cannot be negative.');
    }

    const id = 'po-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const now = new Date().toISOString();
    const isReceived = purchase.status === 'received';

    const newPurchase: Purchase = {
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      invoiceNumber: purchase.invoiceNumber?.trim() || undefined,
      status: purchase.status,
      totalAmountCents: computedTotal,
      items: purchase.items.map(i => ({
        ...i,
        totalCostCents: Math.round(i.quantity * i.unitCostCents)
      })),
      id,
      purchasedAt: now,
      receivedAt: isReceived ? now : undefined
    };

    // ── Supabase persistence (authoritative when configured) ──
    if (isSupabaseConfigured() && supabase) {
      const { error: hdrErr } = await supabase.from('purchases').insert({
        id: newPurchase.id,
        supplier_id: newPurchase.supplierId,
        supplier_name: newPurchase.supplierName,
        invoice_number: newPurchase.invoiceNumber || null,
        status: newPurchase.status,
        total_amount_cents: newPurchase.totalAmountCents,
        purchased_at: newPurchase.purchasedAt,
        received_at: newPurchase.receivedAt || null,
        recorded_by: currentUser.id
      });

      if (hdrErr) {
        console.error('[recordPurchase] header insert failed:', hdrErr);
        throw new Error(
          hdrErr.message?.includes('suppliers') || hdrErr.code === '23503'
            ? 'Supplier not found in database. Save the supplier first, then retry.'
            : `Failed to save purchase: ${hdrErr.message}`
        );
      }

      const itemRows = newPurchase.items.map(item => ({
        id: item.id || 'poi-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
        purchase_id: newPurchase.id,
        inventory_item_id: item.inventoryItemId,
        item_name: item.itemName,
        unit: item.unit,
        quantity: item.quantity,
        unit_cost_cents: item.unitCostCents,
        total_cost_cents: item.totalCostCents
      }));

      const { error: itemsErr } = await supabase.from('purchase_items').insert(itemRows);
      if (itemsErr) {
        console.error('[recordPurchase] items insert failed:', itemsErr);
        // Best-effort: mark header cancelled so it is not a partial ghost PO
        await supabase.from('purchases').update({ status: 'cancelled' }).eq('id', newPurchase.id);
        throw new Error(`Failed to save purchase items: ${itemsErr.message}`);
      }

      if (isReceived) {
        for (const item of newPurchase.items) {
          const invItem = this.state.inventoryItems.find(i => i.id === item.inventoryItemId);
          if (!invItem) {
            throw new Error(`Inventory item not found for "${item.itemName}". Purchase was saved but stock was not updated for this line.`);
          }

          const updatedStock = invItem.currentStock + item.quantity;

          const { error: stockErr } = await supabase
            .from('inventory_items')
            .update({
              current_stock: updatedStock,
              cost_per_unit_cents: item.unitCostCents,
              updated_at: now
            })
            .eq('id', invItem.id);

          if (stockErr) {
            console.error('[recordPurchase] stock update failed:', stockErr);
            throw new Error(`Failed to update stock for "${item.itemName}": ${stockErr.message}`);
          }

          const { error: movErr } = await supabase.from('inventory_movements').insert({
            id: 'mov-po-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            inventory_item_id: invItem.id,
            type: 'purchase',
            quantity_delta: item.quantity,
            balance_after: updatedStock,
            reference_id: newPurchase.id,
            notes: `Restocked via PO #${newPurchase.invoiceNumber || newPurchase.id} from ${newPurchase.supplierName}`,
            created_by: currentUser.fullName,
            created_at: now
          });

          if (movErr) {
            console.error('[recordPurchase] movement insert failed:', movErr);
            // Stock already updated — log but still throw so UI does not claim full success without audit trail
            throw new Error(`Stock updated for "${item.itemName}" but inventory movement log failed: ${movErr.message}`);
          }

          // Update in-memory inventory once
          invItem.currentStock = updatedStock;
          invItem.costPerUnitCents = item.unitCostCents;
          invItem.updatedAt = now;
        }
      }
    } else {
      // Offline / local-only path: update inventory once via storage helper
      if (isReceived) {
        for (const item of newPurchase.items) {
          const invItem = this.state.inventoryItems.find(i => i.id === item.inventoryItemId);
          if (invItem) {
            invItem.currentStock += item.quantity;
            invItem.costPerUnitCents = item.unitCostCents;
            invItem.updatedAt = now;
            this.state.inventoryMovements.unshift({
              id: 'mov-po-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              inventoryItemId: invItem.id,
              itemName: invItem.name,
              type: 'purchase',
              quantityDelta: item.quantity,
              balanceAfter: invItem.currentStock,
              referenceId: newPurchase.id,
              notes: `Restock from PO #${newPurchase.invoiceNumber || newPurchase.id}`,
              createdBy: currentUser.fullName,
              createdAt: now
            });
          }
        }
      }
    }

    // Local purchase cache (do NOT call db.recordPurchase — it would double inventory)
    this.state.purchases.unshift(newPurchase);
    const localState = db.getState();
    localState.purchases.unshift(newPurchase);
    // Mirror inventory into local store without re-applying deltas
    localState.inventoryItems = this.state.inventoryItems.map(i => ({ ...i }));
    localState.inventoryMovements = [...this.state.inventoryMovements];
    db.persistState();

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
