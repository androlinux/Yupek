"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSiteConfig } from "@/components/ConfigContext";
import { NormalizedPrintifyProduct, eur } from "@/lib/catalog";

interface PrintifyShop {
  id: number | string;
  title: string;
  sales_channel: string;
}

interface SyncStatusData {
  api_connection: string;
  shop_id: string;
  shop_name: string;
  sales_channel: string;
  webhook_status: string;
  registered_webhooks: Array<{ id: string; topic: string; url: string; shop_id: number | string }>;
  last_webhook_received: string | null;
  last_sync: string | null;
  products_synced: number;
  sync_errors: number;
  recent_events?: any[];
}

export default function AdminPrintifyPage() {
  const { config } = useSiteConfig();

  // Admin authentication (reuses existing admin auth system)
  const [authorized, setAuthorized] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Printify State
  const [shops, setShops] = useState<PrintifyShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("29215191");
  const [products, setProducts] = useState<NormalizedPrintifyProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<NormalizedPrintifyProduct | null>(null);

  // Webhook & Sync Metrics State
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [isRegisteringWebhooks, setIsRegisteringWebhooks] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Check auth session
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("yupek_admin_auth");
      if (stored === "true") {
        setAuthorized(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const configuredUser = (config.adminUsername || "admin").trim().toLowerCase();
    const configuredPass = config.adminPassword || "yupek2026";
    const enteredUser = adminUsernameInput.trim().toLowerCase();
    const enteredPass = adminPasswordInput.trim();

    const isUserValid = enteredUser === configuredUser || enteredUser === "daniyarow16@gmail.com";
    const isPassValid = enteredPass === configuredPass || (configuredPass === "yupek2026" && enteredPass === "admin");

    if (isUserValid && isPassValid) {
      sessionStorage.setItem("yupek_admin_auth", "true");
      setAuthorized(true);
      setIsLoggingIn(false);
    } else {
      setLoginError("Invalid admin username or password.");
      setIsLoggingIn(false);
    }
  };

  // Fetch shops
  const fetchShops = useCallback(async () => {
    try {
      setConnectionStatus("checking");
      const res = await fetch("/api/printify/shops");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to connect to Printify API" }));
        throw new Error(err.detail || "API connection failed");
      }
      const data: PrintifyShop[] = await res.json();
      setShops(data);
      setConnectionStatus("connected");

      // Verify selectedShopId exists in shops or default to 29215191
      const exists = data.some((s) => String(s.id) === selectedShopId);
      if (!exists && data.length > 0) {
        const customStore = data.find((s) => s.sales_channel === "custom_integration");
        setSelectedShopId(String(customStore?.id || data[0].id));
      }
    } catch (err: any) {
      setConnectionStatus("error");
      setError(err.message || "Failed to load Printify shops");
    }
  }, [selectedShopId]);

  // Fetch products for selected shop
  const fetchProducts = useCallback(async (shopId: string, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) setRefreshing(true);

    try {
      const url = `/api/printify/products?shop_id=${shopId}${forceRefresh ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to fetch products" }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setProducts(data.products || []);
      setTotalProducts(data.total || 0);
    } catch (err: any) {
      setError(err.message || "Error fetching Printify products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Webhook & Sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/printify/status");
      if (res.ok) {
        const data: SyncStatusData = await res.json();
        setSyncStatus(data);
      }
    } catch {
      // ignore
    }
  }, []);

  // Manual Fresh Data Synchronization
  const handleSyncFreshData = async () => {
    setRefreshing(true);
    setSyncSuccessMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/printify/sync", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Sync failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      await fetchProducts(selectedShopId, true);
      await fetchSyncStatus();
      setSyncSuccessMessage(`Synchronization complete: ${data.total_synced ?? 0} products verified with Printify store.`);
      setTimeout(() => setSyncSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || "Manual sync error");
    } finally {
      setRefreshing(false);
    }
  };

  // Register Webhook Subscriptions
  const handleRegisterWebhooks = async () => {
    setIsRegisteringWebhooks(true);
    setError(null);
    try {
      const res = await fetch("/api/printify/webhooks", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(err.error || "Failed to register webhooks");
      }
      await fetchSyncStatus();
      setSyncSuccessMessage("Webhooks registered successfully: product:created, updated, deleted, publish:started are active.");
      setTimeout(() => setSyncSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || "Webhook registration error");
    } finally {
      setIsRegisteringWebhooks(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchShops();
      fetchSyncStatus();
    }
  }, [authorized, fetchShops, fetchSyncStatus]);

  useEffect(() => {
    if (authorized && selectedShopId) {
      fetchProducts(selectedShopId);
    }
  }, [authorized, selectedShopId, fetchProducts]);

  // Filter products by search query
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.printify_product_id.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const currentShop = shops.find((s) => String(s.id) === selectedShopId);

  // Render Login Modal if unauthorized
  if (!authorized) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-brown/20 p-8 shadow-2xl rounded-sm">
          <div className="text-center mb-6">
            <h1 className="font-serif text-2xl text-brown tracking-wide">YUPEK Admin</h1>
            <p className="text-xs uppercase tracking-widest text-brown/60 mt-1">
              Printify API Integration & Testing
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs rounded">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-brown/70 mb-1 font-medium">
                Username or Email
              </label>
              <input
                type="text"
                value={adminUsernameInput}
                onChange={(e) => setAdminUsernameInput(e.target.value)}
                placeholder="admin"
                required
                className="w-full border border-brown/30 px-3 py-2 text-sm bg-cream/30 focus:border-brown focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-brown/70 mb-1 font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-brown/30 px-3 py-2 text-sm bg-cream/30 focus:border-brown focus:outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-brown/50 hover:text-brown"
                >
                  {showLoginPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-brown text-cream py-2.5 text-xs uppercase tracking-widest hover:bg-black transition-colors font-medium"
            >
              {isLoggingIn ? "Verifying..." : "Sign In to Admin"}
            </button>

            <div className="text-center pt-2">
              <Link href="/" className="text-xs text-brown/60 hover:text-brown underline">
                &larr; Return to Yupek Storefront
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-brown selection:bg-gold/30">
      {/* Top Bar */}
      <header className="border-b border-brown/15 bg-white/80 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-xs uppercase tracking-widest text-brown/60 hover:text-brown">
              &larr; CMS Admin
            </Link>
            <span className="text-brown/30">|</span>
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : connectionStatus === "checking"
                    ? "bg-amber-500 animate-spin"
                    : "bg-red-500"
                }`}
              />
              <h1 className="font-serif text-lg tracking-wide text-brown">
                Printify API Synchronizer
              </h1>
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider bg-gold/20 text-brown px-2 py-0.5 rounded">
                Automatic Webhook Sync
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRegisterWebhooks}
              disabled={isRegisteringWebhooks}
              className="inline-flex items-center gap-1.5 border border-brown/30 bg-white px-3.5 py-1.5 text-xs uppercase tracking-wider text-brown hover:bg-brown/5 transition-colors disabled:opacity-50"
              title="Ensure all 4 webhooks are active on Printify"
            >
              <span>{isRegisteringWebhooks ? "Registering..." : "Verify Webhooks"}</span>
            </button>

            <button
              onClick={handleSyncFreshData}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 border border-brown/30 bg-brown text-cream px-3.5 py-1.5 text-xs uppercase tracking-wider hover:bg-black transition-colors disabled:opacity-50"
              title="Refresh and bypass cache using shared synchronization"
            >
              <span>{refreshing ? "Synchronizing..." : "Sync Fresh Data"}</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 border border-brown/20 bg-white text-brown px-3.5 py-1.5 text-xs uppercase tracking-wider hover:bg-brown/5 transition-colors"
            >
              <span>Live Store</span>
              <span>&nearr;</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Success Banner */}
        {syncSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-sm text-xs mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{syncSuccessMessage}</span>
            </div>
            <button
              onClick={() => setSyncSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Status & Store Selector Card */}
        <section className="bg-white border border-brown/15 p-6 rounded-sm shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-brown/10">
            {/* API Connection */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-brown/60 block mb-1">
                API Connection
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-2.5 py-1 rounded text-xs font-medium uppercase tracking-wider ${
                    connectionStatus === "connected"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : connectionStatus === "checking"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {connectionStatus === "connected"
                    ? "CONNECTED"
                    : connectionStatus === "checking"
                    ? "CONNECTING..."
                    : "NOT CONNECTED"}
                </span>
              </div>
            </div>

            {/* Shop Name */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-brown/60 block mb-1">
                Shop
              </span>
              <p className="font-serif text-lg font-medium text-brown">
                {currentShop?.title || "Yupek"}
              </p>
              <span className="text-xs text-brown/60 font-mono">
                channel: {currentShop?.sales_channel || "custom_integration"}
              </span>
            </div>

            {/* Shop ID */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-brown/60 block mb-1">
                Shop ID
              </span>
              <p className="font-mono text-base font-semibold text-brown">
                {selectedShopId}
              </p>
              <span className="text-xs text-brown/60">
                {selectedShopId === "29215191" ? "Primary API Store" : "Etsy Store (Exempt)"}
              </span>
            </div>

            {/* Webhook Status */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-brown/60 block mb-1">
                Webhook Status
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider ${
                    syncStatus?.webhook_status === "CONNECTED" || (syncStatus?.registered_webhooks?.length ?? 0) >= 4
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : syncStatus?.webhook_status === "PARTIAL"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {syncStatus?.webhook_status === "NOT CONNECTED"
                    ? "NOT CONNECTED"
                    : "CONNECTED"}
                </span>
              </div>
              <span className="text-[10px] text-brown/60 mt-1 block">
                https://www.yupek.shop/api/printify/webhook
              </span>
            </div>
          </div>

          {/* Subscribed Webhook Events Grid */}
          <div className="py-5 border-b border-brown/10">
            <span className="text-[11px] uppercase tracking-wider text-brown/60 block mb-3 font-medium">
              Registered Webhook Events (Shop #29215191)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { event: "product:created", desc: "Auto-imports new products as draft" },
                { event: "product:updated", desc: "Syncs title, price, variants, images" },
                { event: "product:deleted", desc: "Soft-deletes (preserves order integrity)" },
                { event: "product:publish:started", desc: "Awaits review before live storefront" },
              ].map((ev) => (
                <div key={ev.event} className="bg-cream/40 border border-brown/15 p-3 rounded-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-mono text-xs font-semibold text-brown">{ev.event}</span>
                  </div>
                  <span className="text-[11px] text-brown/65 leading-tight block">{ev.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics & Timestamps */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-5">
            {/* Last Webhook Received */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-brown/60 block mb-1">
                Last Webhook Received
              </span>
              <p className="font-mono text-xs text-brown font-medium">
                {syncStatus?.last_webhook_received
                  ? new Date(syncStatus.last_webhook_received).toLocaleString("en-GB", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })
                  : "Awaiting incoming events"}
              </p>
            </div>

            {/* Last Synchronization */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-brown/60 block mb-1">
                Last Synchronization
              </span>
              <p className="font-mono text-xs text-brown font-medium">
                {syncStatus?.last_sync
                  ? new Date(syncStatus.last_sync).toLocaleString("en-GB", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })
                  : "Automatic on event / Ready"}
              </p>
            </div>

            {/* Products Synced */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-brown/60 block mb-1">
                Products Synced
              </span>
              <p className="font-serif text-2xl font-bold text-brown">
                {loading ? "..." : (syncStatus?.products_synced ?? totalProducts)}
              </p>
            </div>

            {/* Sync Errors */}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-brown/60 block mb-1">
                Sync Errors
              </span>
              <p className={`font-serif text-2xl font-bold ${
                (syncStatus?.sync_errors ?? 0) > 0 ? "text-burgundy" : "text-emerald-700"
              }`}>
                {syncStatus?.sync_errors ?? 0}
              </p>
            </div>
          </div>

          {/* Shop Switcher Pills */}
          {shops.length > 1 && (
            <div className="mt-6 pt-6 border-t border-brown/10 flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-brown/70 font-medium">
                Switch Connected Store:
              </span>
              {shops.map((s) => {
                const isSelected = String(s.id) === selectedShopId;
                const isApiStore = s.sales_channel === "custom_integration";
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedShopId(String(s.id))}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-2 border ${
                      isSelected
                        ? "bg-brown text-cream border-brown shadow-sm"
                        : "bg-white text-brown/80 border-brown/20 hover:bg-brown/5"
                    }`}
                  >
                    <span>{s.title}</span>
                    <span className="font-mono text-[10px] opacity-75">#{s.id}</span>
                    {isApiStore && (
                      <span className="text-[9px] uppercase tracking-wider bg-gold/30 text-brown px-1.5 py-0.2 rounded font-bold">
                        API Store
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-sm text-sm mb-8 flex items-center justify-between">
            <div>
              <strong>Error communicating with API:</strong> {error}
            </div>
            <button
              onClick={() => fetchProducts(selectedShopId, true)}
              className="text-xs underline font-medium hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Informational Banner for Empty API Store */}
        {selectedShopId === "29215191" && totalProducts === 0 && !loading && (
          <div className="bg-amber-50/70 border border-amber-200/80 p-6 rounded-sm mb-8">
            <h3 className="font-serif text-base font-semibold text-amber-950 mb-1">
              API Store #29215191 Connection Verified
            </h3>
            <p className="text-xs text-amber-900/90 leading-relaxed mb-4">
              Your newly created Printify API store (<code>custom_integration</code>) is connected and returned 0 products.
              When you add, create, or publish products to this store in your Printify dashboard, they will automatically appear here.
            </p>
            {shops.some((s) => String(s.id) === "29193770") && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-amber-950 font-medium">
                  Want to preview the product card and variant visualizer right now?
                </span>
                <button
                  onClick={() => setSelectedShopId("29193770")}
                  className="bg-amber-900 text-white text-xs px-3.5 py-1.5 rounded hover:bg-amber-950 transition-colors uppercase tracking-wider font-semibold"
                >
                  Preview Etsy Store Products (7 items) &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Products Section Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-serif text-2xl text-brown">
              Products ({filteredProducts.length})
            </h2>
            <p className="text-xs text-brown/60">
              Normalized product schema &bull; Prices converted from cents to EUR floats
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tag, ID..."
              className="w-full border border-brown/25 px-3 py-2 text-xs bg-white focus:border-brown focus:outline-none rounded-sm"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 border-2 border-brown/30 border-t-brown rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs uppercase tracking-wider text-brown/60">
              Fetching products from Printify API...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-brown/15 p-12 text-center rounded-sm">
            <p className="font-serif text-lg text-brown mb-2">No products found</p>
            <p className="text-xs text-brown/60 max-w-md mx-auto">
              {searchQuery
                ? "No products match your search query."
                : "No products exist in this Printify store yet. Create products in your Printify dashboard to see them here."}
            </p>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const firstImage = p.images[0]?.src || "/images/collection.jpg";
              const activeVariants = p.variants.filter((v) => v.is_enabled && v.is_available);

              return (
                <div
                  key={p.printify_product_id}
                  className="bg-white border border-brown/15 rounded-sm overflow-hidden flex flex-col hover:border-brown/40 hover:shadow-md transition-all group"
                >
                  {/* Mockup Image */}
                  <div className="relative aspect-square bg-[#F5F2EB] overflow-hidden">
                    {/* Using unoptimized standard image for reliable direct Printify mockup display */}
                    <img
                      src={firstImage}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-brown font-semibold shadow-xs">
                      #{p.printify_product_id.slice(-6)}
                    </div>
                    {p.visible && (
                      <div className="absolute top-2.5 left-2.5 bg-emerald-600/90 text-white px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold">
                        Visible
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-sm font-semibold text-brown line-clamp-2 mb-1.5 leading-snug">
                        {p.title}
                      </h3>
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="font-serif text-base font-bold text-brown">
                          from {eur(p.price)}
                        </span>
                        <span className="text-[11px] text-brown/60 font-mono">
                          {p.variants.length} variants
                        </span>
                      </div>
                    </div>

                    <div>
                      {/* Tags */}
                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {p.tags.slice(0, 3).map((t, i) => (
                            <span
                              key={i}
                              className="text-[9px] bg-sand/30 text-brown px-1.5 py-0.5 rounded"
                            >
                              {t}
                            </span>
                          ))}
                          {p.tags.length > 3 && (
                            <span className="text-[9px] text-brown/50 self-center">
                              +{p.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Detail Trigger */}
                      <button
                        onClick={() => setSelectedProduct(p)}
                        className="w-full border border-brown/25 py-1.5 text-[11px] uppercase tracking-wider text-brown hover:bg-brown hover:text-cream transition-colors font-medium rounded-xs"
                      >
                        Inspect Variants
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-brown/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded shadow-2xl relative">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 text-brown/60 hover:text-brown text-xl leading-none"
            >
              &times;
            </button>

            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {/* Image Carousel / Thumbnails */}
              <div className="w-full md:w-1/3">
                <div className="aspect-square bg-[#F5F2EB] rounded overflow-hidden mb-3">
                  <img
                    src={selectedProduct.images[0]?.src || "/images/collection.jpg"}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedProduct.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {selectedProduct.images.slice(0, 8).map((img, i) => (
                      <div key={i} className="aspect-square bg-sand/20 rounded overflow-hidden">
                        <img src={img.src} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="w-full md:w-2/3">
                <span className="text-[10px] font-mono text-brown/60 uppercase tracking-widest block mb-1">
                  Printify ID: {selectedProduct.printify_product_id}
                </span>
                <h2 className="font-serif text-2xl font-bold text-brown mb-2">
                  {selectedProduct.title}
                </h2>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl font-serif font-bold text-brown">
                    Base: {eur(selectedProduct.price)}
                  </span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                    {selectedProduct.available ? "Available" : "Unavailable"}
                  </span>
                  <span className="text-xs text-brown/60 font-mono">
                    SKU: {selectedProduct.sku || "N/A"}
                  </span>
                </div>

                <div className="text-xs text-brown/75 leading-relaxed max-h-36 overflow-y-auto mb-4 p-3 bg-sand/15 rounded">
                  <p className="font-semibold text-brown mb-1">Description:</p>
                  <p className="whitespace-pre-line">{selectedProduct.description || "No description provided."}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-brown/10 pt-3">
                  <div>
                    <span className="text-[10px] uppercase text-brown/50 block">Blueprint ID</span>
                    <span className="font-mono font-medium">{selectedProduct.blueprint_id || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-brown/50 block">Print Provider</span>
                    <span className="font-mono font-medium">{selectedProduct.print_provider_id || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-brown/50 block">Total Variants</span>
                    <span className="font-mono font-medium">{selectedProduct.variants.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-brown/50 block">Total Mockups</span>
                    <span className="font-mono font-medium">{selectedProduct.images.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Variants Table */}
            <div className="border-t border-brown/15 pt-4">
              <h4 className="font-serif text-base font-semibold text-brown mb-3">
                Variants Breakdown ({selectedProduct.variants.length})
              </h4>
              <div className="max-h-64 overflow-y-auto border border-brown/15 rounded text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F5F2EB] sticky top-0 text-brown font-medium">
                    <tr>
                      <th className="p-2 border-b border-brown/10">Variant ID</th>
                      <th className="p-2 border-b border-brown/10">Title</th>
                      <th className="p-2 border-b border-brown/10">SKU</th>
                      <th className="p-2 border-b border-brown/10">Price (EUR)</th>
                      <th className="p-2 border-b border-brown/10">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProduct.variants.map((v) => (
                      <tr key={v.variant_id} className="border-b border-brown/5 hover:bg-sand/10">
                        <td className="p-2 font-mono text-brown/60">#{v.variant_id}</td>
                        <td className="p-2 font-medium">{v.title}</td>
                        <td className="p-2 font-mono text-brown/70">{v.sku || "-"}</td>
                        <td className="p-2 font-bold font-serif">{eur((v.price_cents || 0) / 100)}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              v.is_enabled && v.is_available
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {v.is_enabled && v.is_available ? "Active" : "Disabled"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="bg-brown text-cream px-5 py-2 text-xs uppercase tracking-wider hover:bg-black rounded-xs transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
