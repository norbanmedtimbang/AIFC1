import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db, setProductSyncListener } from './storage';
import { Product, RecipeIngredient } from '../types';

const rawUrl = (
  import.meta.env.VITE_SUPABASE_URL || 'https://opnihchpbzotimnjkngu.supabase.co'
).trim();

// Strip trailing /rest/v1 or trailing slashes if full REST endpoint was provided
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbmloY2hwYnpvdGltbmprbmd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNjA4OTcsImV4cCI6MjEwNjczNjg5N30.uXRXqAQj8qu_-6bh9nW9irmi48_Mjag9RUSwI7lABpA'
).trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

// Automatically push menu products and recipe changes to Supabase in real time
setProductSyncListener((product, action) => {
  if (action === 'save') {
    syncProductAndRecipesToSupabase(product);
  } else if (action === 'delete') {
    deleteProductFromSupabase(product.id);
  }
});

/**
 * Tests connection to Supabase database by attempting a quiet select on users or categories
 */
export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
  tableCount?: number;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      ok: false,
      message: 'Supabase URL or Anon Key is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel or your .env file.'
    };
  }

  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      if (
        error.message.includes('relation "public.users" does not exist') ||
        error.message.includes('column products.id does not exist') ||
        error.code === '42P01' ||
        error.code === '42703'
      ) {
        return {
          ok: false,
          message: 'Connected to Supabase, but PostgreSQL tables are not created yet! Go to Supabase SQL Editor and run the database/supabase_schema.sql script.'
        };
      }
      return {
        ok: false,
        message: `Supabase Error: ${error.message}`
      };
    }

    return {
      ok: true,
      message: 'Successfully connected to Supabase PostgreSQL cloud database!',
      tableCount: data ? data.length : 0
    };
  } catch (err) {
    return {
      ok: false,
      message: `Connection failed: ${(err as Error).message}`
    };
  }
}

/**
 * Syncs a single product and its variants and recipe ingredients straight to Supabase
 */
export async function syncProductAndRecipesToSupabase(product: Product): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;

  try {
    // 1. Upsert product
    const { error: pErr } = await supabase.from('products').upsert({
      id: product.id,
      category_id: product.categoryId,
      sku: product.sku || null,
      name: product.name,
      description: product.description || null,
      image_url: product.imageUrl || null,
      is_active: product.isActive,
      display_order: product.displayOrder
    });

    if (pErr) {
      console.warn('Supabase product upsert notice:', pErr.message);
      return;
    }

    // 2. Upsert variants
    for (const v of product.variants) {
      await supabase.from('product_variants').upsert({
        id: v.id,
        product_id: product.id,
        name: v.name,
        sku: v.sku || null,
        price_cents: v.priceCents,
        cost_price_cents: v.costPriceCents,
        is_active: v.isActive
      });

      // 3. Upsert recipe bill of materials for this variant
      const ingredients = product.recipes?.[v.id] || [];
      // Clear previous recipes for this variant
      await supabase.from('recipes').delete().eq('variant_id', v.id);

      if (ingredients.length > 0) {
        await supabase.from('recipes').insert(
          ingredients.map((ing: RecipeIngredient) => ({
            id: `recipe-${v.id}-${ing.inventoryItemId}`,
            variant_id: v.id,
            inventory_item_id: ing.inventoryItemId,
            quantity_required: ing.quantityRequired
          }))
        );
      }
    }
  } catch (err) {
    console.error('Real-time Supabase product sync skipped (offline or tables pending):', err);
  }
}

/**
 * Deletes a product from Supabase
 */
export async function deleteProductFromSupabase(productId: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    await supabase.from('products').delete().eq('id', productId);
  } catch (err) {
    console.error('Failed to delete product from Supabase:', err);
  }
}

/**
 * Pushes all local SQLite/browser data to Supabase cloud
 */
export async function pushLocalDataToSupabase(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      ok: false,
      message: 'Supabase credentials not configured.'
    };
  }

  try {
    const local = db.getState();

    // 1. Sync Categories
    if (local.categories.length > 0) {
      const { error: catErr } = await supabase.from('categories').upsert(
        local.categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          display_order: c.displayOrder,
          color_code: c.colorCode
        }))
      );
      if (catErr) {
        return {
          ok: false,
          message: `Supabase table missing or error: ${catErr.message}. Make sure to execute database/supabase_schema.sql in the Supabase SQL Editor.`
        };
      }
    }

    // 2. Sync Inventory Items first (so foreign keys in recipes work)
    if (local.inventoryItems.length > 0) {
      await supabase.from('inventory_items').upsert(
        local.inventoryItems.map((item: any) => ({
          id: item.id,
          sku: item.sku || null,
          name: item.name,
          unit: item.unit,
          current_stock: item.currentStock,
          min_threshold: item.minThreshold,
          cost_per_unit_cents: item.costPerUnitCents
        }))
      );
    }

    // 3. Sync Products, Variants, and Recipes
    let totalRecipes = 0;
    for (const p of local.products) {
      await supabase.from('products').upsert({
        id: p.id,
        category_id: p.categoryId,
        sku: p.sku || null,
        name: p.name,
        description: p.description || null,
        image_url: p.imageUrl || null,
        is_active: p.isActive,
        display_order: p.displayOrder
      });

      for (const v of p.variants) {
        await supabase.from('product_variants').upsert({
          id: v.id,
          product_id: p.id,
          name: v.name,
          sku: v.sku || null,
          price_cents: v.priceCents,
          cost_price_cents: v.costPriceCents,
          is_active: v.isActive
        });

        // Sync Recipes (BOM)
        const ingredients = p.recipes?.[v.id] || [];
        if (ingredients.length > 0) {
          // Clear and re-insert
          await supabase.from('recipes').delete().eq('variant_id', v.id);
          await supabase.from('recipes').insert(
            ingredients.map((ing: RecipeIngredient) => ({
              id: `recipe-${v.id}-${ing.inventoryItemId}`,
              variant_id: v.id,
              inventory_item_id: ing.inventoryItemId,
              quantity_required: ing.quantityRequired
            }))
          );
          totalRecipes += ingredients.length;
        }
      }
    }

    // 4. Sync Sales & Sale Items
    for (const s of local.sales) {
      await supabase.from('sales').upsert({
        id: s.id,
        order_number: s.orderNumber,
        shift_id: s.shiftId || null,
        cashier_id: s.cashierId,
        order_type: s.orderType,
        customer_name: s.customerName || null,
        customer_notes: s.customerNotes || null,
        subtotal_cents: s.subtotalCents,
        discount_cents: s.discountCents,
        discount_label: s.discountLabel || null,
        tax_cents: s.taxCents,
        total_cents: s.totalCents,
        payment_status: s.paymentStatus,
        payment_method: s.payment.method,
        tendered_cents: s.payment.tenderedCents,
        change_cents: s.payment.changeCents,
        reference_number: s.payment.referenceNumber || null,
        created_at: s.createdAt
      });

      for (const item of s.items) {
        await supabase.from('sale_items').upsert({
          id: item.id,
          sale_id: s.id,
          product_id: item.productId,
          variant_id: item.variantId,
          product_name_snapshot: item.productNameSnapshot,
          variant_name_snapshot: item.variantNameSnapshot,
          unit_price_cents: item.unitPriceCents,
          quantity: item.quantity,
          subtotal_cents: item.subtotalCents,
          notes: item.notes || null
        });
      }
    }

    return {
      ok: true,
      message: `Cloud sync complete! Pushed ${local.products.length} products, ${totalRecipes} recipe links, ${local.inventoryItems.length} inventory items, and ${local.sales.length} orders.`
    };
  } catch (err) {
    return {
      ok: false,
      message: `Push failed: ${(err as Error).message}`
    };
  }
}
