import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from './storage';

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
      if (error.message.includes('relation "public.users" does not exist')) {
        return {
          ok: false,
          message: 'Connected to Supabase project, but tables are not created yet! Run the database/supabase_schema.sql script in Supabase SQL Editor.'
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
 * Pushes local SQLite/browser data to Supabase cloud
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
      await supabase.from('categories').upsert(
        local.categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          display_order: c.displayOrder,
          color_code: c.colorCode
        }))
      );
    }

    // 2. Sync Products & Variants
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
      }
    }

    // 3. Sync Inventory Items
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

    // 4. Sync Sales
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
      message: `Cloud sync complete! Pushed ${local.products.length} products, ${local.inventoryItems.length} inventory items, and ${local.sales.length} orders.`
    };
  } catch (err) {
    return {
      ok: false,
      message: `Push failed: ${(err as Error).message}`
    };
  }
}
