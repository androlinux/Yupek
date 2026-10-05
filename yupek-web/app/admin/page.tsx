"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSiteConfig } from "@/components/ConfigContext";
import { useAuth } from "@/components/AuthContext";
import Icon from "@/components/ui/Icon";
import ImageUploader from "@/components/admin/ImageUploader";
import { eur } from "@/lib/catalog";
import { SiteConfig, ProductOverride } from "@/lib/siteConfig";

interface UploadedMediaItem {
  url: string;
  filename: string;
  size: number;
  mtime: string;
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const AVAILABLE_IMAGES = [
  { label: "Hero Heritage 4K", url: "/images/hero.jpg" },
  { label: "Yupek Silk Road", url: "/images/collection.jpg" },
  { label: "Traditional Textile", url: "/images/heritage.jpg" },
  { label: "Atelier Silk Craft", url: "/images/about.jpg" },
  { label: "Lookbook Editorial 01", url: "/images/look-1.jpg" },
  { label: "Lookbook Editorial 02", url: "/images/look-2.jpg" },
  { label: "Lookbook Editorial 03", url: "/images/look-3.jpg" },
  { label: "Brand Journal 01", url: "/images/journal-1.jpg" },
  { label: "Brand Journal 02", url: "/images/journal-2.jpg" },
];

export default function AdminPage() {
  const {
    config,
    updateConfig,
    updateProductOverride,
    resetToDefaults,
    allProducts,
    markSubmissionRead,
    deleteSubmission,
    updateOrderStatus,
  } = useSiteConfig();
  const { user } = useAuth();

  // Local form state for batch or live saving
  const [form, _setForm] = useState<SiteConfig>(config);
  const isDirtyRef = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const setForm = (action: React.SetStateAction<SiteConfig>) => {
    isDirtyRef.current = true;
    setHasUnsavedChanges(true);
    _setForm(action);
  };

  const [activeTab, setActiveTab] = useState<
    "orders" | "email" | "banners" | "hero" | "editorial" | "products" | "media" | "whatsapp" | "contact" | "buttons" | "inbox" | "security"
  >("orders");

  const [authorized, setAuthorized] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Restore authenticated session
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

  // Uploaded media state from server
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [isUploadingMulti, setIsUploadingMulti] = useState(false);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Email test states
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync initial config to form ONLY when user has not made local unsaved edits
  useEffect(() => {
    if (!isDirtyRef.current) {
      _setForm(config);
    }
  }, [config]);

  // Check if current user is admin
  useEffect(() => {
    if (user?.role === "admin") {
      setAuthorized(true);
    }
  }, [user]);

  // Fetch uploaded media files from server
  const fetchUploadedMedia = async () => {
    try {
      setLoadingMedia(true);
      const res = await fetch("/api/upload");
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setUploadedMedia(data.files);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchUploadedMedia();
    }
  }, [authorized]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Combined library of uploaded photos + original atelier archive
  const allGalleryImages = [
    ...uploadedMedia.map((m) => {
      // Clean display name
      const cleanName = m.filename
        .replace(/^yupek_\d+_/, "")
        .replace(/_[a-z0-9]+\./, ".")
        .replace(/_/g, " ");
      return {
        label: cleanName,
        url: m.url,
        isUploaded: true,
      };
    }),
    ...AVAILABLE_IMAGES.map((img) => ({ ...img, isUploaded: false })),
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    const configuredUser = (config.adminUsername || "admin").trim().toLowerCase();
    const configuredPass = config.adminPassword || "yupek2026";

    const enteredUser = adminUsernameInput.trim().toLowerCase();
    const enteredPass = adminPasswordInput.trim();

    // Check match with configured username or owner's primary email
    const isUserValid = enteredUser === configuredUser || enteredUser === "daniyarow16@gmail.com";
    const isPassValid = enteredPass === configuredPass || (configuredPass === "yupek2026" && enteredPass === "admin");

    if (isUserValid && isPassValid) {
      setAuthorized(true);
      try {
        sessionStorage.setItem("yupek_admin_auth", "true");
      } catch {}
      showToast("✓ Welcome back, Administrator.");
      setIsLoggingIn(false);
    } else {
      setIsLoggingIn(false);
      setLoginError("Invalid username or password. Please verify your credentials.");
    }
  };

  const handleLogout = () => {
    setAuthorized(false);
    try {
      sessionStorage.removeItem("yupek_admin_auth");
    } catch {}
    setAdminUsernameInput("");
    setAdminPasswordInput("");
    showToast("Signed out of Admin Panel.");
  };

  // Unified save handler for whole site or any tab
  const handleSaveTab = async (toastMsg = "Settings saved to disk and published!") => {
    try {
      setIsSaving(true);
      const res = await updateConfig(form);
      if (res && !res.success) {
        showToast(`Save Error: ${res.error || "Failed to save"}`);
      } else {
        isDirtyRef.current = false;
        setHasUnsavedChanges(false);
        showToast(`✓ ${toastMsg}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving";
      showToast(`Save Error: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    await handleSaveTab("All settings saved and published to live store!");
  };

  const handleProductPriceChange = async (slug: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice <= 0) return;
    setForm((prev) => ({
      ...prev,
      productOverrides: {
        ...prev.productOverrides,
        [slug]: {
          ...(prev.productOverrides?.[slug] || {}),
          price: newPrice,
        },
      },
    }));
    await updateProductOverride(slug, { price: newPrice });
    showToast(`✓ Updated price for ${slug} to €${newPrice}`);
  };

  const handleProductBadgeChange = async (slug: string, badge: string) => {
    setForm((prev) => ({
      ...prev,
      productOverrides: {
        ...prev.productOverrides,
        [slug]: {
          ...(prev.productOverrides?.[slug] || {}),
          badge,
        },
      },
    }));
    await updateProductOverride(slug, { badge });
    showToast(`✓ Updated badge for ${slug} to "${badge || "None"}"`);
  };

  const handleProductToggleFeatured = async (slug: string, current: boolean) => {
    const nextVal = !current;
    setForm((prev) => ({
      ...prev,
      productOverrides: {
        ...prev.productOverrides,
        [slug]: {
          ...(prev.productOverrides?.[slug] || {}),
          featured: nextVal,
        },
      },
    }));
    await updateProductOverride(slug, { featured: nextVal });
    showToast(`✓ ${nextVal ? "Featured" : "Standard"} ${slug}`);
  };

  // Upload photo for specific product
  const handleProductImageUpload = async (slug: string, url: string) => {
    const currentImages =
      form.productOverrides?.[slug]?.images ||
      allProducts.find((p) => p.slug === slug)?.images ||
      [];
    const newImages = [url, ...currentImages.filter((img) => img !== url)];

    setForm((prev) => ({
      ...prev,
      productOverrides: {
        ...prev.productOverrides,
        [slug]: {
          ...(prev.productOverrides?.[slug] || {}),
          images: newImages,
        },
      },
    }));

    await updateProductOverride(slug, { images: newImages });
    showToast(`✓ Uploaded new photo for ${slug}!`);
    fetchUploadedMedia();
  };

  // Reset product photos to defaults
  const handleProductResetImages = async (slug: string) => {
    setForm((prev) => {
      const copy = { ...(prev.productOverrides?.[slug] || {}), images: [] };
      return {
        ...prev,
        productOverrides: {
          ...prev.productOverrides,
          [slug]: copy,
        },
      };
    });
    await updateProductOverride(slug, { images: [] });
    showToast(`✓ Reset photos for ${slug} to default.`);
  };

  // Multi-file upload for Media tab
  const handleMultiUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setIsUploadingMulti(true);
    try {
      const formData = new FormData();
      fileArray.forEach((f) => formData.append("files", f));
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Successfully uploaded ${data.files?.length || 1} photo(s)!`);
        fetchUploadedMedia();
      } else {
        alert(data.error || "Failed to upload photos");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      alert(msg);
    } finally {
      setIsUploadingMulti(false);
      if (multiFileInputRef.current) {
        multiFileInputRef.current.value = "";
      }
    }
  };

  // Delete uploaded photo
  const handleDeleteMedia = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete this photo from the atelier server?`)) return;
    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Photo deleted from server.");
        fetchUploadedMedia();
      } else {
        alert(data.error || "Failed to delete photo");
      }
    } catch {
      alert("Error deleting photo");
    }
  };

  // Send test email to Gmail
  const handleSendTestEmail = async () => {
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_email",
          recipient: form.orderNotificationEmail,
          smtpUser: form.smtpUser || form.orderNotificationEmail,
          smtpPass: form.smtpPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailResult({ success: true, message: data.message });
        showToast("Test email sent to your Gmail!");
      } else {
        setTestEmailResult({
          success: false,
          error: data.error || data.hint || "Failed to send test email",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending test email";
      setTestEmailResult({ success: false, error: msg });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleOrderStatusChange = (orderId: string, status: any) => {
    updateOrderStatus(orderId, status);
    setForm((prev) => ({
      ...prev,
      storeOrders: (prev.storeOrders || []).map((o) =>
        o.id === orderId ? { ...o, status } : o
      ),
    }));
    showToast(`Order status updated to "${status}".`);
  };

  // If not authorized yet, show luxury Administrator Login Gate
  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#FBF8F3] flex items-center justify-center p-6 py-20">
        <div className="w-full max-w-md border border-brown/20 bg-cream p-8 md:p-10 shadow-2xl">
          <div className="text-center mb-6">
            <Link href="/" className="inline-block mb-3 hover:opacity-80 transition-opacity">
              <img
                src="/images/logo.png"
                alt="YUPEK"
                className="h-12 w-auto mx-auto object-contain"
              />
            </Link>
            <p className="label tracking-[.3em] text-burgundy text-[10px] uppercase font-medium">ATELIER CONTROL SYSTEM</p>
            <h1 className="font-serif text-2xl text-brown mt-1">ADMINISTRATOR SIGN IN</h1>
            <p className="mt-2 text-xs text-brown/65 leading-relaxed">
              Enter your administrator credentials to access store configuration.
            </p>
          </div>

          {loginError && (
            <div className="mb-5 bg-burgundy/10 border border-burgundy/30 text-burgundy px-4 py-3 rounded text-xs flex items-center gap-2">
              <span className="font-bold">!</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                Username or Email
              </label>
              <input
                type="text"
                autoComplete="username"
                required
                placeholder="admin or your email"
                value={adminUsernameInput}
                onChange={(e) => setAdminUsernameInput(e.target.value)}
                className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-widest text-brown/70 font-semibold">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="text-[10px] text-burgundy hover:underline uppercase tracking-wider font-medium"
                >
                  {showLoginPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showLoginPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-brown py-3 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium mt-2 flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
            >
              {isLoggingIn ? "Verifying..." : "Sign In to Admin Panel →"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-brown/15 text-center">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-wider text-brown/60 hover:text-brown transition-colors"
            >
              ← Return to YUPEK Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F3] text-brown pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded bg-brown px-5 py-3 text-xs tracking-wider text-cream shadow-2xl transition-all animate-in fade-in slide-in-from-top-3 flex items-center gap-2 border border-gold/40">
          <Icon name="check" className="h-4 w-4 text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Save Reminder when changes are pending */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 z-40 bg-brown text-cream border border-gold/60 shadow-2xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 rounded-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider font-medium text-sand">Unsaved Changes</span>
          </div>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-gold text-brown font-semibold px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-50 rounded"
          >
            {isSaving ? "Saving..." : "Save to Disk"}
          </button>
        </div>
      )}

      {/* Admin Topbar */}
      <div className="border-b border-brown/15 bg-cream/90 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="wrap flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" title="Go to website" className="shrink-0 hover:opacity-80 transition-opacity">
              <img
                src="/images/logo.png"
                alt="YUPEK"
                className="h-10 w-auto object-contain"
              />
            </Link>
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <div>
              <h1 className="font-serif text-xl tracking-wider text-brown flex items-center gap-2">
                YUPEK ATELIER CMS
                <span className="text-[10px] font-sans font-medium uppercase tracking-widest bg-burgundy/15 text-burgundy px-2 py-0.5 rounded-full">
                  Admin Panel
                </span>
              </h1>
              <p className="text-[11px] text-brown/60">Live site controller &bull; Edit content, media, prices, and buttons</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 border border-brown/30 bg-transparent px-3.5 py-2 text-[11px] uppercase tracking-wider text-brown hover:bg-brown/5 transition-colors"
            >
              <span>View Live Store</span>
              <span className="text-[10px]">&nearr;</span>
            </Link>

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="bg-brown px-5 py-2 text-[11px] uppercase tracking-widest text-cream hover:bg-black transition-colors shadow-sm font-medium flex items-center gap-2 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <span className="h-3 w-3 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  {hasUnsavedChanges && (
                    <span className="h-2 w-2 rounded-full bg-gold animate-pulse inline-block" />
                  )}
                  <span>Save & Publish</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 border border-burgundy/30 bg-burgundy/5 px-3 py-2 text-[11px] uppercase tracking-wider text-burgundy hover:bg-burgundy hover:text-cream transition-colors"
              title="Sign out of Admin Panel"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="wrap mt-8">
        {/* Navigation Tabs */}
        <div className="flex border-b border-brown/20 overflow-x-auto text-xs uppercase tracking-widest bg-cream/70 p-1 rounded-t">
          {[
            { id: "orders", label: `Orders (${form.storeOrders?.length || 0})`, icon: "bag" },
            { id: "email", label: "Gmail Alerts", icon: "mail" },
            { id: "security", label: "Admin Credentials", icon: "settings" },
            { id: "banners", label: "Banner & Announcements", icon: "menu" },
            { id: "hero", label: "Hero Photos & Videos", icon: "user" },
            { id: "editorial", label: "Editorial & Story", icon: "search" },
            { id: "products", label: "Products & Prices", icon: "bag" },
            { id: "media", label: `Media Library (${uploadedMedia.length})`, icon: "image" },
            { id: "whatsapp", label: "WhatsApp Concierge", icon: "arrowRight" },
            { id: "contact", label: "Contact Form & Details", icon: "settings" },
            { id: "buttons", label: "Buttons & Navigation", icon: "plus" },
            { id: "inbox", label: `Inquiries (${form.contactSubmissions?.length || 0})`, icon: "check" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`py-3 px-4 font-medium transition-all whitespace-nowrap border-b-2 ${
                activeTab === t.id
                  ? "border-brown bg-sand/30 text-brown font-semibold"
                  : "border-transparent text-brown/60 hover:text-brown hover:bg-sand/15"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 0: Orders & Sales */}
        {activeTab === "orders" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-brown tracking-wide flex items-center gap-2">
                  <span>CLIENT ORDERS & SALES</span>
                  <span className="text-[10px] font-sans font-medium uppercase tracking-widest bg-burgundy/15 text-burgundy px-2.5 py-0.5 rounded-full">
                    Live Dispatch
                  </span>
                </h2>
                <p className="text-xs text-brown/60 mt-1">
                  Manage incoming client purchases, review shipping destinations, and track Gmail notifications.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("email")}
                  className="inline-flex items-center gap-1.5 border border-brown/30 bg-white/70 px-3.5 py-2 text-xs uppercase tracking-wider text-brown hover:bg-sand/30 transition-colors"
                >
                  <Icon name="mail" className="h-3.5 w-3.5" />
                  <span>Configure Gmail Alerts &rarr;</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border border-brown/15 bg-white/80 p-4 rounded">
                <span className="text-[9px] uppercase tracking-widest text-brown/50 block">Total Orders</span>
                <span className="font-serif text-2xl text-brown mt-1 block">{form.storeOrders?.length || 0}</span>
              </div>
              <div className="border border-brown/15 bg-white/80 p-4 rounded">
                <span className="text-[9px] uppercase tracking-widest text-brown/50 block">Gross Revenue</span>
                <span className="font-serif text-2xl text-brown mt-1 block">
                  €{(form.storeOrders || []).reduce((acc, o) => acc + (o.total || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="border border-brown/15 bg-white/80 p-4 rounded">
                <span className="text-[9px] uppercase tracking-widest text-brown/50 block">New / Processing</span>
                <span className="font-serif text-2xl text-gold mt-1 block">
                  {(form.storeOrders || []).filter((o) => o.status === "New" || o.status === "Processing").length}
                </span>
              </div>
              <div className="border border-brown/15 bg-white/80 p-4 rounded">
                <span className="text-[9px] uppercase tracking-widest text-brown/50 block">Notification Gmail</span>
                <span className="text-xs font-mono text-burgundy mt-2 block truncate" title={form.orderNotificationEmail}>
                  {form.orderNotificationEmail || "Not set"}
                </span>
              </div>
            </div>

            {/* Orders List */}
            {(!form.storeOrders || form.storeOrders.length === 0) ? (
              <div className="py-16 text-center border border-dashed border-brown/20 bg-white/40 p-8">
                <div className="mx-auto h-12 w-12 rounded-full bg-sand/30 flex items-center justify-center text-brown/60 mb-3">
                  <Icon name="bag" className="h-6 w-6" />
                </div>
                <h4 className="font-serif text-base text-brown">No orders received yet</h4>
                <p className="text-xs text-brown/60 mt-1 max-w-sm mx-auto">
                  When a client completes checkout on your store, their order details and delivery info will appear here immediately and an email alert will be sent to your Gmail.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {form.storeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-brown/20 bg-white/95 p-5 md:p-6 shadow-sm rounded-sm space-y-4"
                  >
                    {/* Top Row: Order ID, Status, Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brown/10 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-brown tracking-wider">
                            #{order.orderNumber}
                          </span>
                          <span
                            className={`text-[9px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full border ${
                              order.status === "New"
                                ? "bg-gold/20 text-gold border-gold/40"
                                : order.status === "Processing"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : order.status === "Shipped"
                                ? "bg-purple-50 text-purple-800 border-purple-200"
                                : order.status === "Delivered"
                                ? "bg-green-50 text-green-800 border-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-300"
                            }`}
                          >
                            {order.status}
                          </span>
                          {order.emailNotificationSent ? (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-green-800 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-medium">
                              <Icon name="check" className="h-3 w-3 text-green-700" />
                              <span>Sent to Gmail</span>
                            </span>
                          ) : (
                            <span className="text-[9px] uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title={order.emailNotificationError}>
                              Gmail: Pending Setup
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-brown/50 mt-1">
                          Placed on {new Date(order.createdAt).toLocaleString()} &bull; Total: <strong>€{order.total.toFixed(2)}</strong> via {order.paymentMethod}
                        </p>
                      </div>

                      {/* Status changer */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-brown/60">Status:</span>
                        <select
                          value={order.status}
                          onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                          className="border border-brown/30 bg-white px-2.5 py-1 text-xs text-brown focus:border-brown focus:outline-none"
                        >
                          <option value="New">New</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Customer & Address Details */}
                    <div className="grid md:grid-cols-2 gap-4 bg-sand/10 p-4 border border-brown/10 text-xs">
                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-burgundy font-bold block mb-1">
                          Client Contact
                        </span>
                        <p className="font-semibold text-brown">{order.customer.firstName} {order.customer.lastName}</p>
                        <p className="text-brown/70 mt-0.5">
                          <a href={`mailto:${order.customer.email}`} className="text-burgundy hover:underline">
                            {order.customer.email}
                          </a>
                        </p>
                        {order.customer.phone && (
                          <p className="text-brown/70 mt-0.5">
                            Tel: <a href={`tel:${order.customer.phone}`} className="hover:underline">{order.customer.phone}</a> &bull;{" "}
                            <a
                              href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 hover:underline font-medium"
                            >
                              WhatsApp &rarr;
                            </a>
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] uppercase tracking-widest text-burgundy font-bold block mb-1">
                          Delivery Destination
                        </span>
                        <p className="text-brown/80 leading-relaxed">
                          {order.customer.street}<br />
                          {order.customer.postalCode} {order.customer.city}<br />
                          <strong>{order.customer.country}</strong>
                        </p>
                        <p className="text-[10px] text-brown/50 mt-1">
                          Method: {order.deliveryMethod} &bull; Shipping: {order.shipping === 0 ? "Complimentary (Free)" : `€${order.shipping.toFixed(2)}`}
                        </p>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-brown/60 font-semibold block mb-2">
                        Garments in this Order:
                      </span>
                      <div className="divide-y divide-brown/10 border border-brown/15 bg-white">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                              {item.image && (
                                <div className="h-12 w-9 bg-sand/30 overflow-hidden relative border border-brown/10 shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-brown uppercase">{item.name}</p>
                                <p className="text-[10px] text-brown/60">
                                  Size: <strong>{item.size}</strong> &bull; Color: {item.color} &bull; Qty: {item.qty} &times; €{item.price.toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <span className="font-semibold text-brown">€{(item.price * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 0.5: Gmail Alerts & Email Configuration */}
        {activeTab === "email" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-brown tracking-wide flex items-center gap-2">
                <span>GMAIL ORDER NOTIFICATIONS SETUP</span>
                <span className="text-[10px] font-sans font-medium uppercase tracking-widest bg-burgundy/15 text-burgundy px-2.5 py-0.5 rounded-full">
                  Automated Alerts
                </span>
              </h2>
              <p className="text-xs text-brown/60 mt-1">
                Configure your Gmail address to receive an instant, beautifully styled receipt email the moment a client places an order on your site.
              </p>
            </div>

            {/* Live Test Feedback Banner */}
            {testEmailResult && (
              <div
                className={`p-4 rounded border text-xs flex items-start gap-3 transition-all ${
                  testEmailResult.success
                    ? "bg-green-50 border-green-400 text-green-900"
                    : "bg-red-50 border-red-300 text-red-900"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon name={testEmailResult.success ? "check" : "close"} className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold">
                    {testEmailResult.success ? "Connection Verified!" : "Email Connection Error"}
                  </p>
                  <p className="mt-0.5">
                    {testEmailResult.success ? testEmailResult.message : testEmailResult.error}
                  </p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              {/* Form Settings */}
              <div className="space-y-4">
                <div className="border border-brown/20 bg-white/70 p-5 space-y-4 rounded">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-brown">
                    1. Notification Recipient
                  </h3>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                      Your Gmail Address (Where you want order messages)
                    </label>
                    <input
                      type="email"
                      value={form.orderNotificationEmail}
                      onChange={(e) => setForm({ ...form, orderNotificationEmail: e.target.value })}
                      className="w-full border border-brown/20 bg-white px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                      placeholder="e.g. yourname@gmail.com"
                    />
                    <p className="text-[10px] text-brown/50 mt-1">
                      New order receipts and customer delivery details will be sent directly here.
                    </p>
                  </div>
                </div>

                <div className="border border-brown/20 bg-white/70 p-5 space-y-4 rounded">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-brown">
                    2. Gmail SMTP Dispatcher Credentials
                  </h3>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1 font-semibold">
                      Gmail Sender Account
                    </label>
                    <input
                      type="email"
                      value={form.smtpUser || ""}
                      onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                      className="w-full border border-brown/20 bg-white px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                      placeholder="Defaults to notification Gmail if left blank"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold">
                        Google App Password (16 Letters)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[9px] uppercase tracking-wider text-burgundy hover:underline"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.smtpPass || ""}
                      onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
                      className="w-full border border-brown/20 bg-white px-3 py-2 text-xs text-brown font-mono focus:border-brown focus:outline-none"
                      placeholder="xxxx xxxx xxxx xxxx"
                    />
                    <p className="text-[10px] text-brown/50 mt-1">
                      This is NOT your personal Gmail password. It is a 16-letter App Password generated in Google Security (see guide on right).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveTab("Gmail notification settings saved!")}
                    className="bg-brown px-6 py-2.5 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors shadow-sm font-medium flex items-center gap-2 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <span className="h-3 w-3 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      "Save Email Settings"
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={testEmailLoading}
                    onClick={handleSendTestEmail}
                    className="border border-brown/40 bg-sand/20 px-5 py-2.5 text-xs uppercase tracking-wider text-brown hover:bg-sand/40 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {testEmailLoading ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-brown border-t-transparent" />
                        <span>Sending Test to Gmail...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="mail" className="h-3.5 w-3.5" />
                        <span>Send Test Email to My Gmail</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 30-Second Google Setup Guide */}
              <div className="border border-brown/20 bg-sand/20 p-6 rounded space-y-4">
                <span className="text-[10px] uppercase tracking-widest text-burgundy font-bold block">
                  FAST 30-SECOND SETUP GUIDE
                </span>
                <h3 className="font-serif text-lg text-brown tracking-wide">
                  How to get your Gmail App Password
                </h3>
                <p className="text-xs text-brown/70 leading-relaxed">
                  Google requires an automated 16-letter App Password to send emails safely from websites. It takes just 30 seconds to generate:
                </p>

                <ol className="space-y-3 text-xs text-brown/80 list-decimal list-inside leading-relaxed bg-white/70 p-4 border border-brown/15 rounded">
                  <li className="pl-1">
                    Go to your Google Account at{" "}
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-burgundy font-semibold underline"
                    >
                      myaccount.google.com/security &nearr;
                    </a>
                  </li>
                  <li className="pl-1">
                    Ensure <strong>2-Step Verification</strong> is turned <strong>ON</strong>.
                  </li>
                  <li className="pl-1">
                    In the search bar at the top, type <strong>&ldquo;App passwords&rdquo;</strong> and click it.
                  </li>
                  <li className="pl-1">
                    Enter <strong>&ldquo;YUPEK Store&rdquo;</strong> as the app name and click <strong>Create</strong>.
                  </li>
                  <li className="pl-1">
                    Copy the 16-character code (e.g. <code className="bg-sand/30 px-1 py-0.5 text-brown font-mono">abcd efgh ijkl mnop</code>), paste it into the box on the left, and click <strong>Save & Send Test Email</strong>!
                  </li>
                </ol>

                <div className="border-t border-brown/15 pt-3">
                  <p className="text-[11px] text-brown/60 leading-relaxed">
                    💡 <em>Orders are also permanently backed up inside this Admin Panel under the <strong>Orders & Sales</strong> tab, so you will never miss a client purchase.</em>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Admin Credentials & Security */}
        {activeTab === "security" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brown/10 pb-6">
              <div>
                <h2 className="font-serif text-2xl text-brown tracking-wide flex items-center gap-2">
                  <span>ADMIN CREDENTIALS & SECURITY</span>
                  <span className="text-[10px] font-sans font-medium uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    Protected
                  </span>
                </h2>
                <p className="text-xs text-brown/60 mt-1">
                  Change the administrator username and password required to unlock and manage the YUPEK Atelier Admin Panel.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSaveTab("Admin credentials updated and published!")}
                disabled={isSaving}
                className="bg-brown px-5 py-2.5 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium flex items-center gap-2 shrink-0 self-start sm:self-auto shadow-sm"
              >
                <Icon name="check" className="h-3.5 w-3.5 text-gold" />
                <span>Save Credentials</span>
              </button>
            </div>

            {/* Current Active Session Info Card */}
            <div className="bg-sand/15 border border-brown/15 p-5 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brown text-cream flex items-center justify-center font-serif text-lg">
                  {((form.adminUsername || "admin")[0] || "A").toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brown">{form.adminUsername || "admin"}</span>
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-wider text-green-800 font-medium">Session Active</span>
                  </div>
                  <p className="text-xs text-brown/60">
                    Primary atelier admin account &bull; Saved to <code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono">data/site-config.json</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="border border-burgundy/40 text-burgundy bg-burgundy/5 px-4 py-2 text-xs uppercase tracking-wider hover:bg-burgundy hover:text-cream transition-colors font-medium"
                >
                  Log Out / Lock Panel
                </button>
              </div>
            </div>

            {/* Credential Form Fields */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-5 bg-white/70 p-6 border border-brown/15 rounded-sm">
                <div className="flex items-center gap-2 border-b border-brown/10 pb-3">
                  <Icon name="user" className="h-4 w-4 text-burgundy" />
                  <h3 className="font-serif text-base text-brown tracking-wide">Administrator Username</h3>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-brown/80 font-medium block mb-1.5">
                    Username to Sign In
                  </label>
                  <input
                    type="text"
                    value={form.adminUsername ?? "admin"}
                    onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                    placeholder="e.g. admin or yupek_master"
                    className="w-full border border-brown/30 bg-white px-3.5 py-2.5 text-sm text-brown focus:border-brown focus:outline-none rounded-none"
                    autoComplete="username"
                  />
                  <p className="text-[11px] text-brown/60 mt-1.5 leading-relaxed">
                    Used to authenticate at <code className="text-burgundy font-medium">/admin</code>. You can also always sign in using your atelier email (<strong>daniyarow16@gmail.com</strong>).
                  </p>
                </div>
              </div>

              <div className="space-y-5 bg-white/70 p-6 border border-brown/15 rounded-sm">
                <div className="flex items-center gap-2 border-b border-brown/10 pb-3">
                  <Icon name="settings" className="h-4 w-4 text-burgundy" />
                  <h3 className="font-serif text-base text-brown tracking-wide">Administrator Password</h3>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-brown/80 font-medium block mb-1.5">
                    Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.adminPassword ?? "yupek2026"}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      placeholder="Enter new admin password"
                      className="w-full border border-brown/30 bg-white px-3.5 py-2.5 pr-14 text-sm text-brown focus:border-brown focus:outline-none rounded-none font-mono"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs uppercase tracking-wider text-brown/60 hover:text-burgundy font-medium"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="text-[11px] text-brown/60 mt-1.5 leading-relaxed">
                    Enter the secret password to protect your admin dashboard. Default is <code className="bg-sand/30 px-1 py-0.5 font-mono text-brown">yupek2026</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Save & Guidelines */}
            <div className="bg-sand/20 border border-brown/15 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-brown/70 space-y-1">
                <p className="font-medium text-brown flex items-center gap-1.5">
                  <span>🔒 Security Notice</span>
                </p>
                <p className="text-[11px] text-brown/60">
                  After clicking <strong>Save Credentials</strong>, changes are saved permanently to disk and your local browser session. You can test your new credentials immediately by logging out and signing back in.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSaveTab("Admin credentials updated and published!")}
                disabled={isSaving}
                className="bg-brown px-6 py-2.5 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <Icon name="check" className="h-4 w-4 text-gold" />
                <span>{isSaving ? "Saving..." : "Save Credentials"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Banners & Announcements */}
        {activeTab === "banners" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-brown tracking-wide">BANNER & ANNOUNCEMENT BAR</h2>
              <p className="text-xs text-brown/60 mt-1">
                Configure the top announcement bar shown across all pages to highlight free shipping, campaigns, or private sales.
              </p>
            </div>

            {/* Live Banner Preview */}
            <div className="border border-brown/20 p-3 bg-sand/10">
              <span className="text-[10px] uppercase tracking-widest text-brown/50 block mb-2">Live Bar Preview</span>
              {form.announcementEnabled ? (
                <div className="bg-brown py-2.5 px-4 text-center text-[10px] uppercase tracking-[.25em] text-cream flex items-center justify-center gap-2">
                  {form.announcementBadge && (
                    <span className="rounded-full border border-gold/40 bg-gold/20 px-2 py-0.5 text-[8px] font-semibold text-gold">
                      {form.announcementBadge}
                    </span>
                  )}
                  <span>{form.announcementText}</span>
                </div>
              ) : (
                <div className="bg-brown/20 py-2.5 text-center text-xs text-brown/50 italic">
                  Announcement bar is currently disabled
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="bannerEnabled"
                    checked={form.announcementEnabled}
                    onChange={(e) => setForm({ ...form, announcementEnabled: e.target.checked })}
                    className="h-4 w-4 accent-brown"
                  />
                  <label htmlFor="bannerEnabled" className="text-xs uppercase tracking-wider font-semibold text-brown cursor-pointer">
                    Enable Announcement Bar
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                    Announcement Text
                  </label>
                  <textarea
                    rows={2}
                    value={form.announcementText}
                    onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 p-3 text-xs text-brown focus:border-brown focus:outline-none"
                    placeholder="e.g. COMPLIMENTARY SHIPPING ACROSS EUROPE ON ORDERS OVER €100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                    Badge Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.announcementBadge || ""}
                    onChange={(e) => setForm({ ...form, announcementBadge: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    placeholder="e.g. SPRING CAPSULE or NEW"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                    Destination Link URL
                  </label>
                  <input
                    type="text"
                    value={form.announcementLink}
                    onChange={(e) => setForm({ ...form, announcementLink: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    placeholder="/shop or /shop?new=1"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveTab("Announcement banner saved!")}
                  className="bg-brown px-5 py-2.5 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="h-3 w-3 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Banner Changes"
                  )}
                </button>
              </div>

              {/* Suggestions */}
              <div className="border border-brown/15 bg-sand/15 p-5 space-y-3">
                <span className="text-[10px] uppercase tracking-widest text-brown/60 block font-semibold">
                  Quick Presets
                </span>
                {[
                  "COMPLIMENTARY SHIPPING ACROSS EUROPE ON ORDERS OVER €100 — PRIVATE ATELIER VIEWINGS AVAILABLE",
                  "NEW SEASON: SILK ROUTE CAPSULE NOW AVAILABLE IN LIMITED QUANTITIES",
                  "INVITATION ONLY: AMSTERDAM ATELIER TRUNK SHOW RESERVATIONS OPEN",
                  "SPRING ARCHIVES: RECEIVE A SIGNATURE SILK POCKET SQUARE WITH ORDERS OVER €200",
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm({ ...form, announcementText: preset })}
                    className="block w-full text-left text-[11px] p-2 bg-cream hover:bg-white border border-brown/15 text-brown transition-colors"
                  >
                    &ldquo;{preset}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Hero Section (Photos, Videos, Text, Buttons) */}
        {activeTab === "hero" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-brown tracking-wide">HERO MEDIA & CONTENT (PHOTOS & VIDEOS)</h2>
              <p className="text-xs text-brown/60 mt-1">
                Customize the main landing hero photo or video background, headline, tagline, and call-to-action buttons.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Controls */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                      Hero Title
                    </label>
                    <input
                      type="text"
                      value={form.heroTitle}
                      onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                      Tagline 1
                    </label>
                    <input
                      type="text"
                      value={form.heroTaglineLine1}
                      onChange={(e) => setForm({ ...form, heroTaglineLine1: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                    Tagline 2
                  </label>
                  <input
                    type="text"
                    value={form.heroTaglineLine2}
                    onChange={(e) => setForm({ ...form, heroTaglineLine2: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                    Hero Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.heroDescription}
                    onChange={(e) => setForm({ ...form, heroDescription: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 p-3 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>

                {/* Media Type Toggle */}
                <div className="border border-brown/20 bg-sand/20 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="heroUseVideo"
                      checked={form.heroUseVideo}
                      onChange={(e) => setForm({ ...form, heroUseVideo: e.target.checked })}
                      className="h-4 w-4 accent-brown"
                    />
                    <label htmlFor="heroUseVideo" className="text-xs uppercase tracking-wider font-semibold text-brown cursor-pointer">
                      Use Background Video (instead of photo)
                    </label>
                  </div>

                  {form.heroUseVideo ? (
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                        Hero Video URL (Direct MP4 or Stream link)
                      </label>
                      <input
                        type="url"
                        value={form.heroVideoUrl}
                        onChange={(e) => setForm({ ...form, heroVideoUrl: e.target.value })}
                        className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                        placeholder="https://assets.mixkit.co/videos/preview/..."
                      />
                      <p className="text-[10px] text-brown/50 mt-1">Plays in an automated high-fashion muted loop with user mute/pause controls.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* PC & Phone Upload Component */}
                      <ImageUploader
                        label="Upload Hero Background Photo"
                        currentImage={form.heroImage}
                        onUploaded={(url) => {
                          setForm((prev) => ({ ...prev, heroImage: url, heroUseVideo: false }));
                          updateConfig({ heroImage: url, heroUseVideo: false });
                          showToast("Hero photo uploaded from device & published!");
                          fetchUploadedMedia();
                        }}
                        buttonText="Upload Hero Photo from PC / Phone"
                        helperText="Upload any picture from your PC or take a photo with your phone's camera / gallery"
                      />

                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                          Or Direct Photo Path / URL
                        </label>
                        <input
                          type="text"
                          value={form.heroImage}
                          onChange={(e) => setForm({ ...form, heroImage: e.target.value })}
                          className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                        />
                      </div>

                      {/* Photo Library Picker (Uploaded + Presets) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] uppercase tracking-widest text-brown/60 block font-semibold">
                            Select from photo library ({allGalleryImages.length} available):
                          </span>
                          <button
                            type="button"
                            onClick={fetchUploadedMedia}
                            className="text-[9px] uppercase tracking-wider text-burgundy hover:underline flex items-center gap-1"
                          >
                            <Icon name="refresh" className="h-2.5 w-2.5" />
                            <span>Refresh</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1.5 border border-brown/15 bg-white/40">
                          {allGalleryImages.map((img) => (
                            <button
                              key={img.url}
                              type="button"
                              onClick={() => setForm({ ...form, heroImage: img.url, heroUseVideo: false })}
                              className={`text-[9px] p-1.5 border truncate text-left transition-all relative ${
                                form.heroImage === img.url
                                  ? "border-brown bg-brown text-cream shadow-sm"
                                  : "border-brown/20 bg-white/70 text-brown hover:bg-sand/30"
                              }`}
                            >
                              <div
                                className="aspect-[4/3] bg-cover bg-center rounded-sm mb-1"
                                style={{ backgroundImage: `url(${img.url})` }}
                              />
                              <span className="block truncate font-medium">{img.label}</span>
                              {img.isUploaded && (
                                <span className="absolute top-1 right-1 bg-burgundy text-cream text-[7px] font-bold px-1 rounded uppercase">
                                  Uploaded
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Buttons Config */}
                <div className="grid grid-cols-2 gap-3 border border-brown/20 p-4 bg-sand/10">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                      Primary Button Text
                    </label>
                    <input
                      type="text"
                      value={form.heroButtonText}
                      onChange={(e) => setForm({ ...form, heroButtonText: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                      Primary Button Link
                    </label>
                    <input
                      type="text"
                      value={form.heroButtonLink}
                      onChange={(e) => setForm({ ...form, heroButtonLink: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                      Secondary Button Text
                    </label>
                    <input
                      type="text"
                      value={form.heroSecondaryButtonText}
                      onChange={(e) => setForm({ ...form, heroSecondaryButtonText: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                      Secondary Button Link
                    </label>
                    <input
                      type="text"
                      value={form.heroSecondaryButtonLink}
                      onChange={(e) => setForm({ ...form, heroSecondaryButtonLink: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveTab("Hero section updated successfully!")}
                  className="bg-brown px-5 py-2.5 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="h-3 w-3 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Hero Settings"
                  )}
                </button>
              </div>

              {/* Visual Card Preview */}
              <div className="border border-brown/20 bg-brown text-cream p-6 rounded relative overflow-hidden flex flex-col justify-end min-h-[400px]">
                {form.heroUseVideo && form.heroVideoUrl ? (
                  <video
                    src={form.heroVideoUrl}
                    autoPlay
                    loop
                    muted
                    className="absolute inset-0 h-full w-full object-cover opacity-60 pointer-events-none"
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-60"
                    style={{ backgroundImage: `url(${form.heroImage || "/images/hero.jpg"})` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brown/95 via-brown/40 to-transparent" />

                <div className="relative z-10 space-y-2">
                  <span className="text-[9px] uppercase tracking-widest text-gold font-semibold">PREVIEW</span>
                  <h3 className="font-serif text-4xl text-cream tracking-widest">{form.heroTitle || "YUPEK"}</h3>
                  <p className="text-[11px] uppercase tracking-wider text-sand">
                    {form.heroTaglineLine1} &bull; {form.heroTaglineLine2}
                  </p>
                  <p className="text-xs text-cream/80 max-w-sm line-clamp-2">{form.heroDescription}</p>
                  <div className="flex gap-2 pt-2">
                    <span className="bg-cream text-brown px-3 py-1.5 text-[10px] tracking-wider font-medium">
                      {form.heroButtonText}
                    </span>
                    <span className="border border-cream/50 text-cream px-3 py-1.5 text-[10px] tracking-wider">
                      {form.heroSecondaryButtonText}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Editorial & Story Media */}
        {activeTab === "editorial" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-brown tracking-wide">EDITORIAL SHOWCASE & BRAND VIDEOS</h2>
              <p className="text-xs text-brown/60 mt-1">
                Manage the storytelling section, editorial lookbook photography, and brand atelier videos.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                    Editorial Tag
                  </label>
                  <input
                    type="text"
                    value={form.editorialTag}
                    onChange={(e) => setForm({ ...form, editorialTag: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                    Editorial Title
                  </label>
                  <input
                    type="text"
                    value={form.editorialTitle}
                    onChange={(e) => setForm({ ...form, editorialTitle: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                    Editorial Description
                  </label>
                  <textarea
                    rows={3}
                    value={form.editorialDescription}
                    onChange={(e) => setForm({ ...form, editorialDescription: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 p-3 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <ImageUploader
                    label="Upload Editorial Showcase Photo"
                    currentImage={form.editorialImage}
                    onUploaded={(url) => {
                      setForm((prev) => ({ ...prev, editorialImage: url }));
                      updateConfig({ editorialImage: url });
                      showToast("Editorial photo uploaded from device & applied!");
                      fetchUploadedMedia();
                    }}
                    buttonText="Upload Editorial Photo from PC / Phone"
                    helperText="Upload any picture from your PC or take a photo with your phone's camera / gallery"
                  />

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                      Or Editorial Photo Path / URL
                    </label>
                    <input
                      type="text"
                      value={form.editorialImage}
                      onChange={(e) => setForm({ ...form, editorialImage: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                    Atelier Story Video URL (for /about & story)
                  </label>
                  <input
                    type="url"
                    value={form.storyVideoUrl}
                    onChange={(e) => setForm({ ...form, storyVideoUrl: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={form.editorialButtonText}
                      onChange={(e) => setForm({ ...form, editorialButtonText: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                      Button Link
                    </label>
                    <input
                      type="text"
                      value={form.editorialButtonLink}
                      onChange={(e) => setForm({ ...form, editorialButtonLink: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveTab("Editorial settings updated!")}
                  className="bg-brown px-5 py-2.5 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="h-3 w-3 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Editorial Settings"
                  )}
                </button>
              </div>

              {/* Photo preview gallery */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest text-brown/60 block font-semibold">
                    Photo Library Gallery ({allGalleryImages.length})
                  </span>
                  <button
                    type="button"
                    onClick={fetchUploadedMedia}
                    className="text-[9px] uppercase tracking-wider text-burgundy hover:underline flex items-center gap-1"
                  >
                    <Icon name="refresh" className="h-2.5 w-2.5" />
                    <span>Refresh</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto p-1.5 border border-brown/15 bg-white/40">
                  {allGalleryImages.map((img) => (
                    <div
                      key={img.url}
                      onClick={() => setForm({ ...form, editorialImage: img.url })}
                      className={`cursor-pointer border p-1 rounded transition-all relative ${
                        form.editorialImage === img.url ? "border-brown ring-2 ring-brown/30 bg-sand/20" : "border-brown/15 hover:border-brown/50 bg-white/70"
                      }`}
                    >
                      <div
                        className="aspect-[4/3] bg-cover bg-center rounded-sm"
                        style={{ backgroundImage: `url(${img.url})` }}
                      />
                      <p className="text-[9px] truncate mt-1 text-center font-medium text-brown">{img.label}</p>
                      {img.isUploaded && (
                        <span className="absolute top-1 right-1 bg-burgundy text-cream text-[7px] font-bold px-1 rounded uppercase">
                          Uploaded
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Products & Prices (Full Catalog Management) */}
        {activeTab === "products" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-brown tracking-wide">PRODUCT CATALOG & PRICING</h2>
                <p className="text-xs text-brown/60 mt-1">
                  Change garment prices, promotional badges (NEW, SALE), stock status, and featured toggles.
                </p>
              </div>
              <span className="text-xs text-brown/70 bg-sand/30 px-3 py-1.5 rounded border border-brown/15">
                Total Products: {allProducts.length}
              </span>
            </div>

            <div className="divide-y divide-brown/15 border border-brown/20 bg-white/70 overflow-hidden">
              {allProducts.map((p) => {
                const override = form.productOverrides?.[p.slug] || {};
                const currentPrice = override.price ?? p.price;
                const currentBadge = override.badge !== undefined ? override.badge : p.badge;
                const currentFeatured = override.featured ?? p.featured;

                return (
                  <div key={p.slug} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-sand/10 transition-colors">
                    {/* Product visual & details */}
                    <div className="flex items-center gap-4 min-w-[280px]">
                      <div className="h-16 w-12 bg-sand/30 overflow-hidden relative border border-brown/10 flex-shrink-0 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={override.images?.[0] || p.images[0] || "/images/collection.jpg"}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                        {override.images && override.images.length > 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-burgundy text-cream text-[7px] text-center font-bold uppercase py-0.5 tracking-wider">
                            Custom
                          </span>
                        )}
                      </div>
                      <div>
                        <Link href={`/product/${p.slug}`} className="text-xs uppercase tracking-wider font-semibold text-brown hover:text-burgundy">
                          {p.name}
                        </Link>
                        <p className="text-[11px] text-brown/60 capitalize">{p.category} &bull; {p.gender}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <ImageUploader
                            compact
                            buttonText="Upload Photo"
                            onUploaded={(url) => handleProductImageUpload(p.slug, url)}
                          />
                          {override.images && override.images.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleProductResetImages(p.slug)}
                              className="text-[9px] uppercase tracking-wider text-burgundy hover:underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price editor */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-brown/60">Price (€):</span>
                      <input
                        type="number"
                        min="1"
                        value={currentPrice}
                        onChange={(e) => {
                          isDirtyRef.current = true;
                          const val = Number(e.target.value);
                          setForm((prev) => ({
                            ...prev,
                            productOverrides: {
                              ...prev.productOverrides,
                              [p.slug]: {
                                ...(prev.productOverrides?.[p.slug] || {}),
                                price: val,
                              },
                            },
                          }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = Number((e.target as HTMLInputElement).value);
                            if (!isNaN(val) && val > 0) {
                              handleProductPriceChange(p.slug, val);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            handleProductPriceChange(p.slug, val);
                          }
                        }}
                        className="w-20 border border-brown/30 bg-white px-2 py-1 text-xs text-brown text-right font-medium focus:border-brown focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = Number(form.productOverrides?.[p.slug]?.price ?? currentPrice);
                          if (!isNaN(val) && val > 0) {
                            handleProductPriceChange(p.slug, val);
                          }
                        }}
                        className="text-[10px] bg-brown text-cream px-2 py-1 hover:bg-black"
                      >
                        Set
                      </button>
                    </div>

                    {/* Badge editor */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-brown/60">Badge:</span>
                      <select
                        value={currentBadge || ""}
                        onChange={(e) => {
                          const b = e.target.value;
                          handleProductBadgeChange(p.slug, b);
                        }}
                        className="border border-brown/30 bg-white px-2 py-1 text-xs text-brown focus:border-brown focus:outline-none"
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

                    {/* Featured toggle */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleProductToggleFeatured(p.slug, currentFeatured)}
                        className={`text-[10px] uppercase tracking-wider px-3 py-1 border transition-colors ${
                          currentFeatured
                            ? "bg-gold/25 border-gold text-brown font-semibold"
                            : "border-brown/20 text-brown/50 hover:bg-sand/30"
                        }`}
                      >
                        {currentFeatured ? "★ Featured" : "Standard"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Media & Photo Library (PC & Phone Uploads) */}
        {activeTab === "media" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-brown tracking-wide flex items-center gap-2">
                  <span>ATELIER MEDIA LIBRARY & UPLOADS</span>
                  <span className="text-[10px] font-sans font-medium uppercase tracking-widest bg-sand text-brown px-2.5 py-0.5 rounded-full border border-brown/15">
                    PC & Phone
                  </span>
                </h2>
                <p className="text-xs text-brown/60 mt-1">
                  Upload high-resolution photography directly from your PC or mobile phone (via Camera or Photo Roll). Photos are instantly saved to the atelier server and can be assigned to Hero, Editorial, or Products.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchUploadedMedia}
                  className="inline-flex items-center gap-1.5 border border-brown/30 bg-white/70 px-3 py-1.5 text-xs uppercase tracking-wider text-brown hover:bg-sand/30 transition-colors"
                >
                  <Icon name="refresh" className={`h-3.5 w-3.5 ${loadingMedia ? "animate-spin" : ""}`} />
                  <span>Refresh Library</span>
                </button>
              </div>
            </div>

            {/* Big Dropzone & Multi-File Upload from PC / Phone */}
            <div className="border border-brown/20 bg-sand/15 p-6 rounded text-center">
              <input
                ref={multiFileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleMultiUpload(e.target.files)}
                disabled={isUploadingMulti}
              />

              <div
                onClick={() => multiFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    handleMultiUpload(e.dataTransfer.files);
                  }
                }}
                className="cursor-pointer border-2 border-dashed border-brown/30 bg-white/80 p-8 rounded hover:border-brown hover:bg-white transition-all flex flex-col items-center justify-center gap-3"
              >
                {isUploadingMulti ? (
                  <div className="py-4 flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-brown border-t-transparent" />
                    <p className="text-sm font-semibold uppercase tracking-wider text-brown">
                      Uploading photos from your device...
                    </p>
                    <p className="text-xs text-brown/60">Writing files to server storage</p>
                  </div>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-full bg-sand/40 text-brown flex items-center justify-center">
                      <Icon name="upload" className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg text-brown tracking-wide">
                        DROP PHOTOS HERE OR TAP TO BROWSE
                      </h3>
                      <p className="text-xs text-brown/70 mt-1 max-w-md mx-auto">
                        Supports multiple image uploads at once. On mobile phones, tap below to open camera or photo gallery. (JPG, PNG, WebP, AVIF up to 50MB)
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mt-2 bg-brown text-cream px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-black transition-colors font-medium shadow-sm flex items-center gap-2"
                    >
                      <Icon name="upload" className="h-4 w-4" />
                      <span>Choose Photos from PC / Phone</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-brown/15 pb-2">
                <span className="text-xs uppercase tracking-widest text-brown font-semibold">
                  Uploaded Photos ({uploadedMedia.length})
                </span>
                <span className="text-[10px] uppercase tracking-wider text-brown/50">
                  Click any button to assign or copy URL
                </span>
              </div>

              {uploadedMedia.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-brown/20 bg-white/40 p-8">
                  <div className="mx-auto h-12 w-12 rounded-full bg-sand/30 flex items-center justify-center text-brown/60 mb-3">
                    <Icon name="image" className="h-6 w-6" />
                  </div>
                  <h4 className="font-serif text-base text-brown">No uploaded photos yet</h4>
                  <p className="text-xs text-brown/60 mt-1 max-w-sm mx-auto">
                    Upload photos using the button above from your computer or mobile phone. Once uploaded, they will appear here and can be assigned with 1-click.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {uploadedMedia.map((item) => (
                    <div
                      key={item.filename}
                      className="border border-brown/20 bg-white/90 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                    >
                      {/* Image Thumbnail */}
                      <div className="relative aspect-[4/3] bg-sand/20 overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.filename}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2 right-2 bg-black/70 backdrop-blur text-cream text-[9px] px-2 py-0.5 rounded font-mono">
                          {formatBytes(item.size)}
                        </span>
                      </div>

                      {/* File Details */}
                      <div className="p-3 border-t border-brown/10 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-mono text-brown truncate" title={item.filename}>
                            {item.filename.replace(/^yupek_\d+_/, "")}
                          </p>
                          <p className="text-[10px] text-brown/50 mt-0.5">
                            {new Date(item.mtime).toLocaleString()}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-3 pt-3 border-t border-brown/10 grid grid-cols-2 gap-1.5 text-[9px] uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, heroImage: item.url, heroUseVideo: false }));
                              updateConfig({ heroImage: item.url, heroUseVideo: false });
                              showToast("Set as Hero Background Photo!");
                            }}
                            className="p-1.5 text-center border border-brown/20 bg-sand/15 hover:bg-brown hover:text-cream transition-colors text-brown font-medium"
                          >
                            ★ Set as Hero
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({ ...prev, editorialImage: item.url }));
                              updateConfig({ editorialImage: item.url });
                              showToast("Set as Editorial Showcase Photo!");
                            }}
                            className="p-1.5 text-center border border-brown/20 bg-sand/15 hover:bg-brown hover:text-cream transition-colors text-brown font-medium"
                          >
                            ✦ Set Editorial
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.url);
                              showToast("Copied image URL to clipboard!");
                            }}
                            className="p-1.5 text-center border border-brown/20 bg-white hover:bg-sand/30 transition-colors text-brown"
                          >
                            Copy URL
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(item.filename)}
                            className="p-1.5 text-center border border-burgundy/20 bg-burgundy/5 hover:bg-burgundy hover:text-cream transition-colors text-burgundy"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: WhatsApp Concierge */}
        {activeTab === "whatsapp" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-brown tracking-wide">WHATSAPP PRIVATE CONCIERGE</h2>
              <p className="text-xs text-brown/60 mt-1">
                Configure the floating WhatsApp concierge chat button that connects VIP clients directly to your team.
              </p>
            </div>

            <div className="max-w-xl space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="whatsappEnabled"
                  checked={form.whatsappEnabled}
                  onChange={(e) => setForm({ ...form, whatsappEnabled: e.target.checked })}
                  className="h-4 w-4 accent-green-600"
                />
                <label htmlFor="whatsappEnabled" className="text-xs uppercase tracking-wider font-semibold text-brown cursor-pointer">
                  Enable Floating WhatsApp Widget
                </label>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  WhatsApp Phone Number (with Country Code)
                </label>
                <input
                  type="text"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  placeholder="+31612345678"
                />
                <p className="text-[10px] text-brown/50 mt-1">Example: +31 6 1234 5678 (Netherlands) or +49 151 1234567 (Germany)</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Pre-filled Client Welcome Message
                </label>
                <textarea
                  rows={3}
                  value={form.whatsappMessage}
                  onChange={(e) => setForm({ ...form, whatsappMessage: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 p-3 text-xs text-brown focus:border-brown focus:outline-none"
                  placeholder="Hello YUPEK Atelier! I would like personal assistance with your collection."
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Floating Button Tooltip
                </label>
                <input
                  type="text"
                  value={form.whatsappTooltip}
                  onChange={(e) => setForm({ ...form, whatsappTooltip: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  placeholder="Concierge Online"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveTab("WhatsApp concierge settings updated!")}
                  className="bg-green-700 px-5 py-2.5 text-xs uppercase tracking-widest text-white hover:bg-green-800 transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save WhatsApp Settings"
                  )}
                </button>

                <a
                  href={`https://wa.me/${form.whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(form.whatsappMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-green-700 text-green-800 px-4 py-2.5 text-xs uppercase tracking-wider hover:bg-green-50 transition-colors"
                >
                  Test WhatsApp Chat &rarr;
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Contact Form & Studio Details */}
        {activeTab === "contact" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-brown tracking-wide">ATELIER CONTACT & INQUIRIES</h2>
              <p className="text-xs text-brown/60 mt-1">
                Manage contact address, phone, email, opening hours, and atelier video tour.
              </p>
            </div>

            <div className="max-w-xl space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Atelier Email
                </label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Atelier Telephone
                </label>
                <input
                  type="text"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Physical Studio Address
                </label>
                <input
                  type="text"
                  value={form.contactAddress}
                  onChange={(e) => setForm({ ...form, contactAddress: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Opening Hours
                </label>
                <input
                  type="text"
                  value={form.contactHours}
                  onChange={(e) => setForm({ ...form, contactHours: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Contact Video Tour URL (Optional)
                </label>
                <input
                  type="url"
                  value={form.contactVideoUrl}
                  onChange={(e) => setForm({ ...form, contactVideoUrl: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveTab("Contact details saved!")}
                className="bg-brown px-5 py-2.5 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="h-3 w-3 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Contact Details"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 7: Buttons & Settings */}
        {activeTab === "buttons" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-brown tracking-wide">GLOBAL BUTTONS & THRESHOLDS</h2>
              <p className="text-xs text-brown/60 mt-1">
                Customize global button call-to-actions, cart text, and free delivery thresholds.
              </p>
            </div>

            <div className="max-w-xl space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Free Shipping Minimum Threshold (€)
                </label>
                <input
                  type="number"
                  value={form.freeShippingThreshold}
                  onChange={(e) => setForm({ ...form, freeShippingThreshold: Number(e.target.value) })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Primary Catalog Button Label
                </label>
                <input
                  type="text"
                  value={form.shopButtonLabel}
                  onChange={(e) => setForm({ ...form, shopButtonLabel: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Add to Bag Button Label
                </label>
                <input
                  type="text"
                  value={form.addToBagLabel}
                  onChange={(e) => setForm({ ...form, addToBagLabel: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                  Checkout Button Label
                </label>
                <input
                  type="text"
                  value={form.checkoutButtonLabel}
                  onChange={(e) => setForm({ ...form, checkoutButtonLabel: e.target.value })}
                  className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveTab("Global button labels updated!")}
                  className="bg-brown px-5 py-2.5 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="h-3 w-3 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    "Save Button Labels"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Reset all settings to original factory defaults?")) {
                      resetToDefaults();
                      showToast("Configuration reset to defaults.");
                    }
                  }}
                  className="border border-burgundy/40 text-burgundy px-4 py-2.5 text-xs uppercase tracking-wider hover:bg-burgundy/10 transition-colors"
                >
                  Reset All to Defaults
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 8: Inquiries Inbox */}
        {activeTab === "inbox" && (
          <div className="bg-cream border border-brown/15 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl text-brown tracking-wide">CLIENT INQUIRIES & CONTACT SUBMISSIONS</h2>
                <p className="text-xs text-brown/60 mt-1">
                  Messages submitted by clients via the contact page and atelier booking form.
                </p>
              </div>
              <span className="text-xs text-brown/60">
                {form.contactSubmissions?.length || 0} messages received
              </span>
            </div>

            {(!form.contactSubmissions || form.contactSubmissions.length === 0) ? (
              <div className="py-12 text-center text-brown/50 border border-dashed border-brown/20 p-8">
                No inquiries received yet.
              </div>
            ) : (
              <div className="space-y-4">
                {form.contactSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className={`border p-5 transition-all ${
                      sub.read ? "border-brown/15 bg-white/50" : "border-gold bg-gold/5 shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brown/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-brown">{sub.name}</span>
                          {!sub.read && (
                            <span className="bg-gold px-1.5 py-0.2 text-[8px] font-bold text-brown uppercase rounded">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-brown/70">
                          {sub.email} {sub.phone ? `&bull; ${sub.phone}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[10px] text-brown/50">
                          {new Date(sub.createdAt).toLocaleString()}
                        </span>
                        {!sub.read && (
                          <button
                            onClick={() => markSubmissionRead(sub.id)}
                            className="text-[10px] border border-brown/20 px-2 py-0.5 hover:bg-sand/30"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => deleteSubmission(sub.id)}
                          className="text-[10px] text-burgundy hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-medium text-brown uppercase tracking-wider">{sub.subject}</p>
                      <p className="mt-1 text-xs text-brown/80 leading-relaxed whitespace-pre-wrap">{sub.message}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-brown/10 flex gap-3 text-xs">
                      <a
                        href={`mailto:${sub.email}?subject=Re: ${encodeURIComponent(sub.subject)}`}
                        className="text-burgundy hover:underline text-[11px]"
                      >
                        Reply via Email &rarr;
                      </a>
                      {sub.phone && (
                        <a
                          href={`https://wa.me/${sub.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 hover:underline text-[11px]"
                        >
                          Chat on WhatsApp &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
