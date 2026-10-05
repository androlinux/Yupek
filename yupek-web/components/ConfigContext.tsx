"use client";
import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { SiteConfig, defaultSiteConfig, getLocalSiteConfig, saveLocalSiteConfig, ProductOverride, ContactSubmission, StoreOrder } from "@/lib/siteConfig";
import { products as baseProducts, Product } from "@/data/products";

interface ConfigContextType {
  config: SiteConfig;
  updateConfig: (partial: Partial<SiteConfig>) => Promise<{ success: boolean; config?: SiteConfig; error?: string }>;
  updateProductOverride: (slug: string, override: ProductOverride) => Promise<{ success: boolean }>;
  resetToDefaults: () => void;
  submitContact: (form: { name: string; email: string; phone?: string; subject?: string; message: string }) => Promise<{ success: boolean; error?: string }>;
  markSubmissionRead: (id: string) => void;
  deleteSubmission: (id: string) => void;
  addStoreOrder: (order: StoreOrder) => void;
  updateOrderStatus: (orderId: string, status: StoreOrder["status"]) => void;
  allProducts: Product[];
  getProduct: (slug: string) => Product | undefined;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultSiteConfig);

  // Initialize config
  useEffect(() => {
    // 1. Read local storage immediately
    const initial = getLocalSiteConfig();
    setConfig(initial);

    // 2. Fetch from API route to sync with persistent disk storage
    fetch("/api/site-config")
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

    // Also persist to server disk storage
    try {
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const msg = err instanceof Error ? err.message : "Failed to persist to disk";
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

    // Async push to server disk storage
    try {
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactSubmissions: updated }),
    }).catch(() => {});
  }, []);

  // Merge base products with any dynamic overrides from admin
  const allProducts = useMemo(() => {
    return baseProducts.map((p) => {
      const override = config.productOverrides[p.slug];
      if (!override) return p;

      return {
        ...p,
        name: override.name ?? p.name,
        descriptor: override.descriptor ?? p.descriptor,
        price: override.price ?? p.price,
        badge: override.badge !== undefined ? override.badge : p.badge,
        featured: override.featured ?? p.featured,
        newArrival: override.newArrival ?? p.newArrival,
        images: override.images && override.images.length > 0 ? override.images : p.images,
      };
    });
  }, [config.productOverrides]);

  const getProduct = useCallback(
    (slug: string) => {
      return allProducts.find((p) => p.slug === slug);
    },
    [allProducts]
  );

  const addStoreOrder = useCallback((order: StoreOrder) => {
    const current = getLocalSiteConfig();
    const updated = [order, ...(current.storeOrders || [])];
    const next = { ...current, storeOrders: updated };
    setConfig(next);
    saveLocalSiteConfig(next);

    fetch("/api/site-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeOrders: updated }),
    }).catch(() => {});
  }, []);

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateConfig,
        updateProductOverride,
        resetToDefaults,
        submitContact,
        markSubmissionRead,
        deleteSubmission,
        addStoreOrder,
        updateOrderStatus,
        allProducts,
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
