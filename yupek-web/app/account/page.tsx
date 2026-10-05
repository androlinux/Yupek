"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, UserAddress } from "@/components/AuthContext";
import { useStore } from "@/components/Providers";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import Icon from "@/components/ui/Icon";
import { eur } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";

export default function AccountPage() {
  const {
    user,
    signOut,
    updateAddress,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithApple,
    refreshOrders,
  } = useAuth();

  const { wishlist } = useStore();
  const { allProducts } = useSiteConfig();
  const { t, locale } = useLanguage();

  // Auth form states
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Social OAuth states
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  // Logged-in portal states
  const [activeTab, setActiveTab] = useState<"orders" | "wishlist" | "address" | "concierge">("orders");
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<UserAddress>({
    fullName: "",
    street: "",
    city: "",
    postalCode: "",
    country: "Netherlands",
    phone: "",
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);

  // Sync address form when user loads
  useEffect(() => {
    if (user?.address) {
      setAddressForm({
        fullName: user.address.fullName || user.name || "",
        street: user.address.street || "",
        city: user.address.city || "",
        postalCode: user.address.postalCode || "",
        country: user.address.country || "Netherlands",
        phone: user.address.phone || user.phone || "",
      });
    }
  }, [user]);

  // Handle client Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const res = await signInWithEmail(loginEmail, loginPassword);
    setLoginLoading(false);

    if (!res.success) {
      setLoginError(
        res.error ||
          (locale === "nl"
            ? "Kan niet inloggen. Controleer uw e-mailadres en wachtwoord."
            : "Invalid email or password. Please verify your credentials.")
      );
    }
  };

  // Handle client Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegLoading(true);

    const res = await signUpWithEmail(regEmail, regPassword, regName, regPhone);
    setRegLoading(false);

    if (!res.success) {
      setRegError(
        res.error ||
          (locale === "nl"
            ? "Registratiefout. Controleer uw gegevens of probeer een ander e-mailadres."
            : "Registration failed. Please check your information.")
      );
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setOauthError(null);
    setOauthLoading("google");
    const res = await signInWithGoogle();
    setOauthLoading(null);
    if (!res.success) {
      if (res.error?.includes("provider is not enabled") || res.error?.includes("Unsupported provider")) {
        setOauthError(
          locale === "nl"
            ? "Google Inloggen configuratie: Schakel Google Provider in via uw Supabase dashboard (Auth > Providers) met uw Google Cloud Client ID."
            : "Google Sign-In setup: Please enable Google Provider in your Supabase Dashboard (Auth > Providers) with your Google Cloud Client ID."
        );
      } else {
        setOauthError(res.error || "Google Sign-In failed. Please sign in with email.");
      }
    }
  };

  // Handle Apple Sign-In
  const handleAppleSignIn = async () => {
    setOauthError(null);
    setOauthLoading("apple");
    const res = await signInWithApple();
    setOauthLoading(null);
    if (!res.success) {
      if (res.error?.includes("provider is not enabled") || res.error?.includes("Unsupported provider")) {
        setOauthError(
          locale === "nl"
            ? "Apple Inloggen configuratie: Schakel Apple Provider in via uw Supabase dashboard (Auth > Providers) met uw Apple Developer Service ID."
            : "Apple Sign-In setup: Please enable Apple Provider in your Supabase Dashboard (Auth > Providers) with your Apple Developer Service ID."
        );
      } else {
        setOauthError(res.error || "Apple Sign-In failed. Please sign in with email.");
      }
    }
  };

  // Handle saving delivery address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSaving(true);
    await updateAddress(addressForm);
    setAddressSaving(false);
    setEditingAddress(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // ==========================================
  // 1. UNAUTHENTICATED STATE: Real Client Portal
  // ==========================================
  if (!user) {
    return (
      <div className="wrap py-20 md:py-28">
        <div className="mx-auto max-w-xl border border-brown/20 bg-cream p-7 sm:p-10 md:p-12 shadow-xl">
          {/* Brand Header */}
          <div className="text-center">
            <span className="label tracking-[.3em] text-burgundy text-[10px] uppercase font-semibold">
              {t.account.portalTag}
            </span>
            <h1 className="h-display mt-2 text-3xl sm:text-4xl md:text-5xl text-brown tracking-wide">
              {authMode === "signin" ? t.account.clientAccess : t.auth.createAccountTitle}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-brown/75 font-light">
              {authMode === "signin"
                ? t.account.signInPrompt
                : locale === "nl"
                ? "Registreer uw persoonlijke account om uw bestellingen te volgen en exclusieve capsulecollecties te ontdekken."
                : "Register your private account to track your orders, store your delivery address, and view private collections."}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="mt-8 grid grid-cols-2 border border-brown/25 p-1 bg-sand/20 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setLoginError(null);
                setRegError(null);
              }}
              className={`py-2 font-medium tracking-wider uppercase text-[11px] transition-all ${
                authMode === "signin"
                  ? "bg-brown text-cream shadow-sm"
                  : "text-brown/70 hover:text-brown hover:bg-sand/30"
              }`}
            >
              {t.auth.signInTab}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setLoginError(null);
                setRegError(null);
              }}
              className={`py-2 font-medium tracking-wider uppercase text-[11px] transition-all ${
                authMode === "register"
                  ? "bg-brown text-cream shadow-sm"
                  : "text-brown/70 hover:text-brown hover:bg-sand/30"
              }`}
            >
              {t.auth.registerTab}
            </button>
          </div>

          {/* ======================= */}
          {/* TAB A: SIGN IN FORM    */}
          {/* ======================= */}
          {authMode === "signin" && (
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              {loginError && (
                <div className="bg-burgundy/10 border border-burgundy/30 text-burgundy px-4 py-3 text-xs flex items-center gap-2">
                  <span className="font-bold">!</span>
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/80 font-semibold mb-1">
                  {t.auth.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="client@domain.com"
                  className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-widest text-brown/80 font-semibold">
                    {t.auth.passwordLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="text-[10px] uppercase tracking-wider text-burgundy hover:underline font-medium"
                  >
                    {showLoginPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-brown py-3 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium mt-2 flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
              >
                {loginLoading ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                    <span>{t.auth.authenticating}</span>
                  </>
                ) : (
                  <span>{t.auth.enterStoreBtn} &rarr;</span>
                )}
              </button>
            </form>
          )}

          {/* ========================== */}
          {/* TAB B: CREATE ACCOUNT FORM */}
          {/* ========================== */}
          {authMode === "register" && (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              {regError && (
                <div className="bg-burgundy/10 border border-burgundy/30 text-burgundy px-4 py-3 text-xs flex items-center gap-2">
                  <span className="font-bold">!</span>
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/80 font-semibold mb-1">
                  {t.auth.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/80 font-semibold mb-1">
                  {t.auth.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="client@domain.com"
                  className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/80 font-semibold mb-1">
                  {locale === "nl" ? "Telefoonnummer (Optioneel)" : "Phone Number (Optional)"}
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+31 6 1234 5678"
                  className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] uppercase tracking-widest text-brown/80 font-semibold">
                    {t.auth.passwordLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="text-[10px] uppercase tracking-wider text-burgundy hover:underline font-medium"
                  >
                    {showRegPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showRegPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full bg-brown py-3 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium mt-2 flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
              >
                {regLoading ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                    <span>{locale === "nl" ? "Account aanmaken..." : "Creating Account..."}</span>
                  </>
                ) : (
                  <span>{t.auth.createProfileBtn} &rarr;</span>
                )}
              </button>
            </form>
          )}

          {/* Social Single Sign-On Options */}
          <div className="mt-8 border-t border-brown/15 pt-6">
            <p className="text-center text-[10px] uppercase tracking-widest text-brown/50 mb-3">
              {locale === "nl" ? "Of meld u aan via" : "Or connect via"}
            </p>

            {oauthError && (
              <div className="mb-4 bg-burgundy/10 border border-burgundy/30 text-burgundy p-3 text-xs leading-relaxed text-left flex items-start gap-2">
                <span className="font-bold text-sm shrink-0">!</span>
                <span className="text-[11px]">{oauthError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2.5 border border-brown/20 bg-white/80 py-2.5 px-3 text-xs font-medium tracking-wider text-brown hover:bg-white transition-all shadow-sm disabled:opacity-60"
              >
                {oauthLoading === "google" ? (
                  <span className="h-4 w-4 border-2 border-brown/30 border-t-brown rounded-full animate-spin inline-block" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={oauthLoading !== null}
                className="flex items-center justify-center gap-2.5 border border-brown/20 bg-brown text-cream py-2.5 px-3 text-xs font-medium tracking-wider hover:bg-black transition-all shadow-sm disabled:opacity-60"
              >
                {oauthLoading === "apple" ? (
                  <span className="h-4 w-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin inline-block" />
                ) : (
                  <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.3-9.61-11.49-20.73-15.56-33.36-4.08-12.63-6.12-24.71-6.12-36.23 0-14.37 3.58-26.4 10.74-36.09 7.16-9.69 16.29-14.65 27.38-14.88 4.7 0 10.02 1.25 15.98 3.76 5.96 2.5 9.77 3.82 11.43 3.94 1.86-.23 5.78-1.57 11.75-4.04 5.97-2.47 11.19-3.59 15.66-3.35 11.66.72 21.06 5.09 28.2 13.12-10.23 6.18-15.24 14.86-15.02 26.04.22 8.78 3.52 16.14 9.9 22.09 6.38 5.95 14.07 9.4 23.07 10.36-2.17 6.4-4.83 13.04-7.98 19.92zM119.22 31.84c0-7.39 2.67-14.38 8.01-20.97 5.34-6.59 11.94-10.6 19.8-12.03.22 1.44.33 2.76.33 3.96 0 7.39-2.73 14.43-8.19 21.12-5.46 6.69-12.18 10.64-20.16 11.86-.11-1.32-.17-2.64-.17-3.94z" />
                  </svg>
                )}
                <span>Apple ID</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. AUTHENTICATED STATE: Client Dashboard
  // ==========================================
  const wishlistProducts = allProducts.filter((p) => wishlist.includes(p.slug));

  return (
    <div className="wrap py-12 md:py-20">
      {/* Header Profile Banner */}
      <div className="border border-brown/15 bg-sand/20 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brown text-lg font-serif text-cream shadow-md shrink-0">
            {(user.name || "C").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl md:text-3xl text-brown tracking-wider">{user.name}</h1>
              <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-brown font-semibold">
                {user.role === "admin" ? t.account.adminMemberTag : t.account.vipMemberTag}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-brown/70">{user.email}</p>
            {user.phone && <p className="text-[11px] text-brown/60">{user.phone}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={() => signOut()}
            className="border border-brown/30 px-4 py-2 text-xs uppercase tracking-widest text-brown hover:bg-brown hover:text-cream transition-colors"
          >
            {t.account.signOutBtn}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-8 flex border-b border-brown/15 overflow-x-auto text-xs uppercase tracking-widest">
        <button
          onClick={() => setActiveTab("orders")}
          className={`py-3 px-5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "orders"
              ? "border-brown text-brown font-semibold bg-sand/20"
              : "border-transparent text-brown/60 hover:text-brown hover:bg-sand/10"
          }`}
        >
          {t.account.ordersTab} ({user.orders?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("wishlist")}
          className={`py-3 px-5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "wishlist"
              ? "border-brown text-brown font-semibold bg-sand/20"
              : "border-transparent text-brown/60 hover:text-brown hover:bg-sand/10"
          }`}
        >
          {t.account.wishlistTab} ({wishlist.length})
        </button>
        <button
          onClick={() => setActiveTab("address")}
          className={`py-3 px-5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "address"
              ? "border-brown text-brown font-semibold bg-sand/20"
              : "border-transparent text-brown/60 hover:text-brown hover:bg-sand/10"
          }`}
        >
          {t.account.addressTab}
        </button>
        <button
          onClick={() => setActiveTab("concierge")}
          className={`py-3 px-5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "concierge"
              ? "border-brown text-brown font-semibold bg-sand/20"
              : "border-transparent text-brown/60 hover:text-brown hover:bg-sand/10"
          }`}
        >
          {t.account.conciergeTab}
        </button>
      </div>

      {/* ============================= */}
      {/* TAB 1: Real Orders            */}
      {/* ============================= */}
      {activeTab === "orders" && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-brown">Your Orders</h2>
            <button
              onClick={() => refreshOrders()}
              className="text-[11px] uppercase tracking-wider text-brown/60 hover:text-brown inline-flex items-center gap-1.5"
            >
              <Icon name="refresh" className="h-3 w-3" />
              <span>Refresh Orders</span>
            </button>
          </div>

          {!user.orders || user.orders.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-brown/20 bg-sand/10 p-8">
              <p className="font-serif text-2xl text-brown">{t.account.noOrdersTitle}</p>
              <p className="mt-2 text-xs text-brown/60">{t.account.noOrdersSubtitle}</p>
              <Link href="/shop" className="btn btn-dark mt-6 inline-block">
                {t.account.exploreBtn}
              </Link>
            </div>
          ) : (
            user.orders.map((order) => (
              <div key={order.id} className="border border-brown/15 bg-cream p-5 md:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brown/10 pb-4 gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-brown/50">
                      {t.account.orderNumber}
                    </span>
                    <h3 className="font-mono text-sm font-semibold text-brown">{order.id}</h3>
                    <p className="text-xs text-brown/60">
                      {t.account.placedOn}{" "}
                      {new Date(order.date).toLocaleDateString(locale === "nl" ? "nl-NL" : "en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-start sm:items-end justify-between">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${
                        order.status === "Delivered"
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-gold/20 text-brown border border-gold/40"
                      }`}
                    >
                      {order.status === "Delivered" && locale === "nl"
                        ? "Bezorgd"
                        : order.status === "In Transit" && locale === "nl"
                        ? "Onderweg"
                        : order.status}
                    </span>
                    <span className="text-sm font-semibold text-brown mt-1">{eur(order.total)}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-4 divide-y divide-brown/10">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center gap-4">
                      <div className="relative h-16 w-12 bg-sand/30 overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/product/${item.slug}`}
                          className="text-xs font-medium uppercase tracking-wider text-brown hover:text-burgundy truncate block"
                        >
                          {item.name}
                        </Link>
                        <p className="text-[11px] text-brown/60">
                          {t.product.sizeLabel}: {item.size} &bull; {t.product.colorLabel}: {item.color} &bull;{" "}
                          {locale === "nl" ? "Aantal" : "Qty"}: {item.qty}
                        </p>
                      </div>
                      <span className="text-xs text-brown">{eur(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>

                {/* Tracking & Actions */}
                <div className="mt-4 border-t border-brown/10 pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-brown/70 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-brown/50">
                      {t.account.trackingLabel}
                    </span>
                    <span className="font-mono text-[11px] text-brown">{order.tracking}</span>
                  </div>
                  <button
                    onClick={() =>
                      alert(
                        locale === "nl"
                          ? `Officiële BTW-factuur voor bestelling ${order.id} is verzonden naar ${user.email}`
                          : `Official VAT Invoice for order ${order.id} sent to ${user.email}`
                      )
                    }
                    className="text-[11px] tracking-wider text-burgundy hover:underline"
                  >
                    {t.account.downloadInvoice}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ============================= */}
      {/* TAB 2: Wishlist               */}
      {/* ============================= */}
      {activeTab === "wishlist" && (
        <div className="mt-8">
          {wishlistProducts.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-brown/20 bg-sand/10 p-8">
              <p className="font-serif text-2xl text-brown">{t.account.emptyArchiveTitle}</p>
              <p className="mt-2 text-xs text-brown/60">{t.account.emptyArchiveSubtitle}</p>
              <Link href="/shop" className="btn btn-dark mt-6 inline-block">
                {t.account.discoverPiecesBtn}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
              {wishlistProducts.map((p) => (
                <ProductCard key={p.slug} p={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================= */}
      {/* TAB 3: Delivery Address       */}
      {/* ============================= */}
      {activeTab === "address" && (
        <div className="mt-8 max-w-xl">
          <div className="border border-brown/15 bg-cream p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-brown/10 pb-4">
              <div>
                <h2 className="font-serif text-xl tracking-wider text-brown">{t.account.primaryAddressTitle}</h2>
                <p className="text-xs text-brown/60 mt-0.5">Saved delivery details used for faster checkout</p>
              </div>
              {!editingAddress && (
                <button
                  onClick={() => setEditingAddress(true)}
                  className="text-xs uppercase tracking-wider text-burgundy hover:underline font-medium"
                >
                  {t.account.editDetails}
                </button>
              )}
            </div>

            {savedSuccess && (
              <p className="mt-3 bg-green-50 p-2.5 text-xs text-green-800 border border-green-200 flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-green-700" />
                <span>{t.account.addressUpdated}</span>
              </p>
            )}

            {!editingAddress ? (
              <div className="mt-4 space-y-1.5 text-xs text-brown/80 leading-relaxed">
                <p className="font-semibold text-brown text-sm">{user.address?.fullName || user.name}</p>
                <p>
                  {user.address?.street ||
                    (locale === "nl" ? "Geen straatadres geconfigureerd" : "No street address configured")}
                </p>
                <p>
                  {user.address?.postalCode} {user.address?.city}
                </p>
                <p>{user.address?.country}</p>
                <p className="pt-2 text-brown/60">
                  {t.account.contactPhoneLabel} {user.address?.phone || user.phone || (locale === "nl" ? "Niet ingesteld" : "Not set")}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveAddress} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {t.checkout.firstName} & {t.checkout.lastName}
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    className="w-full border border-brown/30 bg-white/90 px-3.5 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {t.checkout.street} & House Number
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    placeholder="e.g. Keizersgracht 482"
                    className="w-full border border-brown/30 bg-white/90 px-3.5 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                      {t.checkout.city}
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      placeholder="e.g. Amsterdam"
                      className="w-full border border-brown/30 bg-white/90 px-3.5 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                      {t.checkout.postalCode}
                    </label>
                    <input
                      type="text"
                      required
                      value={addressForm.postalCode}
                      onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                      placeholder="e.g. 1016 GD"
                      className="w-full border border-brown/30 bg-white/90 px-3.5 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {locale === "nl" ? "Land" : "Country"}
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.country}
                    onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                    className="w-full border border-brown/30 bg-white/90 px-3.5 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {t.checkout.phone}
                  </label>
                  <input
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full border border-brown/30 bg-white/90 px-3.5 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={addressSaving}
                    className="bg-brown px-5 py-2.5 text-xs uppercase tracking-wider text-cream hover:bg-black transition-colors font-medium disabled:opacity-60"
                  >
                    {addressSaving ? "Saving..." : t.account.saveChanges}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAddress(false)}
                    className="border border-brown/30 px-4 py-2.5 text-xs uppercase tracking-wider text-brown hover:bg-sand/30"
                  >
                    {t.account.cancelBtn}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================= */}
      {/* TAB 4: Concierge & Booking    */}
      {/* ============================= */}
      {activeTab === "concierge" && (
        <div className="mt-8 max-w-xl">
          <div className="border border-gold/40 bg-gold/10 p-6 md:p-8 shadow-sm">
            <span className="label tracking-[.3em] text-burgundy text-[10px] uppercase font-semibold">
              {t.account.conciergeTag}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown mt-1">{t.account.conciergeTitle}</h2>
            <p className="mt-3 text-xs leading-6 text-brown/80">{t.account.conciergeDesc}</p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/31612345678?text=${encodeURIComponent(
                  locale === "nl"
                    ? `Hallo YUPEK! Ik ben ${user.name} (${user.email}) en vraag assistentie aan.`
                    : `Hello YUPEK! I am ${user.name} (${user.email}) requesting assistance.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-5 py-3 text-xs uppercase tracking-wider font-medium hover:bg-[#20ba5a] transition-colors shadow-sm"
              >
                <span>{t.account.whatsAppConciergeBtn}</span>
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center border border-brown px-5 py-3 text-xs uppercase tracking-wider text-brown hover:bg-brown hover:text-cream transition-colors"
              >
                {t.account.bookAppointmentBtn}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
