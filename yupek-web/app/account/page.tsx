"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { useStore } from "@/components/Providers";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import Icon from "@/components/ui/Icon";
import { eur } from "@/lib/catalog";
import ProductCard from "@/components/ProductCard";

export default function AccountPage() {
  const { user, signOut, updateAddress, setAuthModalOpen, signInWithGoogle, signInWithApple, quickDemoLogin } = useAuth();
  const { wishlist } = useStore();
  const { allProducts } = useSiteConfig();
  const { t, locale } = useLanguage();

  const [activeTab, setActiveTab] = useState<"orders" | "wishlist" | "address" | "concierge">("orders");
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState(
    user?.address || {
      fullName: "",
      street: "",
      city: "",
      postalCode: "",
      country: "Netherlands",
      phone: "",
    }
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // If not logged in
  if (!user) {
    return (
      <div className="wrap py-24 md:py-32">
        <div className="mx-auto max-w-xl text-center border border-brown/15 bg-sand/15 p-8 md:p-14 shadow-sm">
          <span className="label tracking-[.3em] text-burgundy text-[10px]">{t.account.portalTag}</span>
          <h1 className="h-display mt-2 text-4xl md:text-5xl text-brown">{t.account.clientAccess}</h1>
          <p className="mx-auto mt-4 max-w-md text-xs leading-6 text-brown/75 font-light">
            {t.account.signInPrompt}
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={signInWithGoogle}
              className="flex w-full items-center justify-center gap-3 border border-brown/20 bg-cream py-3 px-4 text-xs font-medium tracking-wider text-brown transition-all hover:bg-white shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{t.account.continueGoogle}</span>
            </button>

            <button
              onClick={signInWithApple}
              className="flex w-full items-center justify-center gap-3 border border-brown/20 bg-brown text-cream py-3 px-4 text-xs font-medium tracking-wider transition-all hover:bg-black shadow-sm"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.3-9.61-11.49-20.73-15.56-33.36-4.08-12.63-6.12-24.71-6.12-36.23 0-14.37 3.58-26.4 10.74-36.09 7.16-9.69 16.29-14.65 27.38-14.88 4.7 0 10.02 1.25 15.98 3.76 5.96 2.5 9.77 3.82 11.43 3.94 1.86-.23 5.78-1.57 11.75-4.04 5.97-2.47 11.19-3.59 15.66-3.35 11.66.72 21.06 5.09 28.2 13.12-10.23 6.18-15.24 14.86-15.02 26.04.22 8.78 3.52 16.14 9.9 22.09 6.38 5.95 14.07 9.4 23.07 10.36-2.17 6.4-4.83 13.04-7.98 19.92zM119.22 31.84c0-7.39 2.67-14.38 8.01-20.97 5.34-6.59 11.94-10.6 19.8-12.03.22 1.44.33 2.76.33 3.96 0 7.39-2.73 14.43-8.19 21.12-5.46 6.69-12.18 10.64-20.16 11.86-.11-1.32-.17-2.64-.17-3.94z" />
              </svg>
              <span>{t.account.continueApple}</span>
            </button>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="block w-full border border-brown py-3 text-xs tracking-widest text-brown hover:bg-brown hover:text-cream transition-colors"
            >
              {t.account.signInEmail}
            </button>
          </div>

          <div className="mt-8 border-t border-brown/15 pt-6">
            <p className="text-[10px] uppercase tracking-widest text-brown/60 mb-2">{t.account.demoSession}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => quickDemoLogin("customer")}
                className="bg-gold/20 border border-gold px-4 py-2 text-[10px] tracking-wider text-brown hover:bg-gold/30 transition-colors"
              >
                {t.account.vipClientDemo}
              </button>
              <button
                onClick={() => quickDemoLogin("admin")}
                className="bg-burgundy/15 border border-burgundy/40 px-4 py-2 text-[10px] tracking-wider text-burgundy hover:bg-burgundy/25 transition-colors"
              >
                {t.account.adminDemo}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wishlistProducts = allProducts.filter((p) => wishlist.includes(p.slug));

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    updateAddress(addressForm);
    setEditingAddress(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="wrap py-12 md:py-20">
      {/* Header Profile Banner */}
      <div className="border border-brown/15 bg-sand/20 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brown text-lg font-serif text-cream shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl md:text-3xl text-brown tracking-wider">{user.name}</h1>
              <span className="rounded-full bg-gold/25 px-2.5 py-0.5 text-[9px] uppercase tracking-wider text-brown font-semibold">
                {user.role === "admin" ? t.account.adminMemberTag : t.account.vipMemberTag}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-brown/70">{user.email}</p>
            <p className="text-[10px] uppercase tracking-widest text-brown/50 mt-1">
              {t.account.signedVia} {user.provider.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 bg-burgundy px-4 py-2 text-xs uppercase tracking-widest text-cream hover:bg-burgundy/90 transition-colors shadow-sm"
            >
              <Icon name="settings" className="h-4 w-4" />
              <span>{t.account.adminPanelBtn}</span>
            </Link>
          )}

          <button
            onClick={() => signOut()}
            className="border border-brown/30 px-4 py-2 text-xs uppercase tracking-widest text-brown hover:bg-brown hover:text-cream transition-colors"
          >
            {t.account.signOutBtn}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex border-b border-brown/15 overflow-x-auto text-xs uppercase tracking-widest">
        <button
          onClick={() => setActiveTab("orders")}
          className={`py-3 px-5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "orders" ? "border-brown text-brown font-semibold" : "border-transparent text-brown/60 hover:text-brown"
          }`}
        >
          {t.account.ordersTab} ({user.orders?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("wishlist")}
          className={`py-3 px-5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "wishlist" ? "border-brown text-brown font-semibold" : "border-transparent text-brown/60 hover:text-brown"
          }`}
        >
          {t.account.wishlistTab} ({wishlist.length})
        </button>
        <button
          onClick={() => setActiveTab("address")}
          className={`py-3 px-5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "address" ? "border-brown text-brown font-semibold" : "border-transparent text-brown/60 hover:text-brown"
          }`}
        >
          {t.account.addressTab}
        </button>
        <button
          onClick={() => setActiveTab("concierge")}
          className={`py-3 px-5 border-b-2 font-medium transition-colors whitespace-nowrap ${
            activeTab === "concierge" ? "border-brown text-brown font-semibold" : "border-transparent text-brown/60 hover:text-brown"
          }`}
        >
          {t.account.conciergeTab}
        </button>
      </div>

      {/* Tab 1: Orders */}
      {activeTab === "orders" && (
        <div className="mt-8 space-y-6">
          {(!user.orders || user.orders.length === 0) ? (
            <div className="py-16 text-center border border-dashed border-brown/20 bg-sand/10 p-8">
              <p className="font-serif text-2xl text-brown">{t.account.noOrdersTitle}</p>
              <p className="mt-2 text-xs text-brown/60">{t.account.noOrdersSubtitle}</p>
              <Link href="/shop" className="btn btn-dark mt-6 inline-block">{t.account.exploreBtn}</Link>
            </div>
          ) : (
            user.orders.map((order) => (
              <div key={order.id} className="border border-brown/15 bg-cream p-5 md:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brown/10 pb-4 gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-brown/50">{t.account.orderNumber}</span>
                    <h3 className="font-mono text-sm font-semibold text-brown">{order.id}</h3>
                    <p className="text-xs text-brown/60">
                      {t.account.placedOn} {new Date(order.date).toLocaleDateString(locale === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-start sm:items-end justify-between">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${
                      order.status === "Delivered" ? "bg-green-100 text-green-800 border border-green-200" : "bg-gold/20 text-brown border border-gold/40"
                    }`}>
                      {order.status === "Delivered" && locale === "nl" ? "Bezorgd" : order.status === "In Transit" && locale === "nl" ? "Onderweg" : order.status}
                    </span>
                    <span className="text-sm font-semibold text-brown mt-1">{eur(order.total)}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-4 divide-y divide-brown/10">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center gap-4">
                      <div className="relative h-16 w-12 bg-sand/30 overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${item.slug}`} className="text-xs font-medium uppercase tracking-wider text-brown hover:text-burgundy truncate block">
                          {item.name}
                        </Link>
                        <p className="text-[11px] text-brown/60">
                          {t.product.sizeLabel}: {item.size} &bull; {t.product.colorLabel}: {item.color} &bull; {locale === "nl" ? "Aantal" : "Qty"}: {item.qty}
                        </p>
                      </div>
                      <span className="text-xs text-brown">{eur(item.price)}</span>
                    </div>
                  ))}
                </div>

                {/* Tracking & Actions */}
                <div className="mt-4 border-t border-brown/10 pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-brown/70 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-brown/50">{t.account.trackingLabel}</span>
                    <span className="font-mono text-[11px] text-brown">{order.tracking}</span>
                  </div>
                  <button
                    onClick={() => alert(locale === "nl" ? `Officiële BTW-factuur voor bestelling ${order.id} is verzonden naar ${user.email}` : `Official VAT Invoice for order ${order.id} sent to ${user.email}`)}
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

      {/* Tab 2: Wishlist */}
      {activeTab === "wishlist" && (
        <div className="mt-8">
          {wishlistProducts.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-brown/20 bg-sand/10 p-8">
              <p className="font-serif text-2xl text-brown">{t.account.emptyArchiveTitle}</p>
              <p className="mt-2 text-xs text-brown/60">{t.account.emptyArchiveSubtitle}</p>
              <Link href="/shop" className="btn btn-dark mt-6 inline-block">{t.account.discoverPiecesBtn}</Link>
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

      {/* Tab 3: Address & Shipping */}
      {activeTab === "address" && (
        <div className="mt-8 max-w-xl">
          <div className="border border-brown/15 bg-cream p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-brown/10 pb-4">
              <h2 className="font-serif text-xl tracking-wider text-brown">{t.account.primaryAddressTitle}</h2>
              {!editingAddress && (
                <button
                  onClick={() => setEditingAddress(true)}
                  className="text-xs uppercase tracking-wider text-burgundy hover:underline"
                >
                  {t.account.editDetails}
                </button>
              )}
            </div>

            {savedSuccess && (
              <p className="mt-3 bg-green-50 p-2 text-xs text-green-800 border border-green-200">
                {t.account.addressUpdated}
              </p>
            )}

            {!editingAddress ? (
              <div className="mt-4 space-y-1 text-xs text-brown/80 leading-relaxed">
                <p className="font-medium text-brown">{user.address?.fullName || user.name}</p>
                <p>{user.address?.street || (locale === "nl" ? "Geen straatadres geconfigureerd" : "No street address configured")}</p>
                <p>{user.address?.postalCode} {user.address?.city}</p>
                <p>{user.address?.country}</p>
                <p className="pt-2 text-brown/60">{t.account.contactPhoneLabel} {user.address?.phone || (locale === "nl" ? "Niet ingesteld" : "Not set")}</p>
              </div>
            ) : (
              <form onSubmit={handleSaveAddress} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">{t.checkout.firstName} & {t.checkout.lastName}</label>
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">{t.checkout.street}</label>
                  <input
                    type="text"
                    required
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">{t.checkout.city}</label>
                    <input
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">{t.checkout.postalCode}</label>
                    <input
                      type="text"
                      required
                      value={addressForm.postalCode}
                      onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                      className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">{locale === "nl" ? "Land" : "Country"}</label>
                  <input
                    type="text"
                    required
                    value={addressForm.country}
                    onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">{t.checkout.phone}</label>
                  <input
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full border border-brown/20 bg-white/70 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="bg-brown px-5 py-2 text-xs uppercase tracking-wider text-cream hover:bg-black transition-colors">
                    {t.account.saveChanges}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAddress(false)}
                    className="border border-brown/30 px-4 py-2 text-xs uppercase tracking-wider text-brown hover:bg-sand/30"
                  >
                    {t.account.cancelBtn}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Concierge */}
      {activeTab === "concierge" && (
        <div className="mt-8 max-w-xl">
          <div className="border border-gold/40 bg-gold/10 p-6 md:p-8 shadow-sm">
            <span className="label tracking-[.3em] text-burgundy text-[10px]">{t.account.conciergeTag}</span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown mt-1">{t.account.conciergeTitle}</h2>
            <p className="mt-3 text-xs leading-6 text-brown/80">
              {t.account.conciergeDesc}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/31612345678?text=${encodeURIComponent(
                  locale === "nl"
                    ? "Hallo YUPEK! Ik ben een geregistreerde cliënt en vraag atelierassistentie aan."
                    : "Hello YUPEK! I am a registered client requesting atelier assistance."
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
