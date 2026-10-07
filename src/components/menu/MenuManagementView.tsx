import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Coffee,
  Check,
  X,
  Sliders,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  Product,
  Category,
  ModifierGroup,
  InventoryItem,
  ProductVariant,
  RecipeIngredient
} from '../../types';
import { formatPHP, parsePHPAmountToCents } from '../../services/storage';
import { dataService } from '../../services/dataService';

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
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete Product Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [deleteProductError, setDeleteProductError] = useState<string | null>(null);

  // New Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

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
    setSaveError(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProduct(JSON.parse(JSON.stringify(prod)));
    setSaveError(null);
    setIsProductModalOpen(true);
  };

  const handlePromptDeleteProduct = (product: Product) => {
    setDeleteProductError(null);
    setProductToDelete(product);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    setDeleteProductError(null);
    try {
      await dataService.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      onRefreshData();
    } catch (err) {
      setDeleteProductError('Failed to delete product: ' + (err as Error).message);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Save Product Changes
  const handleSaveProduct = async () => {
    setSaveError(null);
    if (!editingProduct || !editingProduct.name.trim()) {
      setSaveError('Please enter a valid product name.');
      return;
    }
    if (editingProduct.variants.length === 0) {
      setSaveError('A product must have at least one size or variant.');
      return;
    }

    setIsSavingProduct(true);
    try {
      await dataService.saveProduct(editingProduct);
      setIsProductModalOpen(false);
      setEditingProduct(null);
      onRefreshData();
    } catch (err) {
      console.error('Save product error:', err);
      setSaveError((err as Error).message || 'Failed to save product to cloud database.');
    } finally {
      setIsSavingProduct(false);
    }
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

  const handleRemoveVariant = (variantId: string) => {
    if (!editingProduct) return;
    if (editingProduct.variants.length <= 1) {
      setSaveError('A product must have at least one size variant.');
      return;
    }
    setSaveError(null);
    setEditingProduct({
      ...editingProduct,
      variants: editingProduct.variants.filter(v => v.id !== variantId)
    });
  };

  // Add Recipe Ingredient to Variant
  const handleAddRecipeIngredient = (variantId: string, inventoryItemId: string) => {
    if (!editingProduct) return;
    const inv = inventoryItems.find(i => i.id === inventoryItemId);
    if (!inv) return;

    const currentRecipes = editingProduct.recipes || {};
    const variantRecipes = currentRecipes[variantId] || [];

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
  const handleAddCategory = async () => {
    setCategoryError(null);
    if (!newCategoryName.trim()) {
      setCategoryError('Please enter a category name.');
      return;
    }
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: newCategoryName.trim(),
      displayOrder: categories.length + 1
    };
    setIsSavingCategory(true);
    try {
      await dataService.saveCategory(newCat);
      setNewCategoryName('');
      onRefreshData();
    } catch (err) {
      setCategoryError('Failed to save category: ' + (err as Error).message);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (selectedCategoryFilter === 'all') return true;
    return p.categoryId === selectedCategoryFilter;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E8E2D9] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#292929]">Menu & Recipes</h1>
          <p className="text-xs text-[#7A736C] mt-0.5">
            Configure drinks, size variants, retail prices, and inventory recipe deductions
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#F7F3EB] p-1 rounded-xl border border-[#E8E2D9]">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#3B2925] text-white shadow-xs'
                : 'text-[#6E6862] hover:text-[#292929]'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-[#3B2925] text-white shadow-xs'
                : 'text-[#6E6862] hover:text-[#292929]'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('modifiers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'modifiers'
                ? 'bg-[#3B2925] text-white shadow-xs'
                : 'text-[#6E6862] hover:text-[#292929]'
            }`}
          >
            Modifiers ({modifierGroups.length})
          </button>
        </div>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-[#3B2925] text-white shadow-xs'
                    : 'bg-white border border-[#E8E2D9] text-[#6E6862] hover:bg-[#F7F3EB]'
                }`}
              >
                All
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                    selectedCategoryFilter === c.id
                      ? 'bg-[#3B2925] text-white shadow-xs'
                      : 'bg-white border border-[#E8E2D9] text-[#6E6862] hover:bg-[#F7F3EB]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <button
              onClick={handleOpenCreateProduct}
              className="px-4 py-2 rounded-xl bg-[#3B2925] hover:bg-[#2C1E1A] text-white text-xs font-medium transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 self-end sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-xl border border-[#E8E2D9] overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#FBF9F5] border-b border-[#E8E2D9] text-[#7A736C]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Product Name</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Sizes & Prices</th>
                  <th className="py-2.5 px-4 font-medium">Recipe BOM</th>
                  <th className="py-2.5 px-4 font-medium text-center">Status</th>
                  <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F7F3EB]">
                {filteredProducts.map(product => {
                  const categoryName =
                    categories.find(c => c.id === product.categoryId)?.name || 'Unassigned';
                  return (
                    <tr key={product.id} className="hover:bg-[#FAF7F2] transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#292929]">{product.name}</div>
                        {product.sku && (
                          <div className="text-[10px] font-mono text-[#9B948C]">
                            {product.sku}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#6E6862]">
                        {categoryName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {product.variants.map(v => (
                            <div key={v.id} className="flex items-center gap-2">
                              <span className="text-[#6E6862]">{v.name}:</span>
                              <span className="font-mono font-medium text-[#3B2925]">
                                {formatPHP(v.priceCents)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#7A736C]">
                        {product.recipes && Object.keys(product.recipes).length > 0 ? (
                          <div className="space-y-0.5 text-[11px]">
                            {Object.entries(product.recipes).map(([vId, ingredients]) => {
                              const variantName =
                                product.variants.find(v => v.id === vId)?.name || 'Size';
                              return (
                                <div key={vId}>
                                  <span className="font-medium text-[#292929]">
                                    {variantName}:
                                  </span>{' '}
                                  {ingredients.map(i => `${i.quantityRequired}${i.unit} ${i.itemName}`).join(', ')}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[#9B948C] italic text-[11px]">
                            No auto-deduction
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              product.isActive ? 'bg-[#A8B5A0]' : 'bg-[#DDD4C7]'
                            }`}
                          />
                          <span className="text-[#6E6862]">
                            {product.isActive ? 'Active' : 'Archived'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] hover:bg-[#F7F3EB] cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePromptDeleteProduct(product)}
                            className="p-1 rounded-lg text-[#9B948C] hover:text-[#A25035] hover:bg-red-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeTab === 'categories' && (
        <div className="space-y-4 max-w-xl">
          {categoryError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
              <span>{categoryError}</span>
            </div>
          )}
          <div className="bg-white p-3 rounded-xl border border-[#E8E2D9] flex items-center gap-2">
            <input
              type="text"
              placeholder="New Category Name (e.g. Cold Brew, Pastries)"
              value={newCategoryName}
              onChange={e => {
                setNewCategoryName(e.target.value);
                setCategoryError(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCategory();
              }}
              className="flex-1 bg-white border border-[#E8E2D9] rounded-lg px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
            />
            <button
              onClick={handleAddCategory}
              disabled={isSavingCategory}
              className="px-3 py-1.5 bg-[#3B2925] text-white rounded-lg text-xs font-medium hover:bg-[#2C1E1A] transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
            >
              {isSavingCategory ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{isSavingCategory ? 'Saving...' : 'Add'}</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#E8E2D9] divide-y divide-[#F7F3EB]">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#9B948C]">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-medium text-[#292929]">{cat.name}</h4>
                    <span className="text-[10px] text-[#7A736C]">
                      {products.filter(p => p.categoryId === cat.id).length} products
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
              className="bg-white p-4 rounded-xl border border-[#E8E2D9] space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#F7F3EB] pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#3B2925]" />
                  <h4 className="text-xs font-semibold text-[#292929]">{grp.name}</h4>
                </div>
                <span className="text-[10px] text-[#7A736C]">
                  Max: {grp.maxSelection}
                </span>
              </div>

              <div className="space-y-1">
                {grp.modifiers.map(mod => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#FBF9F5]"
                  >
                    <span className="text-[#292929]">{mod.name}</span>
                    <span className="font-mono text-[#3B2925]">
                      {mod.priceCents > 0 ? `+${formatPHP(mod.priceCents)}` : 'Free'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden my-6">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-[#292929]">
                  {editingProduct.id.includes('prod-') && !products.some(p => p.id === editingProduct.id)
                    ? 'Add New Product'
                    : 'Edit Product'}
                </h3>
                <p className="text-xs text-[#7A736C] mt-0.5">
                  Set prices and recipe ingredients
                </p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={e =>
                      setEditingProduct({ ...editingProduct, name: e.target.value })
                    }
                    placeholder="e.g. Spanish Latte"
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#292929] block mb-1">
                    Category *
                  </label>
                  <select
                    value={editingProduct.categoryId}
                    onChange={e =>
                      setEditingProduct({ ...editingProduct, categoryId: e.target.value })
                    }
                    className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
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
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingProduct.description || ''}
                  onChange={e =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  placeholder="Ingredients or flavor profile..."
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#292929] block mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={editingProduct.imageUrl || ''}
                  onChange={e =>
                    setEditingProduct({ ...editingProduct, imageUrl: e.target.value })
                  }
                  placeholder="https://... or image asset path"
                  className="w-full bg-white border border-[#E8E2D9] rounded-xl px-3 py-1.5 text-xs font-mono text-[#292929] outline-hidden focus:border-[#3B2925]"
                />
              </div>

              {/* Sizes and Variants */}
              <div className="pt-2 border-t border-[#E8E2D9]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[#292929]">
                    Size Variants & Pricing
                  </label>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="text-[11px] text-[#3B2925] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Size</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingProduct.variants.map((v, idx) => (
                    <div
                      key={v.id}
                      className="p-3 bg-[#FBF9F5] rounded-xl border border-[#E8E2D9] space-y-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={v.name}
                          onChange={e => {
                            const updated = editingProduct.variants.map(item =>
                              item.id === v.id ? { ...item, name: e.target.value } : item
                            );
                            setEditingProduct({ ...editingProduct, variants: updated });
                          }}
                          placeholder="Size (e.g. 12oz Hot)"
                          className="flex-1 bg-white border border-[#E8E2D9] rounded-lg px-2.5 py-1 text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-[#7A736C]">₱</span>
                          <input
                            type="number"
                            value={v.priceCents / 100}
                            onChange={e => {
                              const val = parsePHPAmountToCents(parseFloat(e.target.value) || 0);
                              const updated = editingProduct.variants.map(item =>
                                item.id === v.id ? { ...item, priceCents: val } : item
                              );
                              setEditingProduct({ ...editingProduct, variants: updated });
                            }}
                            className="w-20 bg-white border border-[#E8E2D9] rounded-lg px-2 py-1 text-xs font-mono text-right"
                          />
                        </div>
                        {editingProduct.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.id)}
                            className="text-[#9B948C] hover:text-[#A25035] p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Recipe Linkage for this variant */}
                      <div className="pt-2 border-t border-[#F0EAE1]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-[#7A736C]">Recipe Ingredients:</span>
                          <select
                            onChange={e => {
                              if (e.target.value) {
                                handleAddRecipeIngredient(v.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="text-[11px] bg-white border border-[#E8E2D9] rounded px-1.5 py-0.5 text-[#292929]"
                            defaultValue=""
                          >
                            <option value="" disabled>+ Link Raw Material</option>
                            {inventoryItems.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} ({inv.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {editingProduct.recipes?.[v.id]?.length ? (
                          <div className="space-y-1">
                            {editingProduct.recipes[v.id].map(ing => (
                              <div
                                key={ing.id}
                                className="flex items-center justify-between bg-white px-2 py-1 rounded border border-[#E8E2D9] text-[11px]"
                              >
                                <span className="text-[#292929]">{ing.itemName}</span>
                                <div className="flex items-center gap-1.5">
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
                                    className="w-14 bg-[#F7F3EB] border border-[#E8E2D9] rounded px-1 py-0.5 text-right font-mono text-xs"
                                  />
                                  <span className="text-[10px] text-[#7A736C]">{ing.unit}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRecipeIngredient(v.id, ing.id)}
                                    className="text-[#9B948C] hover:text-[#A25035] p-0.5 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#9B948C] italic">
                            No materials linked to this size.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#FBF9F5] border-t border-[#E8E2D9] space-y-3">
              {saveError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSavingProduct}
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingProduct}
                  onClick={handleSaveProduct}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#3B2925] text-white hover:bg-[#2C1E1A] transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Product</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-[#E8E2D9] overflow-hidden">
            <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between">
              <h3 className="font-semibold text-sm text-[#292929]">Delete Product</h3>
              <button
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="p-1 rounded-lg text-[#7A736C] hover:text-[#292929] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {deleteProductError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span>{deleteProductError}</span>
                </div>
              )}
              <p className="text-[#6E6862]">
                Are you sure you want to remove <strong className="text-[#292929]">{productToDelete.name}</strong> from the menu? Past sales records will keep their historical snapshot.
              </p>
            </div>
            <div className="p-4 bg-[#FBF9F5] border-t border-[#E8E2D9] flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#6E6862] hover:bg-[#EFE9DF] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingProduct}
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isDeletingProduct ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Product</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
