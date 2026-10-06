"use client";

import { useState } from "react";
import Link from "next/link";
import { useSiteConfig } from "@/components/ConfigContext";
import { Product } from "@/data/products";
import { eur } from "@/lib/catalog";
import ImageUploader from "@/components/admin/ImageUploader";
import Icon from "@/components/ui/Icon";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "ONE SIZE"];
const POPULAR_COLORS = [
  { name: "Black", hex: "#111111" },
  { name: "Sand", hex: "#D6C7B2" },
  { name: "Burgundy", hex: "#581825" },
  { name: "Ivory", hex: "#F5F2EB" },
  { name: "Charcoal", hex: "#36454F" },
  { name: "Indigo", hex: "#223A5E" },
  { name: "Olive", hex: "#556B2F" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Brown", hex: "#5C4033" },
  { name: "Gold", hex: "#D4AF37" },
];

const CATEGORIES = [
  { id: "tees", label: "Tees & T-Shirts" },
  { id: "shirts", label: "Woven Shirts" },
  { id: "sweatshirts", label: "Sweatshirts & Hoodies" },
  { id: "trousers", label: "Trousers" },
  { id: "denim", label: "Denim & Jeans" },
  { id: "accessories", label: "Bags & Accessories" },
];

interface GalleryImage {
  label: string;
  url: string;
  isUploaded?: boolean;
}

interface ProductCatalogManagerProps {
  allGalleryImages: GalleryImage[];
  fetchUploadedMedia: () => void;
  showToast: (msg: string) => void;
}

export default function ProductCatalogManager({
  allGalleryImages,
  fetchUploadedMedia,
  showToast,
}: ProductCatalogManagerProps) {
  const {
    catalogProducts,
    updateProductOverride,
    addProduct,
    deleteProduct,
    restoreProduct,
  } = useSiteConfig();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deleted">("active");

  // Modal States
  const [editingProduct, setEditingProduct] = useState<(Product & { isDeleted?: boolean }) | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<(Product & { isDeleted?: boolean }) | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [newSizeInput, setNewSizeInput] = useState("");
  const [newColorInput, setNewColorInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // New Product Form State
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    slug: "",
    descriptor: "",
    category: "tees",
    gender: "unisex" as "unisex" | "men" | "women",
    price: 49,
    compareAtPrice: 0,
    inventory: 50,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black"],
    material: "100% organic cotton, 220 gsm. Machine wash cold.",
    description: "Contemporary architectural garment inspired by ancient Eastern textile heritage.",
    images: [] as string[],
    featured: false,
    newArrival: true,
    badge: "NEW",
  });

  // Filter products
  const filteredProducts = catalogProducts.filter((p) => {
    // Status filter
    if (statusFilter === "active" && p.isDeleted) return false;
    if (statusFilter === "deleted" && !p.isDeleted) return false;

    // Category filter
    if (selectedCategory !== "all" && p.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSlug = p.slug.toLowerCase().includes(q);
      const matchDesc = p.descriptor?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
      const matchTags = p.tags?.some((t) => t.toLowerCase().includes(q));
      const matchColors = p.colors?.some((c) => c.toLowerCase().includes(q));
      if (!matchName && !matchSlug && !matchDesc && !matchTags && !matchColors) {
        return false;
      }
    }

    return true;
  });

  // Active counts
  const activeCount = catalogProducts.filter((p) => !p.isDeleted).length;
  const deletedCount = catalogProducts.filter((p) => p.isDeleted).length;

  // Auto-generate slug from name in Add Product
  const handleNewNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setNewProductForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === "" || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") ? slug : prev.slug,
    }));
  };

  // Save changes to edited product
  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setIsSaving(true);

    try {
      await updateProductOverride(editingProduct.slug, {
        name: editingProduct.name,
        descriptor: editingProduct.descriptor,
        price: Number(editingProduct.price),
        compareAtPrice: editingProduct.supplierPrice ? Number(editingProduct.supplierPrice) : undefined,
        category: editingProduct.category,
        gender: editingProduct.gender,
        sizes: editingProduct.sizes,
        colors: editingProduct.colors,
        description: editingProduct.description,
        material: editingProduct.material,
        inventory: editingProduct.inventory !== undefined ? Number(editingProduct.inventory) : 50,
        images: editingProduct.images,
        badge: editingProduct.badge,
        featured: editingProduct.featured,
        newArrival: editingProduct.newArrival,
      });

      showToast(`✓ Successfully updated "${editingProduct.name}"!`);
      setEditingProduct(null);
    } catch {
      showToast("Error saving product changes");
    } finally {
      setIsSaving(false);
    }
  };

  // Create new product
  const handleCreateProduct = async () => {
    if (!newProductForm.name.trim()) {
      alert("Please enter a garment name");
      return;
    }
    const slug = newProductForm.slug.trim() || newProductForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    setIsSaving(true);
    const productImages = newProductForm.images.length > 0
      ? newProductForm.images
      : ["/images/collection.jpg"];

    const newProd: Product = {
      id: `custom-${Date.now()}`,
      slug,
      name: newProductForm.name.trim(),
      descriptor: newProductForm.descriptor.trim() || "Bespoke YUPEK Garment",
      category: newProductForm.category as any,
      gender: newProductForm.gender,
      price: Number(newProductForm.price) || 49,
      currency: "EUR",
      sizes: newProductForm.sizes.length > 0 ? newProductForm.sizes : ["ONE SIZE"],
      colors: newProductForm.colors.length > 0 ? newProductForm.colors : ["Black"],
      description: newProductForm.description.trim(),
      material: newProductForm.material.trim(),
      images: productImages,
      featured: newProductForm.featured,
      newArrival: newProductForm.newArrival,
      badge: newProductForm.badge || undefined,
      inventory: Number(newProductForm.inventory) || 50,
      tags: [newProductForm.category, newProductForm.gender, ...newProductForm.colors.map((c) => c.toLowerCase())],
    };

    const res = await addProduct(newProd);
    setIsSaving(false);

    if (res.success) {
      showToast(`✓ Created new garment "${newProd.name}"!`);
      setIsAddModalOpen(false);
      // Reset form
      setNewProductForm({
        name: "",
        slug: "",
        descriptor: "",
        category: "tees",
        gender: "unisex",
        price: 49,
        compareAtPrice: 0,
        inventory: 50,
        sizes: ["S", "M", "L", "XL"],
        colors: ["Black"],
        material: "100% organic cotton, 220 gsm. Machine wash cold.",
        description: "Contemporary architectural garment inspired by ancient Eastern textile heritage.",
        images: [],
        featured: false,
        newArrival: true,
        badge: "NEW",
      });
    } else {
      alert(res.error || "Failed to create product");
    }
  };

  // Delete product confirmation
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    await deleteProduct(productToDelete.slug);
    showToast(`✓ Removed "${productToDelete.name}" from storefront.`);
    setProductToDelete(null);
  };

  // Restore deleted product
  const handleRestore = async (slug: string, name: string) => {
    await restoreProduct(slug);
    showToast(`✓ Restored "${name}" back to live storefront!`);
  };

  return (
    <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-brown tracking-wide flex items-center gap-2">
            <span>GARMENT CATALOG & CUSTOMIZATION</span>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-widest bg-burgundy/15 text-burgundy px-2.5 py-0.5 rounded-full">
              Full Suite
            </span>
          </h2>
          <p className="text-xs text-brown/60 mt-1">
            Complete product control: Edit garment title, sizes, colours, stock quantities, photo galleries, delete or add new garments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 bg-brown text-cream px-4 py-2 text-xs uppercase tracking-widest hover:bg-black transition-colors font-medium rounded-xs shadow-sm"
          >
            <span className="text-sm leading-none font-bold">+</span>
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white/80 border border-brown/15 p-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-xs transition-colors font-medium ${
              statusFilter === "active"
                ? "bg-brown text-cream font-semibold shadow-xs"
                : "bg-sand/30 text-brown/70 hover:bg-sand/60"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-xs transition-colors font-medium ${
              statusFilter === "all"
                ? "bg-brown text-cream font-semibold shadow-xs"
                : "bg-sand/30 text-brown/70 hover:bg-sand/60"
            }`}
          >
            All ({catalogProducts.length})
          </button>
          {deletedCount > 0 && (
            <button
              onClick={() => setStatusFilter("deleted")}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded-xs transition-colors font-medium ${
                statusFilter === "deleted"
                  ? "bg-burgundy text-cream font-semibold shadow-xs"
                  : "bg-burgundy/10 text-burgundy hover:bg-burgundy/20"
              }`}
            >
              Archived ({deletedCount})
            </button>
          )}
        </div>

        {/* Category & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto border border-brown/25 px-3 py-1.5 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search garments by name, color..."
              className="w-full border border-brown/25 px-3 py-1.5 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-brown/40 hover:text-brown"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="divide-y divide-brown/15 border border-brown/20 bg-white/90 overflow-hidden rounded-sm shadow-xs">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-brown/60">
            <p className="font-serif text-lg text-brown mb-1">No garments match your filters</p>
            <p className="text-xs">Adjust your search query or status filter to see products.</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isOut = p.inventory !== undefined && p.inventory <= 0;
            const isLow = p.inventory !== undefined && p.inventory > 0 && p.inventory <= 5;
            const coverImage = p.images?.[0] || "/images/collection.jpg";

            return (
              <div
                key={p.slug}
                className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-colors ${
                  p.isDeleted ? "bg-burgundy/5 opacity-80" : "hover:bg-sand/10"
                }`}
              >
                {/* Visual Thumbnail & Basic Info */}
                <div className="flex items-start sm:items-center gap-4 min-w-[320px]">
                  <div className="h-20 w-16 bg-sand/30 overflow-hidden relative border border-brown/15 shrink-0 rounded-xs shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                    {p.images && p.images.length > 1 && (
                      <span className="absolute top-1 right-1 bg-black/60 text-white text-[8px] font-mono font-bold px-1 rounded">
                        {p.images.length}
                      </span>
                    )}
                    {p.isDeleted && (
                      <span className="absolute inset-x-0 bottom-0 bg-burgundy text-white text-[8px] text-center uppercase font-bold py-0.5">
                        Archived
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/product/${p.slug}`}
                        target="_blank"
                        className="text-xs uppercase tracking-wider font-semibold text-brown hover:text-burgundy transition-colors"
                      >
                        {p.name}
                      </Link>
                      {p.badge && (
                        <span className="text-[9px] bg-burgundy/15 text-burgundy font-bold px-1.5 py-0.2 rounded uppercase">
                          {p.badge}
                        </span>
                      )}
                      {p.featured && (
                        <span className="text-[9px] bg-gold/30 text-brown font-bold px-1.5 py-0.2 rounded uppercase">
                          ★ Featured
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-brown/60">
                      <span className="capitalize font-medium text-brown/80">{p.category}</span> &bull;{" "}
                      <span className="capitalize">{p.gender}</span> &bull; {p.descriptor}
                    </p>

                    {/* Sizes chips preview */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] text-brown/50 font-medium">Sizes:</span>
                      {p.sizes?.map((sz) => (
                        <span
                          key={sz}
                          className="text-[9px] bg-sand/40 text-brown px-1.5 py-0.2 rounded font-mono font-medium"
                        >
                          {sz}
                        </span>
                      ))}
                    </div>

                    {/* Colours chips preview */}
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-brown/50 font-medium">Colours:</span>
                      {p.colors?.map((c) => (
                        <span
                          key={c}
                          className="text-[9px] bg-sand/30 text-brown px-1.5 py-0.2 rounded flex items-center gap-1"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full inline-block border border-black/20"
                            style={{
                              backgroundColor:
                                POPULAR_COLORS.find((pc) => pc.name.toLowerCase() === c.toLowerCase())?.hex || "#777",
                            }}
                          />
                          <span>{c}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Price & Inventory Summary */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 lg:gap-8">
                  {/* Price */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-brown/60 block">Price</span>
                    <span className="font-serif text-base font-bold text-brown">
                      {eur(p.price)}
                    </span>
                  </div>

                  {/* Quantity / Inventory */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-brown/60 block">Stock Qty</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-semibold text-brown">
                        {p.inventory !== undefined ? p.inventory : 50}
                      </span>
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          isOut
                            ? "bg-red-100 text-red-700"
                            : isLow
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {p.isDeleted ? (
                      <button
                        type="button"
                        onClick={() => handleRestore(p.slug, p.name)}
                        className="bg-emerald-800 text-white text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-xs hover:bg-emerald-900 transition-colors font-medium"
                      >
                        Restore Product
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingProduct({ ...p })}
                          className="bg-brown text-cream text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded-xs hover:bg-black transition-colors font-medium flex items-center gap-1.5 shadow-xs"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          <span>Edit Garment</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="border border-burgundy/30 text-burgundy text-[11px] uppercase tracking-wider px-2.5 py-1.5 rounded-xs hover:bg-burgundy hover:text-white transition-colors"
                          title="Delete / Archive product"
                        >
                          <Icon name="trash" className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* EDIT PRODUCT MODAL (Sizes, Colours, Quantity, Photos, Details)          */}
      {/* ========================================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-brown/20 w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 md:p-8 rounded shadow-2xl relative">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute top-5 right-5 text-brown/60 hover:text-brown text-2xl leading-none"
            >
              &times;
            </button>

            <div className="border-b border-brown/15 pb-4 mb-6">
              <span className="text-[10px] font-mono uppercase tracking-widest text-brown/50">
                Slug: {editingProduct.slug}
              </span>
              <h3 className="font-serif text-2xl text-brown font-bold mt-1">
                Edit Garment: {editingProduct.name}
              </h3>
            </div>

            <div className="space-y-6">
              {/* SECTION 1: Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Garment Title / Name
                  </label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full border border-brown/25 px-3 py-2 text-xs bg-cream/20 text-brown focus:border-brown focus:outline-none rounded-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Short Subtitle / Descriptor
                  </label>
                  <input
                    type="text"
                    value={editingProduct.descriptor}
                    onChange={(e) => setEditingProduct({ ...editingProduct, descriptor: e.target.value })}
                    className="w-full border border-brown/25 px-3 py-2 text-xs bg-cream/20 text-brown focus:border-brown focus:outline-none rounded-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Category
                  </label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full border border-brown/25 px-3 py-2 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Gender Cut
                  </label>
                  <select
                    value={editingProduct.gender}
                    onChange={(e) => setEditingProduct({ ...editingProduct, gender: e.target.value as any })}
                    className="w-full border border-brown/25 px-3 py-2 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs"
                  >
                    <option value="unisex">Unisex Silhouette</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                  </select>
                </div>
              </div>

              {/* SECTION 2: Pricing & Inventory Quantity */}
              <div className="bg-[#FAF7F2] p-4 border border-brown/15 rounded-xs">
                <h4 className="text-xs uppercase tracking-widest font-semibold text-brown mb-3">
                  Pricing & Stock Inventory
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-medium">
                      Selling Price (€)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                      className="w-full border border-brown/30 px-3 py-2 text-sm bg-white text-brown font-semibold focus:border-brown focus:outline-none rounded-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-medium">
                      Stock Quantity (Units)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingProduct.inventory !== undefined ? editingProduct.inventory : 50}
                      onChange={(e) => setEditingProduct({ ...editingProduct, inventory: Number(e.target.value) })}
                      className="w-full border border-brown/30 px-3 py-2 text-sm bg-white text-brown font-semibold focus:border-brown focus:outline-none rounded-xs font-mono"
                    />
                  </div>

                  {/* Stock Shortcuts */}
                  <div className="flex flex-col justify-end gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-brown/50">Quick Stock Presets:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            inventory: Math.max(0, (editingProduct.inventory || 0) + 10),
                          })
                        }
                        className="text-[10px] bg-white border border-brown/20 px-2 py-1 rounded hover:bg-sand/30"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, inventory: 0 })}
                        className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-100"
                      >
                        Out of Stock (0)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, inventory: 99 })}
                        className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100"
                      >
                        High Stock (99)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SIZES (Add, Remove, Custom) */}
              <div className="border border-brown/15 p-4 rounded-xs bg-white">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-brown font-semibold block">
                    Available Garment Sizes ({editingProduct.sizes?.length || 0})
                  </label>
                </div>

                {/* Current Sizes Chips */}
                <div className="flex flex-wrap items-center gap-2 mb-3 min-h-[36px] p-2 bg-[#FAF7F2] rounded border border-brown/10">
                  {editingProduct.sizes && editingProduct.sizes.length > 0 ? (
                    editingProduct.sizes.map((sz, idx) => (
                      <span
                        key={idx}
                        className="bg-brown text-cream text-xs px-2.5 py-1 rounded font-mono flex items-center gap-1.5 shadow-xs"
                      >
                        <span>{sz}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingProduct.sizes.filter((_, i) => i !== idx);
                            setEditingProduct({ ...editingProduct, sizes: updated });
                          }}
                          className="hover:text-gold text-sm leading-none"
                          title="Remove size"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-brown/50 italic">No sizes selected. Add sizes below.</span>
                  )}
                </div>

                {/* Quick Add Standards */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-[10px] uppercase text-brown/60 font-semibold mr-1">Quick Add:</span>
                  {STANDARD_SIZES.map((sz) => {
                    const alreadyHas = editingProduct.sizes?.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        disabled={alreadyHas}
                        onClick={() => {
                          const updated = [...(editingProduct.sizes || []), sz];
                          setEditingProduct({ ...editingProduct, sizes: updated });
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                          alreadyHas
                            ? "bg-sand/30 border-transparent text-brown/40 cursor-not-allowed"
                            : "bg-white border-brown/25 text-brown hover:bg-brown hover:text-cream"
                        }`}
                      >
                        + {sz}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Size Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSizeInput}
                    onChange={(e) => setNewSizeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSizeInput.trim()) {
                        e.preventDefault();
                        const sz = newSizeInput.trim().toUpperCase();
                        if (!editingProduct.sizes?.includes(sz)) {
                          setEditingProduct({
                            ...editingProduct,
                            sizes: [...(editingProduct.sizes || []), sz],
                          });
                        }
                        setNewSizeInput("");
                      }
                    }}
                    placeholder="Enter custom size (e.g. 38, 40, Petite)..."
                    className="border border-brown/25 px-3 py-1.5 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSizeInput.trim()) return;
                      const sz = newSizeInput.trim().toUpperCase();
                      if (!editingProduct.sizes?.includes(sz)) {
                        setEditingProduct({
                          ...editingProduct,
                          sizes: [...(editingProduct.sizes || []), sz],
                        });
                      }
                      setNewSizeInput("");
                    }}
                    className="bg-brown text-cream px-3 py-1.5 text-xs uppercase tracking-wider rounded-xs hover:bg-black font-medium"
                  >
                    Add Size
                  </button>
                </div>
              </div>

              {/* SECTION 4: COLOURS (Add, Remove, Custom) */}
              <div className="border border-brown/15 p-4 rounded-xs bg-white">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-widest text-brown font-semibold block">
                    Available Garment Colours ({editingProduct.colors?.length || 0})
                  </label>
                </div>

                {/* Current Colour Chips */}
                <div className="flex flex-wrap items-center gap-2 mb-3 min-h-[36px] p-2 bg-[#FAF7F2] rounded border border-brown/10">
                  {editingProduct.colors && editingProduct.colors.length > 0 ? (
                    editingProduct.colors.map((c, idx) => {
                      const hex = POPULAR_COLORS.find((pc) => pc.name.toLowerCase() === c.toLowerCase())?.hex || "#888";
                      return (
                        <span
                          key={idx}
                          className="bg-white border border-brown/25 text-brown text-xs px-2.5 py-1 rounded flex items-center gap-1.5 shadow-xs"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full inline-block border border-black/20"
                            style={{ backgroundColor: hex }}
                          />
                          <span className="font-medium">{c}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingProduct.colors.filter((_, i) => i !== idx);
                              setEditingProduct({ ...editingProduct, colors: updated });
                            }}
                            className="text-brown/40 hover:text-burgundy text-sm leading-none ml-0.5"
                            title="Remove color"
                          >
                            &times;
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-brown/50 italic">No colours selected. Add colours below.</span>
                  )}
                </div>

                {/* Quick Add Palette */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className="text-[10px] uppercase text-brown/60 font-semibold mr-1">Palette:</span>
                  {POPULAR_COLORS.map((pc) => {
                    const alreadyHas = editingProduct.colors?.some((c) => c.toLowerCase() === pc.name.toLowerCase());
                    return (
                      <button
                        key={pc.name}
                        type="button"
                        disabled={alreadyHas}
                        onClick={() => {
                          const updated = [...(editingProduct.colors || []), pc.name];
                          setEditingProduct({ ...editingProduct, colors: updated });
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                          alreadyHas
                            ? "bg-sand/30 border-transparent text-brown/40 cursor-not-allowed"
                            : "bg-white border-brown/25 text-brown hover:bg-brown hover:text-cream"
                        }`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full inline-block border border-black/20"
                          style={{ backgroundColor: pc.hex }}
                        />
                        <span>{pc.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Colour Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newColorInput}
                    onChange={(e) => setNewColorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newColorInput.trim()) {
                        e.preventDefault();
                        const colorName = newColorInput.trim();
                        if (!editingProduct.colors?.some((c) => c.toLowerCase() === colorName.toLowerCase())) {
                          setEditingProduct({
                            ...editingProduct,
                            colors: [...(editingProduct.colors || []), colorName],
                          });
                        }
                        setNewColorInput("");
                      }
                    }}
                    placeholder="Enter custom colour (e.g. Sage Green, Terracotta)..."
                    className="border border-brown/25 px-3 py-1.5 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newColorInput.trim()) return;
                      const colorName = newColorInput.trim();
                      if (!editingProduct.colors?.some((c) => c.toLowerCase() === colorName.toLowerCase())) {
                        setEditingProduct({
                          ...editingProduct,
                          colors: [...(editingProduct.colors || []), colorName],
                        });
                      }
                      setNewColorInput("");
                    }}
                    className="bg-brown text-cream px-3 py-1.5 text-xs uppercase tracking-wider rounded-xs hover:bg-black font-medium"
                  >
                    Add Colour
                  </button>
                </div>
              </div>

              {/* SECTION 5: PHOTOS & IMAGE GALLERY (Add, Delete, Reorder) */}
              <div className="border border-brown/15 p-4 rounded-xs bg-[#FAF7F2]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs uppercase tracking-widest font-semibold text-brown">
                      Product Photography ({editingProduct.images?.length || 0})
                    </h4>
                    <p className="text-[10px] text-brown/60">
                      Hover on any photo to remove it or set it as the primary cover photo.
                    </p>
                  </div>
                </div>

                {/* Current Photo Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {editingProduct.images?.map((imgUrl, i) => (
                    <div
                      key={i}
                      className="group relative aspect-[3/4] bg-sand/30 border border-brown/20 rounded-xs overflow-hidden shadow-xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />

                      {/* Cover Badge */}
                      {i === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-brown text-cream text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded shadow">
                          Cover
                        </span>
                      )}

                      {/* Action Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingProduct.images.filter((_, idx) => idx !== i);
                              setEditingProduct({ ...editingProduct, images: updated });
                              showToast("Photo removed from garment gallery.");
                            }}
                            className="bg-red-600 text-white p-1 rounded hover:bg-red-700"
                            title="Delete this image"
                          >
                            <Icon name="trash" className="h-3 w-3" />
                          </button>
                        </div>

                        {i !== 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [imgUrl, ...editingProduct.images.filter((_, idx) => idx !== i)];
                              setEditingProduct({ ...editingProduct, images: updated });
                              showToast("Set as primary cover photo.");
                            }}
                            className="bg-white/90 text-brown text-[9px] uppercase tracking-wider font-semibold py-1 rounded hover:bg-white text-center"
                          >
                            Set As Cover
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!editingProduct.images || editingProduct.images.length === 0) && (
                    <div className="col-span-full py-6 text-center text-xs text-brown/50 italic bg-white border border-dashed border-brown/20 rounded">
                      No photos attached. Upload or select photos below.
                    </div>
                  )}
                </div>

                {/* Add Photo Controls */}
                <div className="space-y-3 pt-3 border-t border-brown/15 bg-white p-3 rounded-xs">
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* PC / Phone Upload */}
                    <div className="flex-1">
                      <ImageUploader
                        compact
                        buttonText="Upload Photo from PC / Phone"
                        helperText="JPG, PNG, WebP"
                        onUploaded={(url) => {
                          const updated = [...(editingProduct.images || []), url];
                          setEditingProduct({ ...editingProduct, images: updated });
                          showToast("Photo uploaded and added to garment gallery!");
                          fetchUploadedMedia();
                        }}
                      />
                    </div>

                    {/* Pick from Media Library */}
                    <button
                      type="button"
                      onClick={() => setMediaPickerOpen(!mediaPickerOpen)}
                      className="border border-brown/30 bg-white px-3 py-2 text-xs uppercase tracking-wider text-brown hover:bg-sand/30 transition-colors rounded-xs flex items-center justify-center gap-1.5"
                    >
                      <Icon name="image" className="h-3.5 w-3.5" />
                      <span>{mediaPickerOpen ? "Hide Library" : "From Photo Library"}</span>
                    </button>
                  </div>

                  {/* Direct URL input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="Or paste direct image URL (e.g. /images/hero.jpg)..."
                      className="border border-brown/25 px-3 py-1.5 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customImageUrl.trim()) return;
                        const updated = [...(editingProduct.images || []), customImageUrl.trim()];
                        setEditingProduct({ ...editingProduct, images: updated });
                        setCustomImageUrl("");
                        showToast("Photo added to garment gallery!");
                      }}
                      className="bg-brown text-cream px-3 py-1.5 text-xs uppercase tracking-wider rounded-xs hover:bg-black font-medium"
                    >
                      Add URL
                    </button>
                  </div>

                  {/* Media Library Picker Drawer */}
                  {mediaPickerOpen && (
                    <div className="border border-brown/15 p-2 bg-[#FAF7F2] rounded mt-2 max-h-48 overflow-y-auto">
                      <span className="text-[10px] uppercase font-bold text-brown/60 block mb-2">
                        Select photo to attach ({allGalleryImages.length} available):
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {allGalleryImages.map((img) => (
                          <div
                            key={img.url}
                            onClick={() => {
                              if (!editingProduct.images?.includes(img.url)) {
                                setEditingProduct({
                                  ...editingProduct,
                                  images: [...(editingProduct.images || []), img.url],
                                });
                                showToast(`Attached ${img.label} to product!`);
                              }
                            }}
                            className="cursor-pointer aspect-square bg-cover bg-center rounded border border-brown/20 hover:border-brown hover:scale-105 transition-all"
                            style={{ backgroundImage: `url(${img.url})` }}
                            title={img.label}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 6: Description & Fabric Composition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Fabric & Material Care
                  </label>
                  <textarea
                    rows={2}
                    value={editingProduct.material}
                    onChange={(e) => setEditingProduct({ ...editingProduct, material: e.target.value })}
                    className="w-full border border-brown/25 px-3 py-2 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs"
                    placeholder="e.g. 100% organic cotton, 220 gsm..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Full Garment Description
                  </label>
                  <textarea
                    rows={2}
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full border border-brown/25 px-3 py-2 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs"
                    placeholder="Editorial product storytelling..."
                  />
                </div>
              </div>

              {/* SECTION 7: Merchandising Badges & Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-sand/20 rounded-xs border border-brown/15">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] uppercase tracking-wider text-brown font-semibold">
                    Promotional Badge:
                  </label>
                  <select
                    value={editingProduct.badge || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                    className="border border-brown/25 px-2 py-1 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs"
                  >
                    <option value="">(None)</option>
                    <option value="NEW">NEW</option>
                    <option value="SPRING 26">SPRING 26</option>
                    <option value="HERITAGE">HERITAGE</option>
                    <option value="LIMITED">LIMITED</option>
                    <option value="SALE -20%">SALE -20%</option>
                    <option value="ARCHIVE">ARCHIVE</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-brown">
                    <input
                      type="checkbox"
                      checked={editingProduct.featured}
                      onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                      className="rounded accent-brown"
                    />
                    <span>★ Featured on Homepage</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-brown">
                    <input
                      type="checkbox"
                      checked={editingProduct.newArrival}
                      onChange={(e) => setEditingProduct({ ...editingProduct, newArrival: e.target.checked })}
                      className="rounded accent-brown"
                    />
                    <span>New Arrival</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-8 pt-4 border-t border-brown/15 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setProductToDelete(editingProduct);
                  setEditingProduct(null);
                }}
                className="text-burgundy hover:text-red-700 text-xs uppercase tracking-wider font-semibold underline"
              >
                Delete this Garment
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="border border-brown/25 px-4 py-2 text-xs uppercase tracking-wider text-brown/70 hover:bg-sand/30 rounded-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveEdit}
                  className="bg-brown text-cream px-6 py-2 text-xs uppercase tracking-widest hover:bg-black transition-colors font-medium rounded-xs shadow-sm"
                >
                  {isSaving ? "Saving..." : "Save Garment Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD NEW PRODUCT MODAL                                                     */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-brown/20 w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 md:p-8 rounded shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-brown/60 hover:text-brown text-2xl leading-none"
            >
              &times;
            </button>

            <div className="border-b border-brown/15 pb-4 mb-6">
              <h3 className="font-serif text-2xl text-brown font-bold">
                Add New Garment to Collection
              </h3>
              <p className="text-xs text-brown/60 mt-1">
                Create a bespoke garment with tailored sizes, colours, stock count, and photography.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Garment Name *
                  </label>
                  <input
                    type="text"
                    value={newProductForm.name}
                    onChange={(e) => handleNewNameChange(e.target.value)}
                    placeholder="e.g. YUPEK Silk Kimono"
                    className="w-full border border-brown/30 px-3 py-2 text-xs bg-cream/20 text-brown focus:border-brown focus:outline-none rounded-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Product URL Slug *
                  </label>
                  <input
                    type="text"
                    value={newProductForm.slug}
                    onChange={(e) => setNewProductForm({ ...newProductForm, slug: e.target.value })}
                    placeholder="e.g. yupek-silk-kimono"
                    className="w-full border border-brown/30 px-3 py-2 text-xs bg-cream/20 text-brown focus:border-brown focus:outline-none rounded-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Subtitle / Descriptor
                  </label>
                  <input
                    type="text"
                    value={newProductForm.descriptor}
                    onChange={(e) => setNewProductForm({ ...newProductForm, descriptor: e.target.value })}
                    placeholder="e.g. Relaxed architectural drape"
                    className="w-full border border-brown/25 px-3 py-2 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Category
                  </label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                    className="w-full border border-brown/25 px-3 py-2 text-xs bg-white text-brown focus:border-brown focus:outline-none rounded-xs"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Selling Price (€) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm({ ...newProductForm, price: Number(e.target.value) })}
                    className="w-full border border-brown/30 px-3 py-2 text-sm bg-white text-brown font-bold focus:border-brown focus:outline-none rounded-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Initial Stock Inventory (Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProductForm.inventory}
                    onChange={(e) => setNewProductForm({ ...newProductForm, inventory: Number(e.target.value) })}
                    className="w-full border border-brown/30 px-3 py-2 text-sm bg-white text-brown font-semibold focus:border-brown focus:outline-none rounded-xs font-mono"
                  />
                </div>
              </div>

              {/* Sizes & Colours Quick Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-[#FAF7F2] rounded-xs border border-brown/15">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Sizes ({newProductForm.sizes.join(", ")})
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {["XS", "S", "M", "L", "XL", "XXL", "ONE SIZE"].map((sz) => {
                      const active = newProductForm.sizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            const updated = active
                              ? newProductForm.sizes.filter((s) => s !== sz)
                              : [...newProductForm.sizes, sz];
                            setNewProductForm({ ...newProductForm, sizes: updated });
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            active ? "bg-brown text-cream border-brown" : "bg-white text-brown/60 border-brown/20"
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                    Colours ({newProductForm.colors.join(", ")})
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {["Black", "Sand", "Burgundy", "Ivory", "Charcoal", "Indigo", "Olive"].map((c) => {
                      const active = newProductForm.colors.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            const updated = active
                              ? newProductForm.colors.filter((item) => item !== c)
                              : [...newProductForm.colors, c];
                            setNewProductForm({ ...newProductForm, colors: updated });
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            active ? "bg-brown text-cream border-brown" : "bg-white text-brown/60 border-brown/20"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold">
                  Garment Photography
                </label>
                <div className="flex items-center gap-3">
                  <ImageUploader
                    compact
                    buttonText="Upload Cover Photo from PC / Phone"
                    onUploaded={(url) => {
                      setNewProductForm((prev) => ({
                        ...prev,
                        images: [...prev.images, url],
                      }));
                      showToast("Photo uploaded!");
                      fetchUploadedMedia();
                    }}
                  />
                  {newProductForm.images.length > 0 && (
                    <span className="text-xs text-emerald-800 font-medium">
                      ✓ {newProductForm.images.length} photo(s) attached
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-brown/15 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="border border-brown/25 px-4 py-2 text-xs uppercase tracking-wider text-brown/70 hover:bg-sand/30 rounded-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCreateProduct}
                className="bg-brown text-cream px-6 py-2 text-xs uppercase tracking-widest hover:bg-black transition-colors font-medium rounded-xs shadow-sm"
              >
                {isSaving ? "Creating..." : "Create & Publish Garment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG                                                */}
      {/* ========================================================================= */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-brown/20 w-full max-w-md p-6 rounded shadow-2xl text-center">
            <div className="h-12 w-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="trash" className="h-6 w-6" />
            </div>

            <h3 className="font-serif text-xl text-brown font-bold mb-2">
              Remove &ldquo;{productToDelete.name}&rdquo;?
            </h3>
            <p className="text-xs text-brown/60 leading-relaxed mb-6">
              This garment will be immediately hidden from the live storefront, shop catalog, and search. You can restore it anytime from the &ldquo;Archived&rdquo; tab.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="border border-brown/25 px-4 py-2 text-xs uppercase tracking-wider text-brown/70 hover:bg-sand/30 rounded-xs"
              >
                Keep Product
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-red-700 text-white px-5 py-2 text-xs uppercase tracking-wider hover:bg-red-800 rounded-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
