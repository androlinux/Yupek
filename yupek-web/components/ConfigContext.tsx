"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { SiteConfig, defaultSiteConfig, getLocalSiteConfig, saveLocalSiteConfig, ProductOverride, ContactSubmission, StoreOrder } from "@/lib/siteConfig";
import { products as baseProducts, Product } from "@/data/products";

interface ConfigContextType {
  config: SiteConfig;
  updateConfig: (partial: Partial<SiteConfig>) => Promise<{ success: boolean; config?: SiteConfig; error?: string }>;
  updateProductOverride: (slug: string, override: ProductOverride) => Promise<{ success: boolean }>;
  addProduct: (product: Product) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (slug: string) => Promise<{ success: boolean }>;
  restoreProduct: (slug: string) => Promise<{ success: boolean }>;
  resetToDefaults: () => void;
  submitContact: (form: { name: string; email: string; phone?: string; subject?: string; message: string }) => Promise<{ success: boolean; error?: string }>;
  markSubmissionRead: (id: string) => void;
  deleteSubmission: (id: string) => void;
  addStoreOrder: (order: StoreOrder) => void;
  updateOrderStatus: (orderId: string, status: StoreOrder["status"]) => void;
  allProducts: Product[];
  catalogProducts: (Product & { isDeleted?: boolean })[];
  getProduct: (slug: string) => Product | undefined;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

function getAdminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem("yupek_admin_auth") === "true") {
        headers["x-yupek-admin-auth"] = "true";
      }
    } catch {}
  }
  return headers;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultSiteConfig);

  // Initialize config
  useEffect(() => {
    // 1. Read local storage immediately
    const initial = getLocalSiteConfig();
    setConfig(initial);

    // 2. Fetch from API route to sync with persistent Supabase storage
    fetch("/api/site-config", {
      headers: getAdminHeaders(),
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((serverData) => {
        if (serverData && !serverData.error) {
          setConfig((prev) => {
            const merged: SiteConfig = {
              ...defaultSiteConfig,
              ...prev,
              ...serverData,
              productOverrides: {
                ...(defaultSiteConfig.productOverrides || {}),
                ...(prev.productOverrides || {}),
                ...(serverData.productOverrides || {}),
              },
              customProducts: serverData.customProducts || prev.customProducts || [],
              storeOrders: serverData.storeOrders || prev.storeOrders || [],
              contactSubmissions: serverData.contactSubmissions || prev.contactSubmissions || [],
            };
            try {
              localStorage.setItem("yupek_site_config_v1", JSON.stringify({ ...merged, updatedAt: new Date().toISOString() }));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {
        // fallback to local
      });

    // 3. Listen to cross-tab / window config updates
    const handleConfigChange = (e: Event) => {
      const customEvent = e as CustomEvent<SiteConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      }
    };

    window.addEventListener("yupek_config_changed", handleConfigChange);
    return () => window.removeEventListener("yupek_config_changed", handleConfigChange);
  }, []);

  const updateConfig = useCallback(async (partial: Partial<SiteConfig>): Promise<{ success: boolean; config?: SiteConfig; error?: string }> => {
    const current = getLocalSiteConfig();
    const nextConfig: SiteConfig = {
      ...current,
      ...partial,
      productOverrides: {
        ...(current.productOverrides || {}),
        ...(partial.productOverrides || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    setConfig(nextConfig);
    saveLocalSiteConfig(nextConfig);

    // Also persist to server Supabase storage
    try {
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify(partial),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Server failed to save");
      }
      if (data.config) {
        saveLocalSiteConfig(data.config);
        setConfig(data.config);
        return { success: true, config: data.config };
      }
      return { success: true, config: nextConfig };
    } catch (err: unknown) {
      console.error("[ConfigContext updateConfig error]:", err);
      const msg = err instanceof Error ? err.message : "Failed to persist to database";
      return { success: false, error: msg };
    }
  }, []);

  const updateProductOverride = useCallback(async (slug: string, override: ProductOverride): Promise<{ success: boolean }> => {
    const current = getLocalSiteConfig();
    const updatedOverrides = {
      ...(current.productOverrides || {}),
      [slug]: {
        ...(current.productOverrides?.[slug] || {}),
        ...override,
      },
    };
    const nextConfig: SiteConfig = {
      ...current,
      productOverrides: updatedOverrides,
      updatedAt: new Date().toISOString(),
    };

    setConfig(nextConfig);
    saveLocalSiteConfig(nextConfig);

    // Async push to server Supabase storage
    try {
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ productOverrides: { [slug]: override } }),
      });
      const data = await res.json();
      if (data.ok && data.config) {
        saveLocalSiteConfig(data.config);
        setConfig(data.config);
      }
      return { success: true };
    } catch (err: unknown) {
      console.error("[updateProductOverride error]:", err);
      return { success: false };
    }
  }, []);

  const resetToDefaults = useCallback(async () => {
    setConfig(defaultSiteConfig);
    saveLocalSiteConfig(defaultSiteConfig);
    try {
      await fetch("/api/site-config", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ ...defaultSiteConfig, _reset: true }),
      });
    } catch {}
  }, []);

  const submitContact = useCallback(async (form: { name: string; email: string; phone?: string; subject?: string; message: string }) => {
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return { success: false, error: data.error || "Failed to submit" };
      }

      const newSub: ContactSubmission = data.submission || {
        id: `sub-${Date.now()}`,
        ...form,
        subject: form.subject || "General Inquiry",
        createdAt: new Date().toISOString(),
        read: false,
      };

      setConfig((prev) => {
        const next = {
          ...prev,
          contactSubmissions: [newSub, ...(prev.contactSubmissions || [])],
        };
        saveLocalSiteConfig(next);
        return next;
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      return { success: false, error: msg };
    }
  }, []);

  const markSubmissionRead = useCallback((id: string) => {
    const current = getLocalSiteConfig();
    const updated = (current.contactSubmissions || []).map((s) =>
      s.id === id ? { ...s, read: true } : s
    );
    const next = { ...current, contactSubmissions: updated };
    setConfig(next);
    saveLocalSiteConfig(next);

    fetch("/api/site-config", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ contactSubmissions: updated }),
    }).catch(() => {});
  }, []);

  const deleteSubmission = useCallback((id: string) => {
    const current = getLocalSiteConfig();
    const updated = (current.contactSubmissions || []).filter((s) => s.id !== id);
    const next = { ...current, contactSubmissions: updated };
    setConfig(next);
    saveLocalSiteConfig(next);

    fetch("/api/site-config", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ contactSubmissions: updated }),
    }).catch(() => {});
  }, []);

  // Combine base products + custom products and apply dynamic overrides
  const catalogProducts = useMemo(() => {
    const custom = config.customProducts || [];
    const combined = [...baseProducts, ...custom];

    return combined.map((p) => {
      const override = config.productOverrides?.[p.slug];
      if (!override) return { ...p, isDeleted: false };

      return {
        ...p,
        name: override.name ?? p.name,
        descriptor: override.descriptor ?? p.descriptor,
        price: override.price ?? p.price,
        badge: override.badge !== undefined ? override.badge : p.badge,
        featured: override.featured ?? p.featured,
        newArrival: override.newArrival ?? p.newArrival,
        category: (override.category as any) ?? p.category,
        gender: (override.gender as any) ?? p.gender,
        sizes: override.sizes && override.sizes.length > 0 ? override.sizes : p.sizes,
        colors: override.colors && override.colors.length > 0 ? override.colors : p.colors,
        description: override.description ?? p.description,
        material: override.material ?? p.material,
        inventory: override.inventory !== undefined ? override.inventory : p.inventory,
        images: override.images && override.images.length > 0 ? override.images : p.images,
        isDeleted: Boolean(override.deleted),
      };
    });
  }, [config.productOverrides, config.customProducts]);

  // Active storefront products (excluding deleted ones)
  const allProducts = useMemo(() => {
    return catalogProducts.filter((p) => !p.isDeleted);
  }, [catalogProducts]);

  const getProduct = useCallback(
    (slug: string) => {
      return allProducts.find((p) => p.slug === slug) || catalogProducts.find((p) => p.slug === slug);
    },
    [allProducts, catalogProducts]
  );

  const addProduct = useCallback(async (product: Product): Promise<{ success: boolean; error?: string }> => {
    const current = getLocalSiteConfig();
    const existing = (current.customProducts || []).some((p) => p.slug === product.slug) ||
      baseProducts.some((p) => p.slug === product.slug);

    if (existing) {
      return { success: false, error: `A garment with slug "${product.slug}" already exists.` };
    }

    const nextCustom = [...(current.customProducts || []), product];
    const nextConfig: SiteConfig = {
      ...current,
      customProducts: nextCustom,
      updatedAt: new Date().toISOString(),
    };

    setConfig(nextConfig);
    saveLocalSiteConfig(nextConfig);

    try {
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ customProducts: nextCustom }),
      });
      const data = await res.json();
      if (data.config) {
        saveLocalSiteConfig(data.config);
        setConfig(data.config);
      }
      return { success: true };
    } catch (err: unknown) {
      console.error("[addProduct error]:", err);
      return { success: false, error: "Failed to persist new product" };
    }
  }, []);

  const deleteProduct = useCallback(async (slug: string): Promise<{ success: boolean }> => {
    return updateProductOverride(slug, { deleted: true });
  }, [updateProductOverride]);

  const restoreProduct = useCallback(async (slug: string): Promise<{ success: boolean }> => {
    return updateProductOverride(slug, { deleted: false });
  }, [updateProductOverride]);

  const addStoreOrder = useCallback((order: StoreOrder) => {
    const current = getLocalSiteConfig();
    const updated = [order, ...(current.storeOrders || [])];
    const next = { ...current, storeOrders: updated };
    setConfig(next);
    saveLocalSiteConfig(next);

    fetch("/api/site-config", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ storeOrders: updated }),
    }).catch(() => {});
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: StoreOrder["status"]) => {
    const current = getLocalSiteConfig();
    const updated = (current.storeOrders || []).map((o) =>
      o.id === orderId ? { ...o, status } : o
    );
    const next = { ...current, storeOrders: updated };
    setConfig(next);
    saveLocalSiteConfig(next);

    fetch("/api/site-config", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ storeOrders: updated }),
    }).catch(() => {});
  }, []);

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateConfig,
        updateProductOverride,
        addProduct,
        deleteProduct,
        restoreProduct,
        resetToDefaults,
        submitContact,
        markSubmissionRead,
        deleteSubmission,
        addStoreOrder,
        updateOrderStatus,
        allProducts,
        catalogProducts,
        getProduct,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useSiteConfig must be used within a ConfigProvider");
  }
  return context;
}
