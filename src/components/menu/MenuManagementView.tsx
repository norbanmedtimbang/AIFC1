import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  Coffee,
  Check,
  X,
  Sliders,
  DollarSign
} from 'lucide-react';
import {
  Product,
  Category,
  ModifierGroup,
  InventoryItem,
  ProductVariant,
  RecipeIngredient
} from '../../types';
import { db, formatPHP, parsePHPAmountToCents } from '../../services/storage';

interface MenuManagementViewProps {
  products: Product[];
  categories: Category[];
  modifierGroups: ModifierGroup[];
  inventoryItems: InventoryItem[];
  onRefreshData: () => void;
}

export const MenuManagementView: React.FC<MenuManagementViewProps> = ({
  products,
  categories,
  modifierGroups,
  inventoryItems,
  onRefreshData
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'modifiers'>('products');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Edit / Add Product Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // New Category State
  const [newCategoryName, setNewCategoryName] = useState('');

  // Handle Open Create Product
  const handleOpenCreateProduct = () => {
    const newProd: Product = {
      id: 'prod-' + Date.now(),
      categoryId: categories[0]?.id || 'cat-1',
      sku: 'DRK-' + Math.floor(100 + Math.random() * 900),
      name: '',
      description: '',
      isActive: true,
      displayOrder: products.length + 1,
      variants: [
        {
          id: 'var-' + Date.now() + '-1',
          productId: '',
          name: 'Regular',
          priceCents: 15000,
          costPriceCents: 3500,
          isActive: true
        }
      ],
      modifierGroupIds: [],
      recipes: {}
    };
    setEditingProduct(newProd);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (prod: Product) => {
    // Clone product
    setEditingProduct(JSON.parse(JSON.stringify(prod)));
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product from the menu?')) {
      db.deleteProduct(productId);
      onRefreshData();
    }
  };

  // Save Product Changes
  const handleSaveProduct = () => {
    if (!editingProduct || !editingProduct.name.trim()) {
      alert('Please enter a valid product name.');
      return;
    }
    if (editingProduct.variants.length === 0) {
      alert('A product must have at least one size or variant.');
      return;
    }

    db.saveProduct(editingProduct);
    setIsProductModalOpen(false);
    setEditingProduct(null);
    onRefreshData();
  };

  // Add Variant in Modal
  const handleAddVariant = () => {
    if (!editingProduct) return;
    const newVar: ProductVariant = {
      id: 'var-' + Date.now() + '-' + (editingProduct.variants.length + 1),
      productId: editingProduct.id,
      name: 'Size ' + (editingProduct.variants.length + 1),
      priceCents: 16000,
      costPriceCents: 4000,
      isActive: true
    };
    setEditingProduct({
      ...editingProduct,
      variants: [...editingProduct.variants, newVar]
    });
  };

  // Add Recipe Ingredient to Variant
  const handleAddRecipeIngredient = (variantId: string, inventoryItemId: string) => {
    if (!editingProduct) return;
    const inv = inventoryItems.find(i => i.id === inventoryItemId);
    if (!inv) return;

    const currentRecipes = editingProduct.recipes || {};
    const variantRecipes = currentRecipes[variantId] || [];

    // Avoid duplicates
    if (variantRecipes.some(r => r.inventoryItemId === inventoryItemId)) return;

    const newIngredient: RecipeIngredient = {
      id: 'r-' + Date.now(),
      inventoryItemId: inv.id,
      itemName: inv.name,
      unit: inv.unit,
      quantityRequired: inv.unit === 'grams' ? 18 : inv.unit === 'ml' ? 200 : 1
    };

    setEditingProduct({
      ...editingProduct,
      recipes: {
        ...currentRecipes,
        [variantId]: [...variantRecipes, newIngredient]
      }
    });
  };

  const handleRemoveRecipeIngredient = (variantId: string, ingredientId: string) => {
    if (!editingProduct || !editingProduct.recipes) return;
    const current = editingProduct.recipes[variantId] || [];
    setEditingProduct({
      ...editingProduct,
      recipes: {
        ...editingProduct.recipes,
        [variantId]: current.filter(r => r.id !== ingredientId)
      }
    });
  };

  // Add Category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: newCategoryName.trim(),
      displayOrder: categories.length + 1
    };
    db.saveCategory(newCat);
    setNewCategoryName('');
    onRefreshData();
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategoryFilter === 'all') return true;
    return p.categoryId === selectedCategoryFilter;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-c5-beige pb-4">
        <div>
          <h2 className="text-xl font-bold text-c5-charcoal">Menu & Recipe Engineering</h2>
          <p className="text-xs text-c5-charcoal-muted mt-0.5">
            Configure specialty coffee drinks, variants, prices, modifiers, and recipe inventory links
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-c5-cream p-1 rounded-xl border border-c5-beige">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'products'
                ? 'bg-c5-espresso text-c5-cream shadow-xs'
                : 'text-c5-charcoal hover:text-black'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'categories'
                ? 'bg-c5-espresso text-c5-cream shadow-xs'
                : 'text-c5-charcoal hover:text-black'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('modifiers')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'modifiers'
                ? 'bg-c5-espresso text-c5-cream shadow-xs'
                : 'text-c5-charcoal hover:text-black'
            }`}
          >
            Modifier Groups ({modifierGroups.length})
          </button>
        </div>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-c5-espresso text-c5-cream'
                    : 'bg-white border border-c5-beige text-c5-charcoal hover:bg-c5-cream'
                }`}
              >
                All Categories
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    selectedCategoryFilter === c.id
                      ? 'bg-c5-espresso text-c5-cream'
                      : 'bg-white border border-c5-beige text-c5-charcoal hover:bg-c5-cream'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <button
              onClick={handleOpenCreateProduct}
              className="px-4 py-2 rounded-xl bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 self-end sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Drink / Product</span>
            </button>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-2xl border border-c5-beige overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-c5-cream/60 border-b border-c5-beige text-c5-charcoal-muted uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">SKU / Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Sizes & Prices (PHP)</th>
                  <th className="py-3 px-4">Recipe (Inventory BOM)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-c5-beige/60">
                {filteredProducts.map(product => {
                  const categoryName =
                    categories.find(c => c.id === product.categoryId)?.name || 'Unassigned';
                  return (
                    <tr key={product.id} className="hover:bg-c5-cream/20 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-c5-charcoal">{product.name}</div>
                        <div className="text-[10px] font-mono text-c5-charcoal-light">
                          {product.sku || 'NO-SKU'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-c5-cream border border-c5-beige text-c5-charcoal font-medium">
                          {categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {product.variants.map(v => (
                            <div key={v.id} className="flex items-center gap-2">
                              <span className="font-medium text-c5-charcoal">{v.name}:</span>
                              <span className="font-mono font-bold text-c5-espresso">
                                {formatPHP(v.priceCents)}
                              </span>
                              <span className="text-[10px] text-c5-charcoal-light font-mono">
                                (Cost: {formatPHP(v.costPriceCents)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {product.recipes && Object.keys(product.recipes).length > 0 ? (
                          <div className="space-y-1 text-[11px] text-c5-charcoal-muted">
                            {Object.entries(product.recipes).map(([vId, ingredients]) => {
                              const variantName =
                                product.variants.find(v => v.id === vId)?.name || 'Variant';
                              return (
                                <div key={vId}>
                                  <span className="font-semibold text-c5-charcoal">
                                    {variantName}:
                                  </span>{' '}
                                  {ingredients.map(i => `${i.quantityRequired}${i.unit} ${i.itemName}`).join(', ')}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-c5-charcoal-light italic text-[11px]">
                            No auto-deduction recipe
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-1.5 hover:bg-c5-cream rounded-lg text-c5-charcoal hover:text-c5-espresso transition"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-c5-charcoal-light hover:text-rose-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white p-4 rounded-2xl border border-c5-beige shadow-xs flex items-center gap-3">
            <input
              type="text"
              placeholder="New Category Name (e.g. Filter Coffee, Seasonal Drinks)"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 bg-c5-cream/50 border border-c5-beige rounded-xl px-3.5 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-c5-espresso text-c5-cream rounded-xl text-xs font-bold hover:bg-c5-espresso-dark transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-c5-beige overflow-hidden shadow-xs divide-y divide-c5-beige/60">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-c5-charcoal-muted">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-c5-charcoal">{cat.name}</h4>
                    <span className="text-[10px] text-c5-charcoal-muted">
                      {products.filter(p => p.categoryId === cat.id).length} products assigned
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODIFIERS TAB */}
      {activeTab === 'modifiers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modifierGroups.map(grp => (
            <div
              key={grp.id}
              className="bg-white p-5 rounded-2xl border border-c5-beige shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-c5-beige/60 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-c5-espresso" />
                  <h4 className="text-xs font-bold text-c5-charcoal">{grp.name}</h4>
                </div>
                <span className="text-[10px] text-c5-charcoal-muted">
                  Max: {grp.maxSelection} selection
                </span>
              </div>
              <div className="space-y-2">
                {grp.modifiers.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-c5-cream/40 border border-c5-beige/60 text-xs"
                  >
                    <span className="font-medium text-c5-charcoal">{m.name}</span>
                    <span className="font-mono font-bold text-c5-espresso">
                      {m.priceCents > 0 ? `+${formatPHP(m.priceCents)}` : '₱0.00 (Default)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT / CREATE PRODUCT MODAL */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-c5-beige overflow-hidden my-6">
            <div className="bg-c5-espresso text-c5-cream p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingProduct.id.includes('prod-') && !products.some(p => p.id === editingProduct.id)
                    ? 'Add New Product'
                    : 'Edit Product & Recipe'}
                </h3>
                <p className="text-xs text-c5-beige/80 mt-0.5">
                  Set prices in PHP and link inventory items for automatic stock deduction
                </p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-c5-beige hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Product Basic Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={e =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    placeholder="e.g. Spanish Latte, Cold Brew"
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                    Category *
                  </label>
                  <select
                    value={editingProduct.categoryId}
                    onChange={e =>
                      setEditingProduct({ ...editingProduct, categoryId: e.target.value })
                    }
                    className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingProduct.description || ''}
                  onChange={e =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  placeholder="Notes, ingredients, flavor profile..."
                  className="w-full bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal outline-hidden focus:border-c5-espresso"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal block mb-1">
                  Product Photography (Image URL)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={editingProduct.imageUrl || ''}
                    onChange={e =>
                      setEditingProduct({ ...editingProduct, imageUrl: e.target.value })
                    }
                    placeholder="/src/assets/images/... or image URL"
                    className="flex-1 bg-white border border-c5-beige rounded-xl px-3 py-2 text-xs text-c5-charcoal font-mono outline-hidden focus:border-c5-espresso"
                  />
                  {editingProduct.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditingProduct({ ...editingProduct, imageUrl: undefined })}
                      className="px-3 py-1 bg-c5-cream rounded-xl text-xs text-c5-charcoal hover:bg-c5-beige"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 items-center text-[10px]">
                  <span className="text-c5-charcoal-muted">Gen Z Presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        imageUrl: '/src/assets/images/product_spanish_latte_1791168309026.jpg'
                      })
                    }
                    className="px-2 py-0.5 rounded bg-c5-cream border border-c5-beige hover:bg-c5-beige text-c5-charcoal font-medium"
                  >
                    Iced Spanish Latte
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        imageUrl: '/src/assets/images/product_dirty_matcha_1791168321790.jpg'
                      })
                    }
                    className="px-2 py-0.5 rounded bg-c5-cream border border-c5-beige hover:bg-c5-beige text-c5-charcoal font-medium"
                  >
                    Dirty Matcha
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        imageUrl: '/src/assets/images/product_artisan_pastry_1791168332615.jpg'
                      })
                    }
                    className="px-2 py-0.5 rounded bg-c5-cream border border-c5-beige hover:bg-c5-beige text-c5-charcoal font-medium"
                  >
                    Artisan Croissant
                  </button>
                </div>
              </div>

              {/* Sizes / Variants */}
              <div className="space-y-3 pt-2 border-t border-c5-beige">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-c5-charcoal">
                    Sizes, Variants & Pricing
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-xs font-bold text-c5-espresso hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Size</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingProduct.variants.map((v, vIdx) => (
                    <div
                      key={v.id}
                      className="p-3.5 bg-c5-cream/40 rounded-xl border border-c5-beige space-y-3"
                    >
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-c5-charcoal-muted uppercase">
                            Variant Name
                          </label>
                          <input
                            type="text"
                            value={v.name}
                            onChange={e => {
                              const updated = [...editingProduct.variants];
                              updated[vIdx].name = e.target.value;
                              setEditingProduct({ ...editingProduct, variants: updated });
                            }}
                            placeholder="e.g. 12oz Hot, 16oz Iced"
                            className="w-full bg-white border border-c5-beige rounded-lg px-2.5 py-1.5 text-xs font-semibold text-c5-charcoal"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-c5-charcoal-muted uppercase">
                            Selling Price (PHP)
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={v.priceCents / 100}
                            onChange={e => {
                              const updated = [...editingProduct.variants];
                              updated[vIdx].priceCents = parsePHPAmountToCents(
                                parseFloat(e.target.value) || 0
                              );
                              setEditingProduct({ ...editingProduct, variants: updated });
                            }}
                            className="w-full bg-white border border-c5-beige rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-c5-charcoal"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-c5-charcoal-muted uppercase">
                            Cost Price (PHP)
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={v.costPriceCents / 100}
                            onChange={e => {
                              const updated = [...editingProduct.variants];
                              updated[vIdx].costPriceCents = parsePHPAmountToCents(
                                parseFloat(e.target.value) || 0
                              );
                              setEditingProduct({ ...editingProduct, variants: updated });
                            }}
                            className="w-full bg-white border border-c5-beige rounded-lg px-2.5 py-1.5 text-xs font-mono text-c5-charcoal"
                          />
                        </div>
                      </div>

                      {/* Recipe Inventory Link for this Variant */}
                      <div className="pt-2 border-t border-c5-beige/60">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-c5-charcoal uppercase tracking-wider">
                            Recipe BOM Deductions for {v.name}:
                          </span>
                          <select
                            onChange={e => {
                              if (e.target.value) {
                                handleAddRecipeIngredient(v.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="text-[11px] bg-white border border-c5-beige rounded-lg px-2 py-0.5 text-c5-charcoal"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              + Link Inventory Item...
                            </option>
                            {inventoryItems.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} ({inv.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {editingProduct.recipes?.[v.id]?.length ? (
                          <div className="space-y-1.5">
                            {editingProduct.recipes[v.id].map(ing => (
                              <div
                                key={ing.id}
                                className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-c5-beige/80 text-xs"
                              >
                                <span className="font-medium text-c5-charcoal">{ing.itemName}</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={ing.quantityRequired}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const updatedList = editingProduct.recipes![v.id].map(r =>
                                        r.id === ing.id ? { ...r, quantityRequired: val } : r
                                      );
                                      setEditingProduct({
                                        ...editingProduct,
                                        recipes: {
                                          ...editingProduct.recipes,
                                          [v.id]: updatedList
                                        }
                                      });
                                    }}
                                    className="w-16 bg-c5-cream border border-c5-beige rounded px-1.5 py-0.5 text-xs text-right font-mono"
                                  />
                                  <span className="text-[10px] text-c5-charcoal-muted">
                                    {ing.unit}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRecipeIngredient(v.id, ing.id)}
                                    className="text-c5-charcoal-light hover:text-rose-600 p-0.5"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-c5-charcoal-light italic">
                            No raw inventory items linked to this size.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-c5-cream/40 border-t border-c5-beige flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-c5-charcoal hover:bg-c5-beige transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-c5-espresso text-c5-cream hover:bg-c5-espresso-dark transition shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
